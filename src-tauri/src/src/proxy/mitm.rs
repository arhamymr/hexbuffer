use crate::CertManager;
use std::net::SocketAddr;
use std::sync::Arc;
use bytes::Bytes;
use http::uri::Authority;
use hyper::service::service_fn;
use hyper::{Method, Request, Response, Uri};
use hyper_util::rt::TokioIo;
use tokio::io::{AsyncRead, AsyncReadExt, AsyncWrite, AsyncWriteExt};
use tokio::net::TcpStream;
use tokio_rustls::TlsAcceptor;
use tauri::Emitter;
use tokio_util::sync::CancellationToken;

use crate::proxy::types::{ApiCall, ProxyConnection};
use crate::proxy::utils::{find_header_end, parse_headers, parse_response};
use crate::utils::now_ms;

pub async fn handle_connect_mitm(
    stream: TcpStream,
    initial_data: &[u8],
    app_handle: tauri::AppHandle,
    target_id: String,
    cert_manager: Arc<CertManager>,
    cancel_token: CancellationToken,
) {
    if cancel_token.is_cancelled() {
        return;
    }

    let remote_addr = match stream.peer_addr() {
        Ok(addr) => addr,
        Err(_) => return,
    };

    let request_str = String::from_utf8_lossy(initial_data);
    let parts: Vec<&str> = request_str.lines().next().unwrap_or("").split_whitespace().collect();
    if parts.len() < 2 {
        return;
    }

    let target_host = parts[1];
    let (host, port) = if target_host.contains(':') {
        let p: Vec<&str> = target_host.split(':').collect();
        (p[0].to_string(), p[1].parse().unwrap_or(443))
    } else {
        (target_host.to_string(), 443)
    };

    let timestamp = now_ms();
    let conn_id = format!("conn_{}_{}", timestamp, rand_id());
    let _ = app_handle.emit(
        "proxy-connection",
        &ProxyConnection {
            id: conn_id.clone(),
            timestamp,
            host: host.clone(),
            port,
            target_id: target_id.clone(),
        },
    );

    if let Err(e) = stream
        .write_all(b"HTTP/1.1 200 Connection Established\r\n\r\n")
        .await
    {
        log::error!("Failed to send 200 response: {}", e);
        return;
    }

    let (domain_cert_pem, domain_key_pem) = match cert_manager.generate_domain_cert(&host) {
        Ok(c) => c,
        Err(e) => {
            log::error!("Cert generation failed for {}: {}", host, e);
            return;
        }
    };
    let _ = cert_manager.get_or_create_ca_cert();

    let pem_parsed = match pem::parse(domain_cert_pem.as_bytes()) {
        Ok(p) => p,
        Err(e) => {
            log::error!("Cert parse error: {:?}", e);
            return;
        }
    };
    let key_pair = match rcgen::KeyPair::from_pem(&domain_key_pem) {
        Ok(k) => k,
        Err(e) => {
            log::error!("Key parse error: {:?}", e);
            return;
        }
    };

    let mut server_config = rustls::ServerConfig::builder()
        .with_no_client_auth()
        .with_single_cert(
            vec![rustls::pki_types::CertificateDer::from(
                pem_parsed.contents().to_vec(),
            )],
            rustls::pki_types::PrivateKeyDer::from(rustls::pki_types::PrivatePkcs8KeyDer::from(
                key_pair.serialize_der(),
            )),
        )
        .map_err(|e| log::error!("Cert config error: {:?}", e))
        .ok()
        .unwrap();
    server_config.alpn_protocols.push(b"h2".to_vec());
    server_config.alpn_protocols.push(b"http/1.1".to_vec());

    let tls_acceptor = tokio_rustls::TlsAcceptor::from(Arc::new(server_config));

    let tls_stream = match tls_acceptor.accept(stream).await {
        Ok(s) => s,
        Err(e) => {
            log::error!("TLS accept error: {:?}", e);
            return;
        }
    };

    let io = TokioIo::new(tls_stream);
    let app = app_handle.clone();
    let target = target_id.clone();
    let conn_id_clone = conn_id.clone();
    let host_clone = host.clone();
    let port_clone = port;
    let ts_clone = timestamp;

    let service = service_fn(move |req: Request<hyper::body::Incoming>| {
        let handler = app.clone();
        let target = target.clone();
        let conn_id = conn_id_clone.clone();
        let host = host_clone.clone();
        let port = port_clone;
        let timestamp = ts_clone;

        async move {
            handle_connect_request(req, handler, target, conn_id, host, port, timestamp).await
        }
    });

    if let Err(e) = hyper::server::conn::http1::Builder::new()
        .preserve_header_case(true)
        .title_case_headers(true)
        .serve_connection(io, service)
        .await
    {
        if !is_benign_shutdown_error(&e) {
            tracing::debug!("Connection error: {}", e);
        }
    }

    let _ = app_handle.emit(
        "proxy-connection-close",
        serde_json::json!({
            "id": conn_id,
            "timestamp": timestamp,
            "host": host,
            "port": port,
            "targetId": target_id,
            "duration": now_ms() - timestamp
        }),
    );
}

async fn handle_connect_request(
    req: Request<hyper::body::Incoming>,
    app_handle: tauri::AppHandle,
    target_id: String,
    conn_id: String,
    host: String,
    port: u16,
    timestamp: u64,
) -> Option<String> {
    if req.uri().host().is_none() && !req.uri().path().is_empty() {
        return None;
    }

    if req.method() == Method::CONNECT {
        return None;
    }

    let method = req.method().to_string();
    let path = req.uri().to_string();
    let url = format!("https://{}{}", host, path);

    let headers: std::collections::HashMap<String, String> = req
        .headers()
        .iter()
        .map(|(k, v)| (k.to_string(), v.to_str().unwrap_or("").to_string()))
        .collect();

    let mut api_call = ApiCall::new(
        method.clone(),
        url.clone(),
        headers.clone(),
        None,
        target_id.clone(),
        None,
        None,
    );

    let dest_stream = match TcpStream::connect(format!("{}:{}", host, port)).await {
        Ok(s) => s,
        Err(e) => {
            log::error!("[MITM] Connect error: {}", e);
            return Some(conn_id);
        }
    };

    let io = TokioIo::new(dest_stream);
    let mut client = hyper_util::client::legacy::Client::builder(TokioExecutor::new())
        .build_http();

    match client.request(req).await {
        Ok(res) => {
            let status = res.status().as_u16();
            let status_text = res.status().canonical_reason().unwrap_or("").to_string();
            let resp_headers: std::collections::HashMap<String, String> = res
                .headers()
                .iter()
                .map(|(k, v)| (k.to_string(), v.to_str().unwrap_or("").to_string()))
                .collect();
            let body = hyper::body::to_bytes(res.into_body()).await.ok();
            let resp_body = body.map(|b| String::from_utf8_lossy(&b).to_string());

            api_call = api_call.with_response(
                status,
                status_text,
                resp_headers,
                resp_body,
                None,
            );
            let _ = app_handle.emit("http-log", &api_call);
            api_call.log_raw_data();
        }
        Err(e) => {
            log::error!("Client request error: {}", e);
        }
    }

    Some(conn_id)
}

pub fn is_benign_shutdown_error(e: &dyn std::error::Error) -> bool {
    let msg = e.to_string();
    msg.contains("shutting down") || msg.contains("connection was not closed cleanly")
}

fn rand_id() -> String {
    format!("{:x}", now_ms() % 0xffffff)
}