use crate::CertManager;
use std::sync::Arc;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpStream;
use tauri::Emitter;
use crate::proxy::types::{ApiCall, ParsedRequest, ParsedResponse, ProxyConnection};

fn emit_logger_request(req: &ParsedRequest, app: &tauri::AppHandle) { let _ = app.emit("logger-request", req); }
fn emit_logger_response(resp: &ParsedResponse, app: &tauri::AppHandle) { let _ = app.emit("logger-response", resp); }

pub async fn handle_connect_mitm(mut stream: TcpStream, initial_data: &[u8], app_handle: tauri::AppHandle, target_id: String, cert_manager: Arc<CertManager>) {
    let request_str = String::from_utf8_lossy(initial_data);
    let parts: Vec<&str> = request_str.lines().next().unwrap_or("").split_whitespace().collect();
    if parts.len() < 2 { return; }

    let target_host = parts[1];
    let (host, port) = if target_host.contains(':') {
        let p: Vec<&str> = target_host.split(':').collect();
        (p[0].to_string(), p[1].parse().unwrap_or(443))
    } else { (target_host.to_string(), 443) };

    let timestamp = crate::utils::now_ms();
    let conn_id = format!("conn_{}_{}", timestamp, crate::utils::rand_id());
    let _ = app_handle.emit("proxy-connection", &ProxyConnection { id: conn_id.clone(), timestamp, host: host.clone(), port, target_id: target_id.clone() });

    let _ = stream.write_all(b"HTTP/1.1 200 Connection Established\r\n\r\n").await;
    let _ = stream.flush().await;

    let (domain_cert_pem, domain_key_pem) = match cert_manager.generate_domain_cert(&host) {
        Ok(c) => c, Err(e) => { log::error!("Cert generation failed for {}: {}", host, e); return; }
    };
    let _ = cert_manager.get_or_create_ca_cert();

    let pem_parsed = match pem::parse(domain_cert_pem.as_bytes()) { Ok(p) => p, Err(e) => { log::error!("Cert parse error: {:?}", e); return; } };
    let key_pair = match rcgen::KeyPair::from_pem(&domain_key_pem) { Ok(k) => k, Err(e) => { log::error!("Key parse error: {:?}", e); return; } };

    let mut server_config = rustls::ServerConfig::builder().with_no_client_auth()
        .with_single_cert(vec![rustls::pki_types::CertificateDer::from(pem_parsed.contents().to_vec())],
            rustls::pki_types::PrivateKeyDer::from(rustls::pki_types::PrivatePkcs8KeyDer::from(key_pair.serialize_der())))
        .map_err(|e| log::error!("Cert config error: {:?}", e)).ok().unwrap();
    server_config.alpn_protocols.push(b"h2".to_vec());
    server_config.alpn_protocols.push(b"http/1.1".to_vec());

    let tls_acceptor = tokio_rustls::TlsAcceptor::from(Arc::new(server_config));

    let mut tls_stream = match tls_acceptor.accept(stream).await {
        Ok(s) => s, Err(e) => { log::error!("TLS accept error: {:?}", e); return; }
    };

    let mut http_buf = Vec::new();
    loop {
        let mut read_buf = [0u8; 8192];
        match tls_stream.read(&mut read_buf).await {
            Ok(0) => break,
            Ok(n) => { http_buf.extend_from_slice(&read_buf[..n]); }
            Err(e) => { log::error!("TLS read error: {:?}", e); break; }
        }

        if let Some(header_end) = crate::utils::find_header_end(&http_buf) {
            let headers_str = String::from_utf8_lossy(&http_buf[..header_end]);
            let req_lines: Vec<&str> = headers_str.lines().collect();
            if !req_lines.is_empty() {
                let first: Vec<&str> = req_lines[0].split_whitespace().collect();
                if first.len() >= 2 {
                    let method = first[0].to_string();
                    let path = first[1].to_string();
                    handle_mitm_request(host.clone(), port, http_buf, method, path, app_handle, target_id, conn_id.clone(), timestamp, tls_stream, cert_manager).await;
                    return;
                }
            }
            break;
        }

        if http_buf.len() > 65536 { http_buf.truncate(65536); break; }
    }

    let _ = app_handle.emit("proxy-connection-close", serde_json::json!({
        "id": conn_id, "timestamp": timestamp, "host": host, "port": port, "targetId": target_id, "clientBytes": 0, "serverBytes": 0, "duration": 0
    }));
}

