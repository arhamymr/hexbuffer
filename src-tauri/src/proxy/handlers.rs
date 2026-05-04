use crate::proxy::{CapturingHandler, InterceptConfig};
use crate::CertManager;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpStream;
use tokio::time::{timeout, Duration};
use tokio::sync::mpsc;
use tauri::Emitter;
use tokio_util::sync::CancellationToken;

use crate::proxy::utils::{
    find_header_end, parse_headers, parse_response, parse_url, read_request, read_response,
};

pub async fn handle_connection(
    mut stream: TcpStream,
    app_handle: tauri::AppHandle,
    target_id: String,
    cert_manager: Arc<CertManager>,
    cancel_token: CancellationToken,
    event_tx: mpsc::Sender<crate::proxy::events::ProxyEvent>,
    intercept: Arc<InterceptConfig>,
) {
    if cancel_token.is_cancelled() {
        return;
    }

    let mut buf = [0u8; 8192];
    if let Ok(n) = stream.read(&mut buf).await {
        if n == 0 {
            return;
        }

        let request_str = String::from_utf8_lossy(&buf[..n]);
        let first_line = request_str.lines().next().unwrap_or("");
        let method = first_line.split_whitespace().next().unwrap_or("");
        let path = first_line.split_whitespace().nth(1).unwrap_or("");

        if method == "GET" && path == "/ca-cert" {
            match cert_manager.get_ca_cert_pem() {
                Ok(cert_pem) => {
                    let resp = format!(
                        "HTTP/1.1 200 OK\r\nContent-Type: application/x-x509-ca-cert\r\nContent-Length: {}\r\n\r\n{}",
                        cert_pem.len(),
                        cert_pem
                    );
                    let _ = stream.write_all(resp.as_bytes()).await;
                }
                Err(e) => {
                    log::error!("Failed to get CA cert: {}", e);
                }
            }
            return;
        }

        if request_str.starts_with("CONNECT ") {
            crate::proxy::mitm::handle_connect_mitm(
                stream,
                &buf[..n],
                app_handle,
                target_id,
                cert_manager,
                cancel_token,
                event_tx,
                intercept,
            )
            .await;
        } else {
            handle_http_request(
                stream,
                &buf[..n],
                app_handle,
                target_id,
                cancel_token,
                event_tx,
                intercept,
            )
            .await;
        }
    }
}

