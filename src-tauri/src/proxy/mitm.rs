use crate::CertManager;
use crate::proxy::client::create_https_client;
use crate::proxy::handler::CapturingHandler;
use crate::proxy::intercept::InterceptConfig;
use crate::proxy::events::ProxyEvent;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::io::AsyncWriteExt;
use tokio::net::TcpStream;
use tokio::sync::mpsc;
use tauri::Emitter;
use tokio_util::sync::CancellationToken;
use hyper::service::service_fn;
use hyper::{Method, Request, Response};
use hyper::body::Incoming;
use hyper_util::rt::TokioIo;
use hyper_util::rt::TokioExecutor;
use http_body_util::{BodyExt, Full};
use bytes::Bytes;

pub async fn handle_connect_mitm(
    mut stream: TcpStream,
    initial_data: &[u8],
    app_handle: tauri::AppHandle,
    target_id: String,
    cert_manager: Arc<CertManager>,
    cancel_token: CancellationToken,
    event_tx: mpsc::Sender<ProxyEvent>,
    intercept: Arc<InterceptConfig>,
) {
    if cancel_token.is_cancelled() {
        return;
    }

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

    let timestamp = crate::proxy::utils::now_ms();
    let conn_id = format!("conn_{}_{}", timestamp, rand_id());
    let _ = app_handle.emit(
        "proxy-connection",
        &serde_json::json!({
            "id": conn_id,
            "timestamp": timestamp,
            "host": host,
            "port": port,
            "targetId": target_id,
        }),
    );

    tracing::info!("[MITM] Sending 200 Connection Established to client");
    if let Err(e) = stream
        .write_all(b"HTTP/1.1 200 Connection Established\r\n\r\n")
        .await
    {
        tracing::error!("[MITM] Failed to send 200 response: {}", e);
        return;
    }
    if let Err(e) = stream.flush().await {
        tracing::error!("[MITM] Failed to flush 200 response: {}", e);
        return;
    }
    tracing::info!("[MITM] 200 response sent and flushed, about to generate certificate");

    let (domain_cert_pem, domain_key_pem) = match cert_manager.generate_domain_cert(&host) {
        Ok(c) => c,
        Err(e) => {
            log::error!("Cert generation failed for {}: {}", host, e);
            return;
        }
    };
    let _ = cert_manager.get_or_create_ca_cert();

    tracing::debug!("Generated cert for host={}, cert_len={}, key_len={}",
        host, domain_cert_pem.len(), domain_key_pem.len());

    let pem_parsed = match pem::parse(domain_cert_pem.as_bytes()) {
        Ok(p) => {
            tracing::debug!("[MITM] PEM parsed, tag={}", p.tag());
            p
        },
        Err(e) => {
            tracing::error!("[MITM] Cert parse error for {}: {:?}", host, e);
            return;
        }
    };
    let key_pair = match rcgen::KeyPair::from_pem(&domain_key_pem) {
        Ok(k) => {
            tracing::debug!("[MITM] Key pair parsed from PEM");
            k
        },
        Err(e) => {
            tracing::error!("[MITM] Key parse error for {}: {:?}", host, e);
            return;
        }
    };

    tracing::info!("[MITM] Verifying certificate and key compatibility...");
    let cert_der = pem_parsed.contents();
    let key_der = key_pair.serialize_der();
    tracing::info!("[MITM] Cert DER length: {}, Key DER length: {}", cert_der.len(), key_der.len());

    fn hex_encode(data: &[u8]) -> String {
        data.iter().take(64).map(|b| format!("{:02x}", b)).collect::<String>()
    }
    tracing::debug!("[MITM] Cert DER first 64 bytes (hex): {}", hex_encode(cert_der));
    tracing::debug!("[MITM] Key DER first 64 bytes (hex): {}", hex_encode(&key_der));

    let server_config = match rustls::ServerConfig::builder()
        .with_no_client_auth()
        .with_single_cert(
            vec![rustls::pki_types::CertificateDer::from(
                pem_parsed.contents().to_vec(),
            )],
            rustls::pki_types::PrivateKeyDer::from(rustls::pki_types::PrivatePkcs8KeyDer::from(
                key_pair.serialize_der(),
            )),
        ) {
        Ok(cfg) => cfg,
        Err(e) => {
            tracing::error!("[MITM] TLS server config error for {}: {:?}", host, e);
            return;
        }
    };
    let mut server_config = server_config;
    server_config.alpn_protocols.clear();
    server_config.alpn_protocols.push(b"h2".to_vec());
    server_config.alpn_protocols.push(b"http/1.1".to_vec());

    let tls_acceptor = tokio_rustls::TlsAcceptor::from(Arc::new(server_config));

    tracing::info!("[MITM] Starting TLS accept for host={}, port={}", host, port);
    tracing::info!("[MITM] Stream is TcpStream, calling tls_acceptor.accept()");

    let tls_acceptor_ref = &tls_acceptor;
    let tls_stream = match tls_acceptor_ref.accept(stream).await {
        Ok(s) => {
            tracing::debug!("TLS accept successful for {}", host);
            s
        }
        Err(e) => {
            let err_msg = format!("{:?}", e);
            let is_eof = err_msg.contains("UnexpectedEof") || err_msg.contains("eof");
            let is_timeout = err_msg.contains("timeout") || err_msg.contains("TimedOut");
            let is_closed = err_msg.contains("closed");

            if is_eof {
                tracing::warn!("TLS handshake EOF - client closed connection before handshake completed. host={}, error={}", host, err_msg);
            } else if is_timeout {
                tracing::warn!("TLS handshake timeout - client did not complete handshake. host={}, error={}", host, err_msg);
            } else if is_closed {
                tracing::warn!("TLS handshake failed - connection closed by peer. host={}, error={}", host, err_msg);
            } else {
                tracing::error!("TLS accept error for host={}: error={}", host, err_msg);
            }
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
    let event_tx_clone = event_tx.clone();
    let intercept_clone = intercept.clone();

    let service = service_fn(move |req: Request<Incoming>| {
        let handler = app.clone();
        let target = target.clone();
        let conn_id = conn_id_clone.clone();
        let host = host_clone.clone();
        let port = port_clone;
        let timestamp = ts_clone;
        let event_tx = event_tx_clone.clone();
        let intercept = intercept_clone.clone();

        async move {
            handle_mitm_request(
                req,
                handler,
                target,
                conn_id,
                host,
                port,
                timestamp,
                event_tx,
                intercept,
            )
            .await
        }
    });

    if let Err(e) = hyper::server::conn::http2::Builder::new(TokioExecutor::new())
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
            "duration": crate::proxy::utils::now_ms() - timestamp
        }),
    );
}

