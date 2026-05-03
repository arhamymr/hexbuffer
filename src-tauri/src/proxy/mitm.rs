use crate::CertManager;
use crate::proxy::handler::CapturingHandler;
use crate::proxy::intercept::InterceptConfig;
use crate::proxy::events::ProxyEvent;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::io::AsyncWriteExt;
use tokio::net::TcpStream;
use tokio::sync::mpsc;
use tokio_rustls::TlsAcceptor;
use tauri::Emitter;
use tokio_util::sync::CancellationToken;
use hyper::service::service_fn;
use hyper::{Method, Request, Response};
use hyper::body::Incoming;
use hyper_util::rt::{TokioExecutor, TokioIo};
use hyper_util::client::legacy::Client;
use hyper_util::client::legacy::connect::HttpConnector;
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
            "duration": crate::proxy::utils::now_ms() - timestamp
        }),
    );
}

async fn handle_mitm_request(
    req: Request<Incoming>,
    app_handle: tauri::AppHandle,
    target_id: String,
    conn_id: String,
    host: String,
    port: u16,
    timestamp: u64,
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

    let _proxied_req = captured.into_proxied_request();

    let dest_stream = match TcpStream::connect(format!("{}:{}", host, port)).await {
        Ok(s) => s,
        Err(e) => {
            log::error!("[MITM] Connect error: {}", e);
            handler.send_error(0, format!("Connect failed: {}", e), "connecting".to_string(), Some(url));
            return Ok(Response::builder()
                .status(502)
                .body(Full::new(Bytes::new()))
                .unwrap());
        }
    };

    let _upstream = TokioIo::new(dest_stream);
    let connector = HttpConnector::new();
    let mut client = Client::builder(TokioExecutor::new()).build_http();

    let uri: hyper::Uri = url.parse().unwrap();
    let mut request_builder = Request::builder()
        .method(method.as_str())
        .uri(uri);

    for (key, value) in &headers {
        if key != "host" {
            request_builder = request_builder.header(key.as_str(), value.as_str());
        }
    }

    let request = match request_builder.body(Full::new(if let Some(ref data) = body_vec {
            Bytes::copy_from_slice(data)
        } else {
            Bytes::new()
        })) {
            Ok(req) => req,
            Err(e) => {
                log::error!("[MITM] Request build error: {}", e);
                return Ok(Response::builder()
                    .status(500)
                    .body(Full::new(Bytes::new()))
                    .unwrap());
            }
        };

    let response_result = tokio::time::timeout(
        std::time::Duration::from_secs(30),
        client.request(request)
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
            handler.send_error(0, format!("Request failed: {}", e), "forwarding".to_string(), Some(url));
            Ok(Response::builder()
                .status(502)
                .body(Full::new(Bytes::new()))
                .unwrap())
        }
        Err(_) => {
            log::error!("[MITM] Request timed out");
            handler.send_error(0, "Request timed out".to_string(), "timeout".to_string(), Some(url));
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