pub async fn handle_http_request(
    mut stream: TcpStream,
    initial_data: &[u8],
    app_handle: tauri::AppHandle,
    _target_id: String,
    cancel_token: CancellationToken,
    event_tx: mpsc::Sender<crate::proxy::events::ProxyEvent>,
    intercept: Arc<InterceptConfig>,
) {
    if cancel_token.is_cancelled() {
        return;
    }

    let full_data = match read_request(&mut stream, initial_data).await {
        Ok(d) => d,
        Err(e) => {
            log::error!("[HTTP] Read error: {}", e);
            return;
        }
    };

    let header_end = match find_header_end(&full_data) {
        Some(p) => p,
        None => return,
    };

    let headers_str = match String::from_utf8(full_data[..header_end].to_vec()) {
        Ok(s) => s,
        Err(_) => return,
    };

    let lines: Vec<&str> = headers_str.lines().collect();
    if lines.is_empty() {
        return;
    }

    let first: Vec<&str> = lines[0].split_whitespace().collect();
    if first.len() < 2 {
        return;
    }

    let (method, path, http_ver) = (
        first[0].to_string(),
        first[1].to_string(),
        first.get(2).unwrap_or(&"HTTP/1.1").to_string(),
    );

    let headers = parse_headers(&lines);
    let host = headers.get("host").cloned().unwrap_or_else(|| "unknown".to_string());
    let body = if header_end < full_data.len() {
        Some(full_data[header_end..].to_vec())
    } else {
        None
    };

    let url = if path.starts_with("http://") || path.starts_with("https://") {
        path.clone()
    } else {
        format!("http://{}{}", host, path)
    };

    let mut handler = CapturingHandler::new(event_tx).with_intercept(intercept);

    let captured = match handler
        .handle_request(
            method.clone(),
            url.clone(),
            http_ver.clone(),
            headers.clone(),
            body.clone(),
        )
        .await
    {
        Some(c) => c,
        None => return,
    };

    let proxied_req = captured.into_proxied_request();

    let connect_result = timeout(
        Duration::from_secs(10),
        TcpStream::connect(format!("{}:80", host))
    ).await;

    let mut dest_stream = match connect_result {
        Ok(Ok(s)) => s,
        Ok(Err(e)) => {
            log::error!("[HTTP] Connect error: {}", e);
            handler.send_error(0, format!("Connect failed: {}", e), "connecting".to_string(), Some(proxied_req.url.clone()));
            let _ = stream.write_all(b"HTTP/1.1 502 Bad Gateway\r\n\r\n").await;
            return;
        }
        Err(_) => {
            log::error!("[HTTP] Connect timeout to host={}", host);
            handler.send_error(0, format!("Connect timeout to {}", host), "connecting".to_string(), Some(proxied_req.url.clone()));
            let _ = stream.write_all(b"HTTP/1.1 504 Gateway Timeout\r\n\r\n").await;
            return;
        }
    };

    let (_, actual_path) = parse_url(&proxied_req.url);
    let actual_path = if actual_path.is_empty() { "/" } else { &actual_path };
    tracing::info!("[HTTP] Forwarding: method={}, path={}, host={}", method, actual_path, host);

    let request_line = format!("{} {} {}\r\n", method, actual_path, http_ver);

    let stripped_headers: HashMap<String, String> = headers
        .iter()
        .filter(|(k, _)| !["proxy-connection", "proxy-authorization", "te", "trailers", "transfer-encoding"].contains(&k.as_str()))
        .map(|(k, v)| (k.clone(), v.clone()))
        .collect();

    let mut header_bytes = Vec::new();
    for (k, v) in &stripped_headers {
        header_bytes.extend_from_slice(format!("{}: {}\r\n", k, v).as_bytes());
    }
    header_bytes.extend_from_slice(b"\r\n");

    let mut request_bytes = request_line.into_bytes();
    request_bytes.extend_from_slice(&header_bytes);
    if let Some(ref b) = body {
        request_bytes.extend_from_slice(b);
    }

    tracing::info!("[HTTP] Forwarding {} bytes to upstream ({} headers stripped)", request_bytes.len(), headers.len() - stripped_headers.len());

    if let Err(e) = dest_stream.write_all(&request_bytes).await {
        log::error!("[HTTP] Forward error: {}", e);
        handler.send_error(0, format!("Forward failed: {}", e), "forwarding".to_string(), Some(proxied_req.url.clone()));
        return;
    }

    let read_result = timeout(
        Duration::from_secs(30),
        read_response(&mut dest_stream)
    ).await;

    let response_buf = match read_result {
        Ok(Ok(b)) => b,
        Ok(Err(e)) => {
            log::error!("[HTTP] Read error: {}", e);
            handler.send_error(0, format!("Read response failed: {}", e), "reading_response".to_string(), Some(proxied_req.url.clone()));
            return;
        }
        Err(_) => {
            log::error!("[HTTP] Read timeout from host={}", host);
            handler.send_error(0, format!("Read timeout from {}", host), "reading_response".to_string(), Some(proxied_req.url.clone()));
            let _ = stream.write_all(b"HTTP/1.1 504 Gateway Timeout\r\n\r\n").await;
            return;
        }
    };

    let (status, status_text, resp_headers, _resp_body, _resp_ct) = parse_response(&response_buf);

    let _ = stream.write_all(&response_buf).await;

    let response_body_vec = handler
        .handle_response(
            status,
            status_text,
            "HTTP/1.1".to_string(),
            resp_headers.clone(),
            Some(response_buf[find_header_end(&response_buf).unwrap_or(0)..].to_vec()),
        )
        .await;

    let _ = app_handle.emit(
        "proxy-log",
        &serde_json::json!({
            "type": "http-log",
            "id": handler.take_pending_id().unwrap_or(0),
            "method": method,
            "url": url,
            "host": host,
            "status": status,
            "request_body_size": body.as_ref().map(|b| b.len()).unwrap_or(0),
            "response_body_size": response_body_vec.as_ref().map(|b| b.len()).unwrap_or(0),
        }),
    );
}