pub async fn handle_connect_upgraded(
    upgraded: hyper::upgrade::Upgraded,
    target_host: String,
    app_handle: tauri::AppHandle,
    target_id: String,
    cert_manager: Arc<CertManager>,
    cancel_token: CancellationToken,
    event_tx: mpsc::Sender<ProxyEvent>,
    intercept: Arc<InterceptConfig>,
) {
    tracing::info!("[MITM] ========== handle_connect_upgraded ENTRY ==========");
    tracing::info!("[MITM] target_host={}", target_host);

    if cancel_token.is_cancelled() {
        tracing::warn!("[MITM] cancel_token cancelled, returning early");
        return;
    }

    tracing::info!("[MITM] CONNECT upgraded for host={}", target_host);

    let (host, port) = if target_host.contains(':') {
        let p: Vec<&str> = target_host.split(':').collect();
        tracing::info!("[MITM] Host contains port: {}", target_host);
        (p[0].to_string(), p[1].parse().unwrap_or(443))
    } else {
        tracing::info!("[MITM] Host has no explicit port, using 443");
        (target_host.clone(), 443)
    };

    tracing::info!("[MITM] Parsed host={}, port={}", host, port);

    let timestamp = crate::proxy::utils::now_ms();
    let conn_id = format!("conn_{}_{}", timestamp, rand_id());
    let _ = app_handle.emit(
        "proxy-connection",
        &serde_json::json!({
            "id": conn_id,
            "timestamp": timestamp,
            "host": host,
            "port": port,
            "targetId": target_id,
        }),
    );

    tracing::info!("[MITM] Generating certificate for host={}", host);
    let (domain_cert_pem, domain_key_pem) = match cert_manager.generate_domain_cert(&host) {
        Ok(c) => {
            tracing::info!("[MITM] Certificate generated, len={}", c.0.len());
            c
        }
        Err(e) => {
            tracing::error!("[MITM] Cert generation FAILED for {}: {}", host, e);
            return;
        }
    };

    tracing::info!("[MITM] Getting CA certificate...");
    match cert_manager.get_or_create_ca_cert() {
        Ok(_) => tracing::info!("[MITM] CA cert ready"),
        Err(e) => tracing::warn!("[MITM] CA cert issue: {}", e),
    }

    tracing::info!("[MITM] Parsing PEM certificate...");
    let pem_parsed = match pem::parse(domain_cert_pem.as_bytes()) {
        Ok(p) => {
            tracing::info!("[MITM] PEM parsed, tag={}", p.tag());
            p
        }
        Err(e) => {
            tracing::error!("[MITM] Cert parse error: {:?}", e);
            return;
        }
    };

    tracing::info!("[MITM] Parsing private key...");
    let key_pair = match rcgen::KeyPair::from_pem(&domain_key_pem) {
        Ok(k) => {
            tracing::info!("[MITM] Key pair parsed");
            k
        }
        Err(e) => {
            tracing::error!("[MITM] Key parse error: {:?}", e);
            return;
        }
    };

    tracing::info!("[MITM] Building TLS server config...");
    let mut server_config = match rustls::ServerConfig::builder()
        .with_no_client_auth()
        .with_single_cert(
            vec![rustls::pki_types::CertificateDer::from(
                pem_parsed.contents().to_vec(),
            )],
            rustls::pki_types::PrivateKeyDer::from(rustls::pki_types::PrivatePkcs8KeyDer::from(
                key_pair.serialize_der(),
            )),
        ) {
        Ok(cfg) => cfg,
        Err(e) => {
            tracing::error!("[MITM] Cert config error: {:?}", e);
            return;
        }
    };
    server_config.alpn_protocols.clear();
    server_config.alpn_protocols.push(b"h2".to_vec());
    server_config.alpn_protocols.push(b"http/1.1".to_vec());

    let tls_acceptor = tokio_rustls::TlsAcceptor::from(Arc::new(server_config));

    tracing::info!("[MITM] ========== TLS HANDSHAKE PHASE ==========");
    tracing::info!("[MITM] Starting TLS accept for host={}, port={}", host, port);

    tracing::info!("[MITM] Creating TokioIo wrapper...");
    let mut io = TokioIo::new(upgraded);

    tracing::info!("[MITM] Calling tls_acceptor.accept()...");
    let tls_stream = match tls_acceptor.accept(&mut io).await {
        Ok(s) => {
            tracing::info!("[MITM] TLS accept SUCCESS for host={}", host);
            s
        }
        Err(e) => {
            let err_msg = format!("{:?}", e);
            let err_display = format!("{}", e);
            tracing::error!("[MITM] ========== TLS ACCEPT ERROR ==========");
            tracing::error!("[MITM] TLS accept FAILED for host={}", host);
            tracing::error!("[MITM] Error kind: {:?}", e.kind());
            tracing::error!("[MITM] Error: {}", err_display);

            if err_msg.contains("UnexpectedEof") || err_msg.contains("eof") {
                tracing::warn!("[MITM] Diagnosis: EOF - client closed before handshake");
            } else if err_msg.contains("timeout") || err_msg.contains("TimedOut") {
                tracing::warn!("[MITM] Diagnosis: Timeout - client didn't complete handshake");
            } else if err_msg.contains("closed") {
                tracing::warn!("[MITM] Diagnosis: Connection closed by peer");
            }
            tracing::error!("[MITM] =======================================");
            return;
        }
    };

    tracing::info!("[MITM] TLS connection established, creating HTTP service");

    let io = TokioIo::new(tls_stream);
    let app = app_handle.clone();
    let target = target_id.clone();
    let conn_id_clone = conn_id.clone();
    let host_clone = host.clone();
    let port_clone = port;
    let ts_clone = timestamp;
    let event_tx_clone = event_tx.clone();
    let intercept_clone = intercept.clone();

    let service = service_fn(move |req: Request<Incoming>| {
        tracing::info!("[MITM] Received request: {} {} via host={}",
            req.method(), req.uri().path(), host_clone);
        let handler = app.clone();
        let target = target.clone();
        let conn_id = conn_id_clone.clone();
        let host = host_clone.clone();
        let port = port_clone;
        let timestamp = ts_clone;
        let event_tx = event_tx_clone.clone();
        let intercept = intercept_clone.clone();

        async move {
            handle_mitm_request(
                req,
                handler,
                target,
                conn_id,
                host,
                port,
                timestamp,
                event_tx,
                intercept,
            )
            .await
        }
    });

    tracing::info!("[MITM] ========== STARTING HTTP SERVER ==========");
    if let Err(e) = hyper::server::conn::http2::Builder::new(TokioExecutor::new())
        .serve_connection(io, service)
        .await
    {
        if !is_benign_shutdown_error(&e) {
            tracing::error!("[MITM] HTTP serve error: {}", e);
        }
    }

    tracing::info!("[MITM] Connection closing");

    let _ = app_handle.emit(
        "proxy-connection-close",
        serde_json::json!({
            "id": conn_id,
            "timestamp": timestamp,
            "host": host,
            "port": port,
            "targetId": target_id,
            "duration": crate::proxy::utils::now_ms() - timestamp
        }),
    );

    tracing::info!("[MITM] ========== handle_connect_upgraded EXIT ==========");
}