async fn handle_mitm_request(
    host: String, port: u16, request_data: Vec<u8>, method: String, path: String,
    app_handle: tauri::AppHandle, target_id: String, conn_id: String, timestamp: u64,
    mut tls_stream: tokio_rustls::server::TlsStream<TcpStream>, _cert_manager: Arc<CertManager>,
) {
    let header_end = match crate::utils::find_header_end(&request_data) { Some(p) => p, None => return };
    let headers_str = String::from_utf8_lossy(&request_data[..header_end]);
    let lines: Vec<&str> = headers_str.lines().collect();
    let headers = crate::utils::parse_headers(&lines);

    let url = format!("https://{}{}", host, path);
    let body = if header_end < request_data.len() { Some(&request_data[header_end..]) } else { None };

    let (sec_ch, acc) = (headers.get("sec-fetch-mode").map(|s| s.as_str()), headers.get("accept").map(|s| s.as_str()));
    let req_body = body.and_then(|b| String::from_utf8(b.to_vec()).ok());

    let mut api_call = ApiCall::new(method.clone(), url.clone(), headers.clone(), req_body.clone(), target_id.clone(), sec_ch, acc);
    api_call.cookies = crate::utils::parse_cookie_str(headers.get("cookie").map(|s| s.as_str()).unwrap_or(""));

    emit_logger_request(&parse_request_for_logger(&method, &url, "HTTP/1.1", &headers, body, "0.0.0.0", &String::from_utf8_lossy(&request_data)), &app_handle);

    let mut dest_stream = match TcpStream::connect(format!("{}:80", host)).await {
        Ok(s) => s, Err(e) => { log::error!("[MITM] Connect error: {}", e); return; }
    };
    if let Err(e) = dest_stream.write_all(&request_data).await { log::error!("[MITM] Forward error: {}", e); return; }

    let response_buf = match crate::utils::read_response(&mut dest_stream).await { Ok(b) => b, Err(e) => { log::error!("[MITM] Read error: {}", e); return; } };
    let (status, status_text, resp_headers, resp_body, resp_ct) = crate::utils::parse_response(&response_buf);

    let mut resp_buf = response_buf.clone();
    if let Some(loc) = resp_headers.get("location") {
        if loc.starts_with("https://") {
            let new_loc = format!("http://{}:8888{}{}", host, loc.strip_prefix("https://").unwrap_or(loc));
            resp_buf = String::from_utf8_lossy(&resp_buf).to_string().replace(loc, &new_loc).into_bytes();
        }
    }

    let _ = tls_stream.write_all(&resp_buf).await;
    let _ = tls_stream.flush().await;

    api_call = api_call.with_response(status, status_text, resp_headers.clone(), resp_body.clone(), resp_ct.clone());
    emit_logger_response(&ParsedResponse { status, status_text, headers: resp_headers.iter().map(|(k, v)| (k.clone(), v.clone())).collect(), body: resp_body.clone(), body_size: resp_body.as_ref().map(|b| b.len()).unwrap_or(0), content_type: resp_ct.clone() }, &app_handle);
    let _ = app_handle.emit("api-call", &api_call);
    api_call.log_raw_data();

    let _ = app_handle.emit("proxy-connection-close", serde_json::json!({
        "id": conn_id, "timestamp": timestamp, "host": host, "port": port, "targetId": target_id, "clientBytes": request_data.len(), "serverBytes": response_buf.len(), "duration": 0
    }));
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