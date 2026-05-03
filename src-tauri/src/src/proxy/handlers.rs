use crate::proxy::types::{ApiCall, ParsedRequest, ParsedResponse, ProxyConnection, ProxyServer};
use crate::CertManager;
use std::sync::Arc;
use tokio::io::{AsyncWriteExt, AsyncReadExt};
use tokio::net::TcpStream;
use tauri::Emitter;
use tokio_util::sync::CancellationToken;

pub async fn handle_connection(mut stream: TcpStream, app_handle: tauri::AppHandle, target_id: String, cert_manager: Arc<CertManager>, cancel_token: CancellationToken) {
    if cancel_token.is_cancelled() { return; }
    let mut buf = [0u8; 8192];
    if let Ok(n) = stream.read(&mut buf).await {
        if n == 0 { return; }
        let request_str = String::from_utf8_lossy(&buf[..n]);
        let first_line = request_str.lines().next().unwrap_or("");
        let method = first_line.split_whitespace().next().unwrap_or("");
        let path = first_line.split_whitespace().nth(1).unwrap_or("");

        if method == "GET" && path == "/ca-cert" {
            match cert_manager.get_ca_cert_pem() {
                Ok(cert_pem) => {
                    let resp = format!("HTTP/1.1 200 OK\r\nContent-Type: application/x-x509-ca-cert\r\nContent-Length: {}\r\n\r\n{}", cert_pem.len(), cert_pem);
                    let _ = stream.write_all(resp.as_bytes()).await;
                }
                Err(e) => { log::error!("Failed to get CA cert: {}", e); }
            }
            return;
        }

        if request_str.starts_with("CONNECT ") {
            crate::proxy::mitm::handle_connect_mitm(stream, &buf[..n], app_handle, target_id, cert_manager, cancel_token).await;
        } else {
            handle_http_request(stream, &buf[..n], app_handle, target_id, cancel_token).await;
        }
    }
}

pub async fn handle_http_request(mut stream: TcpStream, initial_data: &[u8], app_handle: tauri::AppHandle, target_id: String, cancel_token: CancellationToken) {
    if cancel_token.is_cancelled() { return; }
    let full_data = match crate::utils::read_request(&mut stream, initial_data).await {
        Ok(d) => d, Err(e) => { log::error!("[HTTP] Read error: {}", e); return; }
    };

    let header_end = match crate::utils::find_header_end(&full_data) { Some(p) => p, None => return };
    let headers_str = match String::from_utf8(full_data[..header_end].to_vec()) { Ok(s) => s, Err(_) => return };
    let lines: Vec<&str> = headers_str.lines().collect();
    if lines.is_empty() { return; }

    let first: Vec<&str> = lines[0].split_whitespace().collect();
    if first.len() < 2 { return; }

    let (method, path, http_ver) = (first[0].to_string(), first[1].to_string(), first.get(2).unwrap_or(&"HTTP/1.1").to_string());
    let headers = crate::utils::parse_headers(&lines);
    let host = headers.get("host").cloned().unwrap_or_else(|| "unknown".to_string());
    let body = if header_end < full_data.len() { Some(&full_data[header_end..]) } else { None };
    let url = format!("http://{}{}", host, path);

    let (sec_ch, acc) = (headers.get("sec-fetch-mode").map(|s| s.as_str()), headers.get("accept").map(|s| s.as_str()));
    let req_body = body.and_then(|b| String::from_utf8(b.to_vec()).ok());
    let mut api_call = ApiCall::new(method.clone(), url.clone(), headers.clone(), req_body.clone(), target_id.clone(), sec_ch, acc);
    api_call.cookies = crate::utils::parse_cookie_str(headers.get("cookie").map(|s| s.as_str()).unwrap_or(""));

    let mut dest_stream = match TcpStream::connect(format!("{}:80", host)).await {
        Ok(s) => s, Err(e) => { log::error!("[HTTP] Connect error: {}", e); let _ = stream.write_all(b"HTTP/1.1 502 Bad Gateway\r\n\r\n").await; return; }
    };
    if let Err(e) = dest_stream.write_all(&full_data).await { log::error!("[HTTP] Forward error: {}", e); return; }

    let response_buf = match crate::utils::read_response(&mut dest_stream).await { Ok(b) => b, Err(e) => { log::error!("[HTTP] Read error: {}", e); return; } };
    let (status, status_text, resp_headers, resp_body, resp_ct) = crate::utils::parse_response(&response_buf);

    let _ = stream.write_all(&response_buf).await;

    api_call = api_call.with_response(status, status_text, resp_headers.clone(), resp_body.clone(), resp_ct.clone());
    let _ = app_handle.emit("http-log", &api_call);
    api_call.log_raw_data();
}

fn parse_request_for_logger(method: &str, uri: &str, version: &str, headers: &std::collections::HashMap<String, String>, body: Option<&[u8]>, peer: &str, raw: &str) -> ParsedRequest {
    let timestamp = chrono::Local::now().format("%H:%M:%S%.3f").to_string();
    let all_headers: Vec<(String, String)> = headers.iter().map(|(k, v)| (k.clone(), v.clone())).collect();
    let cookies: Vec<(String, String)> = headers.get("cookie").map(|v| v.split(';').filter_map(|pair| {
        let mut p = pair.trim().splitn(2, '='); let k = p.next()?.trim().to_string(); let val = p.next().unwrap_or("").trim().to_string();
        if k.is_empty() { None } else { Some((k, val)) }
    }).collect()).unwrap_or_default();
    let body_str = body.and_then(|b| if b.is_empty() { None } else { String::from_utf8(b.to_vec()).ok() });
    let curl = format!("curl{} {} '{}'", if method != "GET" { format!(" -X {}", method) } else { String::new() },
        all_headers.iter().filter(|(k, _)| k != "host" && k != "cookie").map(|(k, v)| format!(" -H '{}: {}'", k, v)).collect::<Vec<_>>().join(""), uri);

    ParsedRequest {
        id: format!("req_{}", std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_nanos()),
        timestamp, method: method.to_string(), url: uri.to_string(), http_version: version.to_string(),
        host: headers.get("host").cloned().unwrap_or_default(),
        path: uri.split('?').next().unwrap_or(uri).to_string(),
        query: uri.find('?').map(|_| uri.split('?').nth(1).unwrap_or("").to_string()),
        headers: all_headers, cookies, body: body_str, content_type: headers.get("content-type").cloned(), peer: peer.to_string(), curl, raw: raw.to_string()
    }
}