async fn handle_mitm_request(
    req: Request<Incoming>,
    _app_handle: tauri::AppHandle,
    _target_id: String,
    _conn_id: String,
    host: String,
    port: u16,
    _timestamp: u64,
    event_tx: mpsc::Sender<ProxyEvent>,
    intercept: Arc<InterceptConfig>,
) -> Result<Response<Full<Bytes>>, std::convert::Infallible> {
    if req.uri().host().is_none() && req.uri().path().is_empty() {
        return Ok(Response::builder().status(400).body(Full::new(Bytes::new())).unwrap());
    }

    if req.method() == Method::CONNECT {
        return Ok(Response::builder().status(400).body(Full::new(Bytes::new())).unwrap());
    }

    let method = req.method().to_string();
    let path = req.uri().path().to_string();
    let url = format!("https://{}{}", host, path);
    let version = format!("{:?}", req.version());

    let headers: HashMap<String, String> = req
        .headers()
        .iter()
        .map(|(k, v)| (k.to_string().to_lowercase(), v.to_str().unwrap_or("").to_string()))
        .collect();

    let body_bytes = req.into_body().collect().await.map(|b| b.to_bytes()).unwrap_or_default();
    let body_vec = if body_bytes.is_empty() { None } else { Some(body_bytes.to_vec()) };

    let mut handler = CapturingHandler::new(event_tx).with_intercept(intercept);

    let body_vec_for_handler = body_vec.clone();
    let captured = match handler
        .handle_request(
            method.clone(),
            url.clone(),
            version.clone(),
            headers.clone(),
            body_vec_for_handler,
        )
        .await
    {
        Some(c) => c,
        None => {
            return Ok(Response::builder()
                .status(502)
                .body(Full::new(Bytes::new()))
                .unwrap());
        }
    };

let proxied_req = captured.into_proxied_request();

    let forward_host = proxied_req.url
        .split("://")
        .nth(1)
        .unwrap_or(&proxied_req.url)
        .split('/')
        .next()
        .unwrap_or(&proxied_req.url)
        .to_string();
    let forward_path = if proxied_req.path.is_empty() { "/".to_string() } else { proxied_req.path.clone() };

    tracing::debug!("Forwarding request: method={}, host={}, path={}", proxied_req.method, forward_host, forward_path);

    if forward_host.contains("facebook") || forward_host.contains("google") {
        tracing::info!("[MITM] Request to sensitive host: {} via {}", forward_host, proxied_req.method);
    }

    let https_client = create_https_client();
    tracing::info!("[MITM] Created HTTPS client for upstream connection");

    let uri_str = if proxied_req.path.is_empty() { "/" } else { &proxied_req.path };
    let full_url = format!("https://{}{}", forward_host, uri_str);
    let uri: hyper::Uri = full_url.parse().unwrap();
    tracing::info!("[MITM] Constructed URI: {}", uri);
    let mut request_builder = Request::builder()
        .method(proxied_req.method.as_str())
        .uri(uri);

    for (key, value) in &proxied_req.headers {
        if key != "host" {
            request_builder = request_builder.header(key.as_str(), value.as_str());
        }
    }

    if let Some(host_header) = proxied_req.headers.get("host") {
        tracing::debug!("[MITM] Using Host header: {}", host_header);
    }

    let request_body = proxied_req.body
        .as_ref()
        .map(|b| Bytes::copy_from_slice(b.as_bytes()))
        .unwrap_or_else(Bytes::new);

    let request = match request_builder.body(Full::new(request_body)) {
        Ok(req) => {
            tracing::debug!("[MITM] Request built successfully");
            req
        }
        Err(e) => {
            log::error!("[MITM] Request build error: {}", e);
            return Ok(Response::builder()
                .status(500)
                .body(Full::new(Bytes::new()))
                .unwrap());
        }
    };

    tracing::info!("[MITM] Sending request to {}:{}{}", forward_host, port, uri_str);
    let response_result = tokio::time::timeout(
        std::time::Duration::from_secs(30),
        https_client.request(request)
    ).await;

    match response_result {
        Ok(Ok(res)) => {
            let status = res.status().as_u16();
            let status_text = res.status().canonical_reason().unwrap_or("").to_string();
            let resp_headers: HashMap<String, String> = res
                .headers()
                .iter()
                .map(|(k, v)| (k.to_string().to_lowercase(), v.to_str().unwrap_or("").to_string()))
                .collect();

            let body_bytes = res.into_body().collect().await.map(|b| b.to_bytes()).unwrap_or_default();
            let response_body = if body_bytes.is_empty() { None } else { Some(body_bytes.to_vec()) };

            let _ = handler
                .handle_response(
                    status,
                    status_text,
                    "HTTP/1.1".to_string(),
                    resp_headers.clone(),
                    response_body,
                )
                .await;

            Ok(Response::builder()
                .status(status)
                .body(Full::new(body_bytes))
                .unwrap())
        }
        Ok(Err(e)) => {
            log::error!("[MITM] Client request error: {}", e);
            handler.send_error(0, format!("Request failed: {}", e), "forwarding".to_string(), Some(proxied_req.url.clone()));
            Ok(Response::builder()
                .status(502)
                .body(Full::new(Bytes::new()))
                .unwrap())
        }
        Err(_) => {
            log::error!("[MITM] Request timed out");
            handler.send_error(0, "Request timed out".to_string(), "timeout".to_string(), Some(proxied_req.url.clone()));
            Ok(Response::builder()
                .status(504)
                .body(Full::new(Bytes::new()))
                .unwrap())
        }
    }
}

pub fn is_benign_shutdown_error(e: &dyn std::error::Error) -> bool {
    let msg = e.to_string();
    msg.contains("shutting down") || msg.contains("connection was not closed cleanly")
}

fn rand_id() -> String {
    format!("{:x}", crate::proxy::utils::now_ms() % 0xffffff)
}