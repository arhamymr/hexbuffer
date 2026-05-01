use crate::CertManager;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::net::SocketAddr;
use std::sync::Arc;
use tokio::net::{TcpListener, TcpStream};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tauri::Emitter;
use chrono::Local;
use rustls::ServerConfig;
use rustls::pki_types::{CertificateDer, PrivateKeyDer};
use tokio_rustls::TlsAcceptor;
use pem;
use rcgen::KeyPair;

#[derive(Clone, Serialize, Deserialize, Default)]
pub struct ProxyState {
    pub running: bool,
    pub port: Option<u16>,
    pub connections: u32,
}

#[derive(Clone, Serialize, Deserialize, PartialEq)]
pub enum RequestType {
    XHR,
    Media,
    CSS,
    JS,
    Document,
    Font,
    Other,
}

impl RequestType {
    pub fn as_str(&self) -> &'static str {
        match self {
            RequestType::XHR => "XHR",
            RequestType::Media => "Media",
            RequestType::CSS => "CSS",
            RequestType::JS => "JS",
            RequestType::Document => "Document",
            RequestType::Font => "Font",
            RequestType::Other => "Other",
        }
    }

    pub fn from_headers(
        sec_fetch_mode: Option<&str>,
        accept: Option<&str>,
        content_type: Option<&str>,
        url: &str,
    ) -> Self {
        if let Some(mode) = sec_fetch_mode {
            if mode == "cors" {
                if let Some(accept_hdr) = accept {
                    if accept_hdr.contains("application/json") {
                        return RequestType::XHR;
                    }
                }
            }
        }

        if let Some(ct) = content_type {
            if ct.contains("application/json") {
                return RequestType::XHR;
            }
            if ct.starts_with("text/css") || url.ends_with(".css") {
                return RequestType::CSS;
            }
            if ct.contains("javascript") || url.ends_with(".js") {
                return RequestType::JS;
            }
            if ct.starts_with("image/") || ct.starts_with("video/") || ct.starts_with("audio/") {
                return RequestType::Media;
            }
            if ct.starts_with("font/") || url.ends_with(".woff2") || url.ends_with(".woff") {
                return RequestType::Font;
            }
            if ct.starts_with("text/html") {
                return RequestType::Document;
            }
        }

        if url.contains("/api/") || url.contains("/v1/") || url.contains("/v2/") {
            return RequestType::XHR;
        }

        RequestType::Other
    }
}

#[derive(Clone, Serialize, Deserialize)]
pub struct ApiCall {
    pub id: String,
    pub session_id: String,
    pub target_id: String,
    pub timestamp: u64,
    pub request_type: RequestType,

    pub method: String,
    pub url: String,
    pub host: String,
    pub path: String,
    pub query_params: HashMap<String, String>,

    pub headers: HashMap<String, String>,
    pub cookies: HashMap<String, String>,
    pub request_body: Option<String>,
    pub request_body_size: u64,

    pub response_status: Option<u16>,
    pub response_status_text: Option<String>,
    pub response_headers: HashMap<String, String>,
    pub response_cookies: HashMap<String, String>,
    pub response_body: Option<String>,
    pub response_body_size: u64,
    pub response_content_type: Option<String>,

    pub security_state: String,
    pub server_ip: Option<String>,
}

impl ApiCall {
    pub fn new(id: String) -> Self {
        Self {
            id,
            session_id: String::new(),
            target_id: String::new(),
            timestamp: 0,
            request_type: RequestType::Other,
            method: String::new(),
            url: String::new(),
            host: String::new(),
            path: String::new(),
            query_params: HashMap::new(),
            headers: HashMap::new(),
            cookies: HashMap::new(),
            request_body: None,
            request_body_size: 0,
            response_status: None,
            response_status_text: None,
            response_headers: HashMap::new(),
            response_cookies: HashMap::new(),
            response_body: None,
            response_body_size: 0,
            response_content_type: None,
            security_state: "unknown".to_string(),
            server_ip: None,
        }
    }

    pub fn from_request(
        id: String,
        method: String,
        url: String,
        headers: HashMap<String, String>,
        body: Option<String>,
    ) -> Self {
        let (host, path) = parse_url(&url);
        let query_params = parse_query_params(&url);
        let cookies = parse_cookies(headers.get("cookie").map(|s| s.as_str()));

        let sec_fetch_mode = headers.get("sec-fetch-mode").map(|s| s.as_str());
        let accept = headers.get("accept").map(|s| s.as_str());
        let request_type = RequestType::from_headers(sec_fetch_mode, accept, None, &url);

        let timestamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64;

        Self {
            id,
            session_id: format!("session_{}", timestamp),
            target_id: String::new(),
            timestamp,
            request_type,
            method,
            url,
            host,
            path,
            query_params,
            headers,
            cookies,
            request_body: body.clone(),
            request_body_size: body.as_ref().map(|b| b.len() as u64).unwrap_or(0),
            response_status: None,
            response_status_text: None,
            response_headers: HashMap::new(),
            response_cookies: HashMap::new(),
            response_body: None,
            response_body_size: 0,
            response_content_type: None,
            security_state: "unknown".to_string(),
            server_ip: None,
        }
    }

    pub fn set_response(
        &mut self,
        status: u16,
        status_text: Option<String>,
        headers: HashMap<String, String>,
        body: Option<String>,
        content_type: Option<String>,
    ) {
        self.response_status = Some(status);
        self.response_status_text = status_text;
        self.response_headers = headers.clone();
        self.response_cookies = extract_response_cookies(&headers);
        self.response_body = body.clone();
        self.response_body_size = body.as_ref().map(|b| b.len() as u64).unwrap_or(0);
        self.response_content_type = content_type;
    }

    pub fn to_curl(&self) -> String {
        let mut cmd = format!("curl -X {} '{}'", self.method, self.url);

        for (key, value) in &self.headers {
            cmd.push_str(&format!(" \\\n  -H '{}: {}'", key, value));
        }

        if !self.cookies.is_empty() {
            let cookie_str = self
                .cookies
                .iter()
                .map(|(k, v)| format!("{}={}", k, v))
                .collect::<Vec<_>>()
                .join("; ");
            cmd.push_str(&format!(" \\\n  -b '{}'", cookie_str));
        }

        if let Some(body) = &self.request_body {
            cmd.push_str(&format!(" \\\n  -d '{}'", body));
        }

        cmd
    }

    pub fn log_raw_data(&self) {
        log::info!("=== ApiCall Raw Data ===");
        log::info!("id: {}", self.id);
        log::info!("session_id: {}", self.session_id);
        log::info!("target_id: {}", self.target_id);
        log::info!("timestamp: {}", self.timestamp);
        log::info!("request_type: {}", self.request_type.as_str());
        log::info!("method: {}", self.method);
        log::info!("url: {}", self.url);
        log::info!("host: {}", self.host);
        log::info!("path: {}", self.path);

        if !self.query_params.is_empty() {
            log::info!("query_params:");
            for (k, v) in &self.query_params {
                log::info!("  {}: {}", k, v);
            }
        }

        log::info!("headers:");
        for (k, v) in &self.headers {
            log::info!("  {}: {}", k, v);
        }

        if let Some(cookie_header) = self.headers.get("cookie") {
            log::info!("cookie_header: {}", cookie_header);
        }

        if !self.cookies.is_empty() {
            log::info!("cookies (parsed):");
            for (k, v) in &self.cookies {
                log::info!("  {}: {}", k, v);
            }
        }

        if let Some(body) = &self.request_body {
            log::info!("request_body: {}", body);
        }
        log::info!("request_body_size: {}", self.request_body_size);

        log::info!("response_status: {:?}", self.response_status);
        if let Some(text) = &self.response_status_text {
            log::info!("response_status_text: {}", text);
        }

        log::info!("response_headers:");
        for (k, v) in &self.response_headers {
            log::info!("  {}: {}", k, v);
        }

        if !self.response_cookies.is_empty() {
            log::info!("response_cookies:");
            for (k, v) in &self.response_cookies {
                log::info!("  {}: {}", k, v);
            }
        }

        if let Some(body) = &self.response_body {
            let preview = if body.len() > 200 {
                format!("{}...", &body[..200])
            } else {
                body.clone()
            };
            log::info!("response_body: {}", preview);
        }
        log::info!("response_body_size: {}", self.response_body_size);
        if let Some(ct) = &self.response_content_type {
            log::info!("response_content_type: {}", ct);
        }
        log::info!("security_state: {}", self.security_state);
        if let Some(ip) = &self.server_ip {
            log::info!("server_ip: {}", ip);
        }
        log::info!("=== End ===");
    }
}

// ── Logger types for debugger ─────────────────────────────────

#[derive(Clone, Serialize, Deserialize)]
pub struct ParsedRequest {
    pub id: String,
    pub timestamp: String,
    pub method: String,
    pub url: String,
    pub http_version: String,
    pub host: String,
    pub path: String,
    pub query: Option<String>,
    pub headers: Vec<(String, String)>,
    pub cookies: Vec<(String, String)>,
    pub body: Option<String>,
    pub content_type: Option<String>,
    pub peer: String,
    pub curl: String,
    pub raw: String,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct ParsedResponse {
    pub status: u16,
    pub status_text: String,
    pub headers: Vec<(String, String)>,
    pub body: Option<String>,
    pub body_size: usize,
    pub content_type: Option<String>,
}

fn parse_request_for_logger(
    method: &str,
    uri: &str,
    version: &str,
    headers: &HashMap<String, String>,
    body: Option<&[u8]>,
    peer: &str,
    raw: &str,
) -> ParsedRequest {
    let timestamp = Local::now().format("%H:%M:%S%.3f").to_string();

    let all_headers: Vec<(String, String)> = headers
        .iter()
        .map(|(k, v)| (k.clone(), v.clone()))
        .collect();

    let cookies: Vec<(String, String)> = headers
        .get("cookie")
        .map(|v| {
            v.split(';')
                .filter_map(|pair| {
                    let mut parts = pair.trim().splitn(2, '=');
                    let k = parts.next()?.trim().to_string();
                    let v = parts.next().unwrap_or("").trim().to_string();
                    if k.is_empty() { None } else { Some((k, v)) }
                })
                .collect()
        })
        .unwrap_or_default();

    let content_type = headers.get("content-type").cloned();

    let body_str = body.and_then(|b| {
        if b.is_empty() {
            None
        } else {
            String::from_utf8(b.to_vec()).ok()
        }
    });

    let curl = generate_curl(method, uri, &all_headers, &cookies, body_str.as_deref());

    ParsedRequest {
        id: format!("req_{}", std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_nanos()),
        timestamp,
        method: method.to_string(),
        url: uri.to_string(),
        http_version: version.to_string(),
        host: headers.get("host").cloned().unwrap_or_default(),
        path: uri.split('?').next().unwrap_or(uri).to_string(),
        query: uri.find('?').map(|_| uri.split('?').nth(1).unwrap_or("").to_string()),
        headers: all_headers,
        cookies,
        body: body_str,
        content_type,
        peer: peer.to_string(),
        curl,
        raw: raw.to_string(),
    }
}

fn generate_curl(
    method: &str,
    uri: &str,
    headers: &[(String, String)],
    cookies: &[(String, String)],
    body: Option<&str>,
) -> String {
    let mut parts = vec!["curl".to_string()];

    if method != "GET" {
        parts.push(format!("-X {}", method));
    }

    for (k, v) in headers {
        if k == "host" || k == "cookie" {
            continue;
        }
        parts.push(format!("-H '{}: {}'", k, v));
    }

    if !cookies.is_empty() {
        let cookie_str = cookies
            .iter()
            .map(|(k, v)| format!("{}={}", k, v))
            .collect::<Vec<_>>()
            .join("; ");
        parts.push(format!("-b '{}'", cookie_str));
    }

    if let Some(b) = body {
        let escaped = b.replace('\'', "'\\''");
        let is_json = headers.iter().any(|(k, v)| k == "content-type" && v.contains("json"));
        if is_json {
            parts.push(format!("-d '{}'", escaped));
        } else {
            parts.push(format!("--data-raw '{}'", escaped));
        }
    }

    parts.push(format!("'{}'", uri));
    parts.join(" \\\n  ")
}

fn emit_logger_request(req: &ParsedRequest, app: &tauri::AppHandle) {
    let _ = app.emit("logger-request", req);
}

fn emit_logger_curl(curl: &str, app: &tauri::AppHandle) {
    let _ = app.emit("logger-curl", serde_json::json!({ "curl": curl }));
}

fn emit_logger_response(resp: &ParsedResponse, app: &tauri::AppHandle) {
    let _ = app.emit("logger-response", resp);
}

fn parse_url(url: &str) -> (String, String) {
    if let Some(start) = url.find("://") {
        let after_scheme = &url[start + 3..];
        let path_start = after_scheme.find('/').unwrap_or(after_scheme.len());
        let host = after_scheme[..path_start].to_string();
        let path = after_scheme[path_start..].to_string();
        (host, path)
    } else {
        (url.to_string(), "/".to_string())
    }
}

fn parse_query_params(url: &str) -> HashMap<String, String> {
    let mut params = HashMap::new();
    if let Some(query_start) = url.find('?') {
        let query = &url[query_start + 1..];
        for pair in query.split('&') {
            if let Some((key, value)) = pair.split_once('=') {
                params.insert(
                    urlencoding_decode(key),
                    urlencoding_decode(value),
                );
            } else if !pair.is_empty() {
                params.insert(urlencoding_decode(pair), String::new());
            }
        }
    }
    params
}

fn urlencoding_decode(s: &str) -> String {
    let mut result = String::new();
    let mut chars = s.chars().peekable();

    while let Some(c) = chars.next() {
        if c == '%' {
            let hex: String = chars.by_ref().take(2).collect();
            if hex.len() == 2 {
                if let Ok(byte) = u8::from_str_radix(&hex, 16) {
                    result.push(byte as char);
                }
            }
        } else if c == '+' {
            result.push(' ');
        } else {
            result.push(c);
        }
    }
    result
}

fn parse_cookies(cookie_header: Option<&str>) -> HashMap<String, String> {
    let mut cookies = HashMap::new();
    if let Some(header) = cookie_header {
        for pair in header.split(';') {
            let pair = pair.trim();
            if let Some((key, value)) = pair.split_once('=') {
                cookies.insert(key.trim().to_string(), value.trim().to_string());
            }
        }
    }
    cookies
}

fn extract_response_cookies(headers: &HashMap<String, String>) -> HashMap<String, String> {
    let mut cookies = HashMap::new();
    if let Some(set_cookie) = headers.get("set-cookie") {
        for part in set_cookie.split(',') {
            let part = part.trim();
            if let Some((key, rest)) = part.split_once('=') {
                let value = rest.split(';').next().unwrap_or("");
                cookies.insert(key.trim().to_string(), value.trim().to_string());
            }
        }
    }
    cookies
}

#[derive(Clone, Serialize, Deserialize)]
pub struct ProxyConnection {
    pub id: String,
    pub timestamp: u64,
    pub host: String,
    pub port: u16,
    pub target_id: String,
}

pub struct ProxyServer {
    port: u16,
    target_id: Option<String>,
    cert_manager: Arc<CertManager>,
}

impl ProxyServer {
    pub fn new(port: u16, cert_manager: Arc<CertManager>) -> Self {
        Self { port, target_id: None, cert_manager }
    }

    pub fn with_target_id(mut self, target_id: String) -> Self {
        self.target_id = Some(target_id);
        self
    }

    pub async fn start(&mut self, app_handle: tauri::AppHandle) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let addr = SocketAddr::from(([0, 0, 0, 0], self.port));
        let listener = TcpListener::bind(addr).await?;
        log::info!("Proxy listening on {}", addr);

        let target_id = self.target_id.clone().unwrap_or_else(|| "default".to_string());
        let app = app_handle.clone();
        let cert_mgr = self.cert_manager.clone();

        tokio::spawn(async move {
            loop {
                match listener.accept().await {
                    Ok((stream, client_addr)) => {
                        log::info!("New connection from {}", client_addr);
                        let app_clone = app.clone();
                        let tid = target_id.clone();
                        let cert_clone = cert_mgr.clone();
                        tokio::spawn(handle_connection(stream, app_clone, tid, cert_clone));
                    }
                    Err(e) => {
                        log::error!("Accept error: {}", e);
                    }
                }
            }
        });

        Ok(())
    }
}

async fn handle_connection(mut stream: TcpStream, app_handle: tauri::AppHandle, target_id: String, cert_manager: Arc<CertManager>) {
    let mut buffer = [0u8; 8192];

    match stream.read(&mut buffer).await {
        Ok(0) => return,
        Ok(n) => {
            let request_str = String::from_utf8_lossy(&buffer[..n]);
            let first_line = request_str.lines().next().unwrap_or("");
            log::debug!("Request: {}", first_line);

            let method = first_line.split_whitespace().next().unwrap_or("");
            let path = first_line.split_whitespace().nth(1).unwrap_or("");

            if method == "GET" && path == "/ca-cert" {
                match cert_manager.get_ca_cert_pem() {
                    Ok(cert_pem) => {
                        let response = format!(
                            "HTTP/1.1 200 OK\r\nContent-Type: application/x-x509-ca-cert\r\nContent-Length: {}\r\n\r\n{}",
                            cert_pem.len(),
                            cert_pem
                        );
                        let _ = stream.write_all(response.as_bytes()).await;
                        let _ = stream.flush().await;
                        log::info!("Served CA certificate");
                    }
                    Err(e) => {
                        log::error!("Failed to get CA cert: {}", e);
                        let response = "HTTP/1.1 500 Internal Server Error\r\n\r\nFailed to get CA cert";
                        let _ = stream.write_all(response.as_bytes()).await;
                        let _ = stream.flush().await;
                    }
                }
                return;
            }

            if request_str.starts_with("CONNECT ") {
                handle_connect_mitm(stream, &buffer[..n], app_handle, target_id, cert_manager).await;
            } else {
                handle_http_request(stream, &buffer[..n], app_handle, target_id).await;
            }
        }
        Err(e) => {
            log::error!("Read error: {}", e);
        }
    }
}

async fn handle_connect_mitm(mut stream: TcpStream, initial_data: &[u8], app_handle: tauri::AppHandle, target_id: String, cert_manager: Arc<CertManager>) {
    let request_str = String::from_utf8_lossy(initial_data);
    let lines: Vec<&str> = request_str.lines().collect();
    if lines.is_empty() {
        return;
    }

    let parts: Vec<&str> = lines[0].split_whitespace().collect();
    if parts.len() < 2 {
        return;
    }

    let target_host = parts[1];
    log::info!("CONNECT MITM request to {}", target_host);

    let (host, port) = if target_host.contains(':') {
        let parts: Vec<&str> = target_host.split(':').collect();
        (parts[0].to_string(), parts[1].parse().unwrap_or(443))
    } else {
        (target_host.to_string(), 443)
    };

    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis() as u64;

    let connection = ProxyConnection {
        id: format!("conn_{}_{}", timestamp, rand_id()),
        timestamp,
        host: host.clone(),
        port,
        target_id: target_id.clone(),
    };

    let _ = app_handle.emit("proxy-connection", &connection);

    let response = "HTTP/1.1 200 Connection Established\r\n\r\n";
    if let Err(e) = stream.write_all(response.as_bytes()).await {
        log::error!("Failed to send CONNECT response: {}", e);
        return;
    }
    if let Err(e) = stream.flush().await {
        log::error!("Failed to flush CONNECT response: {}", e);
        return;
    }

    let (domain_cert_pem, domain_key_pem) = match cert_manager.generate_domain_cert(&host) {
        Ok(certs) => certs,
        Err(e) => {
            log::error!("Failed to generate domain cert for {}: {}", host, e);
            return;
        }
    };

    let _ = match cert_manager.get_or_create_ca_cert() {
        Ok(_) => (),
        Err(e) => {
            log::error!("Failed to get CA cert: {}", e);
            return;
        }
    };

    let pem_parsed = match pem::parse(domain_cert_pem.as_bytes()) {
        Ok(p) => p,
        Err(e) => {
            log::error!("Failed to parse domain cert: {:?}", e);
            return;
        }
    };
    let cert_der = CertificateDer::from(pem_parsed.contents().to_vec());

    let key_pair = match KeyPair::from_pem(&domain_key_pem) {
        Ok(k) => k,
        Err(e) => {
            log::error!("Failed to parse domain key: {:?}", e);
            return;
        }
    };
    let key_der = PrivateKeyDer::from(rustls::pki_types::PrivatePkcs8KeyDer::from(key_pair.serialize_der()));

    let cert_chain = vec![cert_der.clone()];
    let cert_chain_len = cert_chain.len();

    let mut server_config = ServerConfig::builder()
        .with_no_client_auth()
        .with_single_cert(cert_chain, key_der)
        .map_err(|e| {
            log::error!("Failed to set cert: {:?}", e);
        }).ok().unwrap();

    server_config.alpn_protocols.push(b"http/1.1".to_vec());

    log::info!("TLS server config created for {} with {} certs in chain", host, cert_chain_len);

    let tls_acceptor = TlsAcceptor::from(Arc::new(server_config));

    let peer_addr = stream.peer_addr().unwrap_or(SocketAddr::from(([0, 0, 0, 0], 0)));

    log::info!("Starting TLS accept for {}", host);
    let mut tls_stream = match tls_acceptor.accept(stream).await {
        Ok(s) => {
            log::info!("TLS accept succeeded for {}", host);
            s
        }
        Err(e) => {
            log::error!("TLS accept error for {}: {:?}", host, e);
            log::error!("TLS error kind: {:?}", e.kind());
            return;
        }
    };

    log::info!("TLS handshake complete for {}", host);

    let mut http_request_buf = Vec::new();
    let mut handshake_complete = false;

    loop {
        let mut read_buf = [0u8; 8192];
        match AsyncReadExt::read(&mut tls_stream, &mut read_buf).await {
            Ok(0) => {
                log::debug!("TLS connection closed");
                break;
            }
            Ok(n) => {
                http_request_buf.extend_from_slice(&read_buf[..n]);

                if !handshake_complete {
                    handshake_complete = true;
                    log::info!("TLS handshake complete for {}", host);
                }

                if let Some(header_end) = find_header_end(&http_request_buf) {
                    let headers_data = &http_request_buf[..header_end];
                    let headers_str = String::from_utf8_lossy(headers_data).to_string();
                    let req_lines: Vec<&str> = headers_str.lines().collect();

                    if !req_lines.is_empty() {
                        let first_line: Vec<&str> = req_lines[0].split_whitespace().collect();
                        if first_line.len() >= 2 {
                            let method = first_line[0].to_string();
                            let path = first_line[1].to_string();
                            let http_version = first_line.get(2).unwrap_or(&"HTTP/1.1").to_string();

                            if method == "CONNECT" {
                                let mut new_buf = Vec::new();
                                new_buf.extend_from_slice(b"GET ");
                                new_buf.extend_from_slice(path.as_bytes());
                                new_buf.extend_from_slice(b" HTTP/1.1\r\n");
                                new_buf.extend_from_slice(&http_request_buf[header_end..]);
                                http_request_buf = new_buf;
                                let headers_str_new = String::from_utf8_lossy(&http_request_buf).to_string();
                                let req_lines_new: Vec<&str> = headers_str_new.lines().collect();
                                if !req_lines_new.is_empty() {
                                    let new_first: Vec<&str> = req_lines_new[0].split_whitespace().collect();
                                    if new_first.len() >= 2 {
                                        let new_method = new_first[0].to_string();
                                        let new_path = new_first[1].to_string();
                                        handle_mitm_request(
                                            host.clone(),
                                            port,
                                            http_request_buf.clone(),
                                            new_method,
                                            new_path,
                                            http_version,
                                            app_handle.clone(),
                                            target_id.clone(),
                                            connection.clone(),
                                            timestamp,
                                            peer_addr,
                                            tls_stream,
                                            cert_manager.clone(),
                                        ).await;
                                        return;
                                    }
                                }
                            } else {
                                handle_mitm_request(
                                    host.clone(),
                                    port,
                                    http_request_buf.clone(),
                                    method,
                                    path,
                                    http_version,
                                    app_handle.clone(),
                                    target_id.clone(),
                                    connection.clone(),
                                    timestamp,
                                    peer_addr,
                                    tls_stream,
                                    cert_manager.clone(),
                                ).await;
                                return;
                            }
                        }
                    }

                    break;
                }

                if http_request_buf.len() > 65536 {
                    log::warn!("Request buffer too large, truncating");
                    http_request_buf.truncate(65536);
                    break;
                }
            }
            Err(e) => {
                log::error!("TLS read error: {:?}", e);
                break;
            }
        }
    }

    let close_event = serde_json::json!({
        "id": connection.id,
        "timestamp": timestamp,
        "host": host,
        "port": port,
        "targetId": target_id,
        "clientBytes": 0,
        "serverBytes": 0,
        "duration": 0
    });
    let _ = app_handle.emit("proxy-connection-close", &close_event);
}

async fn handle_mitm_request(
    host: String,
    port: u16,
    request_data: Vec<u8>,
    method: String,
    path: String,
    _http_version: String,
    app_handle: tauri::AppHandle,
    target_id: String,
    connection: ProxyConnection,
    timestamp: u64,
    peer_addr: SocketAddr,
    mut tls_stream: tokio_rustls::server::TlsStream<TcpStream>,
    _cert_manager: Arc<CertManager>,
) {
    let request_str = String::from_utf8_lossy(&request_data);
    log::info!("[MITM] {} {} from {}", method, path, host);

    let header_end = match find_header_end(&request_data) {
        Some(pos) => pos,
        None => return,
    };

    let headers_data = &request_data[..header_end];
    let headers_str = String::from_utf8_lossy(headers_data).to_string();
    let lines: Vec<&str> = headers_str.lines().collect();

    let mut headers = HashMap::new();
    for line in lines.iter().skip(1) {
        let line_trimmed = line.trim();
        if line_trimmed.is_empty() {
            break;
        }
        if let Some((key, value)) = line_trimmed.split_once(':') {
            let key = key.trim().to_lowercase();
            let value = value.trim().to_string();
            headers.insert(key, value);
        }
    }

    let body = if header_end < request_data.len() {
        Some(&request_data[header_end..])
    } else {
        None
    };

    let url = format!("https://{}{}", host, path);

    let parsed_req = parse_request_for_logger(
        &method,
        &url,
        "HTTP/1.1",
        &headers,
        body,
        &peer_addr.to_string(),
        &request_str,
    );
    emit_logger_request(&parsed_req, &app_handle);
    emit_logger_curl(&parsed_req.curl, &app_handle);

    let req_body = body.and_then(|b| String::from_utf8(b.to_vec()).ok());
    let req_query_params = parse_query_params(&url);

    let api_call_id = format!("call_{}_{}", timestamp, rand_id());
    let api_call_session = format!("session_{}", timestamp);

    let dest_addr = format!("{}:80", host);
    log::info!("[MITM] Connecting to {}", dest_addr);

    let mut dest_stream = match TcpStream::connect(&dest_addr).await {
        Ok(s) => s,
        Err(e) => {
            log::error!("[MITM] Connect error: {}", e);
            return;
        }
    };

    if let Err(e) = dest_stream.write_all(&request_data).await {
        log::error!("[MITM] Forward error: {}", e);
        return;
    }

    let response_buf = match read_complete_response(&mut dest_stream).await {
        Ok(buf) => buf,
        Err(e) => {
            log::error!("[MITM] Read response error: {}", e);
            return;
        }
    };

    let response_str = String::from_utf8_lossy(&response_buf);
    let resp_lines: Vec<&str> = response_str.lines().collect();

    let mut response_status: u16 = 0;
    let mut response_status_text = String::new();
    let mut response_headers_map = HashMap::new();
    let mut response_body_offset: usize = 0;
    let mut response_content_type: Option<String> = None;

    if !resp_lines.is_empty() {
        let status_line: Vec<&str> = resp_lines[0].split_whitespace().collect();
        if status_line.len() >= 2 {
            response_status = status_line[1].parse().unwrap_or(0);
            response_status_text = status_line.get(2).unwrap_or(&"").to_string();
        }
    }

    for (i, line) in resp_lines.iter().enumerate().skip(1) {
        if line.is_empty() {
            response_body_offset = i + 1;
            break;
        }
        if let Some((key, value)) = line.split_once(':') {
            let key = key.trim().to_lowercase();
            let value = value.trim().to_string();
            if key == "content-type" {
                response_content_type = Some(value.clone());
            }
            response_headers_map.insert(key, value);
        }
    }

    let response_body = if response_body_offset > 0 && response_body_offset < resp_lines.len() {
        let body_start = resp_lines[..response_body_offset].join("\n").len() + response_body_offset;
        if body_start < response_buf.len() {
            Some(String::from_utf8_lossy(&response_buf[body_start..]).to_string())
        } else {
            None
        }
    } else {
        None
    };

    let response_body_size = response_body.as_ref().map(|b| b.len()).unwrap_or(0);

    let mut response_buf_to_send = response_buf.clone();

    if let Some(location) = response_headers_map.get("location") {
        if location.starts_with("https://") {
            let new_location = format!("http://{}:8888{}", host, location.strip_prefix("https://").unwrap_or(location));
            log::info!("[MITM] Rewriting redirect Location: {} -> {}", location, new_location);

            let response_str = String::from_utf8_lossy(&response_buf_to_send).to_string();
            let new_response_str = response_str.replace(location, &new_location);
            response_buf_to_send = new_response_str.into_bytes();
            response_headers_map.insert("location".to_string(), new_location);
        }
    }

    log::info!("[MITM] Response for {} {}: status={} Location={:?}",
        method, url, response_status,
        response_headers_map.get("location"));

    if let Err(e) = tls_stream.write_all(&response_buf_to_send).await {
        log::error!("[MITM] Write to client error: {}", e);
    }
    if let Err(e) = tls_stream.flush().await {
        log::error!("[MITM] Flush error: {}", e);
    }

    let sec_fetch_mode = headers.get("sec-fetch-mode").map(|s| s.as_str());
    let accept = headers.get("accept").map(|s| s.as_str());
    let request_type = RequestType::from_headers(sec_fetch_mode, accept, response_content_type.as_deref(), &url);

    let api_call = ApiCall {
        id: api_call_id,
        session_id: api_call_session,
        target_id: target_id.clone(),
        timestamp,
        request_type,
        method: method.clone(),
        url: url.clone(),
        host: host.clone(),
        path: path.clone(),
        query_params: req_query_params,
        headers: headers.clone(),
        cookies: parse_cookies(headers.get("cookie").map(|s| s.as_str())),
        request_body: req_body.clone(),
        request_body_size: body.map(|b| b.len() as u64).unwrap_or(0),
        response_status: Some(response_status),
        response_status_text: Some(response_status_text.clone()),
        response_headers: response_headers_map.clone(),
        response_cookies: extract_response_cookies(&response_headers_map),
        response_body: response_body.clone(),
        response_body_size: response_body_size as u64,
        response_content_type: response_content_type.clone(),
        security_state: "secure".to_string(),
        server_ip: None,
    };

    let parsed_resp = ParsedResponse {
        status: response_status,
        status_text: response_status_text,
        headers: response_headers_map.into_iter().map(|(k, v)| (k, v)).collect(),
        body: response_body,
        body_size: response_body_size,
        content_type: response_content_type,
    };
    emit_logger_response(&parsed_resp, &app_handle);

    let _ = app_handle.emit("api-call", &api_call);
    api_call.log_raw_data();

    let close_event = serde_json::json!({
        "id": connection.id,
        "timestamp": timestamp,
        "host": host,
        "port": port,
        "targetId": target_id,
        "clientBytes": request_data.len(),
        "serverBytes": response_buf.len(),
        "duration": 0
    });
    let _ = app_handle.emit("proxy-connection-close", &close_event);
}

fn find_header_end(buffer: &[u8]) -> Option<usize> {
    for i in 0..buffer.len().saturating_sub(3) {
        if buffer[i] == b'\r' && buffer[i+1] == b'\n' &&
           buffer[i+2] == b'\r' && buffer[i+3] == b'\n' {
            return Some(i + 4);
        }
    }
    None
}

fn parse_content_length(headers_data: &[u8]) -> Option<usize> {
    let headers_str = String::from_utf8_lossy(headers_data);
    for line in headers_str.lines() {
        let lower = line.to_lowercase();
        if lower.starts_with("content-length:") {
            let value = lower.trim_start_matches("content-length:").trim();
            return value.parse().ok();
        }
    }
    None
}

async fn read_complete_request(stream: &mut TcpStream, initial_data: &[u8]) -> Result<Vec<u8>, std::io::Error> {
    let mut buffer = initial_data.to_vec();

    loop {
        if let Some(header_end) = find_header_end(&buffer) {
            let content_length = parse_content_length(&buffer[..header_end]);
            if let Some(cl) = content_length {
                let body_start = header_end;
                let body_end = body_start + cl;
                if buffer.len() >= body_end {
                    buffer.truncate(body_end);
                    return Ok(buffer);
                }
                let needed = body_end - buffer.len();
                let mut additional = vec![0u8; needed];
                match tokio::io::AsyncReadExt::read(stream, &mut additional).await {
                    Ok(n) => {
                        if n == 0 {
                            return Ok(buffer);
                        }
                        buffer.extend_from_slice(&additional[..n]);
                        continue;
                    }
                    Err(_) => return Ok(buffer),
                }
            } else {
                buffer.truncate(header_end);
                return Ok(buffer);
            }
        }

        let mut additional = vec![0u8; 8192];
        match tokio::io::AsyncReadExt::read(stream, &mut additional).await {
            Ok(n) => {
                if n == 0 {
                    return Ok(buffer);
                }
                buffer.extend_from_slice(&additional[..n]);
            }
            Err(_) => return Ok(buffer),
        }
    }
}

async fn read_complete_response(stream: &mut TcpStream) -> Result<Vec<u8>, std::io::Error> {
    let mut buffer = Vec::new();

    loop {
        if let Some(header_end) = find_header_end(&buffer) {
            let content_length = parse_content_length(&buffer[..header_end]);
            if let Some(cl) = content_length {
                let body_start = header_end;
                let body_end = body_start + cl;
                if buffer.len() >= body_end {
                    buffer.truncate(body_end);
                    return Ok(buffer);
                }
                let needed = body_end - buffer.len();
                let mut additional = vec![0u8; needed];
                match tokio::io::AsyncReadExt::read(stream, &mut additional).await {
                    Ok(n) => {
                        if n == 0 {
                            return Ok(buffer);
                        }
                        buffer.extend_from_slice(&additional[..n]);
                        continue;
                    }
                    Err(_) => return Ok(buffer),
                }
            } else {
                return Ok(buffer);
            }
        }

        let mut additional = vec![0u8; 16384];
        match tokio::io::AsyncReadExt::read(stream, &mut additional).await {
            Ok(n) => {
                if n == 0 {
                    return Ok(buffer);
                }
                buffer.extend_from_slice(&additional[..n]);
            }
            Err(_) => return Ok(buffer),
        }
    }
}

async fn handle_http_request(
    mut stream: TcpStream,
    initial_data: &[u8],
    app_handle: tauri::AppHandle,
    target_id: String,
) {
    let full_data = match read_complete_request(&mut stream, initial_data).await {
        Ok(data) => data,
        Err(e) => {
            log::error!("[handle_http_request] Failed to read complete request: {}", e);
            return;
        }
    };

    let request_str = match String::from_utf8(full_data.clone()) {
        Ok(s) => s,
        Err(_) => return,
    };

    log::info!("[handle_http_request] Raw request:\n{}", request_str);

    let header_end = match find_header_end(&full_data) {
        Some(pos) => pos,
        None => return,
    };

    let headers_data = &full_data[..header_end];
    let headers_str = match String::from_utf8(headers_data.to_vec()) {
        Ok(s) => s,
        Err(_) => return,
    };

    let lines: Vec<&str> = headers_str.lines().collect();
    if lines.is_empty() {
        return;
    }

    let first_line: Vec<&str> = lines[0].split_whitespace().collect();
    if first_line.len() < 2 {
        return;
    }

    let method = first_line[0].to_string();
    let path = first_line[1].to_string();
    let http_version = first_line.get(2).unwrap_or(&"HTTP/1.1").to_string();

    let mut headers = HashMap::new();
    let mut host = "unknown".to_string();

    for line in lines.iter().skip(1) {
        let line_trimmed = line.trim();
        if line_trimmed.is_empty() {
            break;
        }
        if let Some((key, value)) = line_trimmed.split_once(':') {
            let key = key.trim().to_lowercase();
            let value = value.trim().to_string();
            if key == "host" {
                host = value.clone();
            }
            headers.insert(key, value);
        }
    }

    let body = if header_end < full_data.len() {
        Some(&full_data[header_end..])
    } else {
        None
    };

    let peer_addr = stream.peer_addr().unwrap_or(SocketAddr::from(([0, 0, 0, 0], 0)));
    let url = format!("http://{}{}", host, path);

    let parsed_req = parse_request_for_logger(
        &method,
        &url,
        &http_version,
        &headers,
        body,
        &peer_addr.to_string(),
        &request_str,
    );
    emit_logger_request(&parsed_req, &app_handle);
    emit_logger_curl(&parsed_req.curl, &app_handle);

    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis() as u64;

    let sec_fetch_mode = headers.get("sec-fetch-mode").map(|s| s.as_str());
    let accept = headers.get("accept").map(|s| s.as_str());
    let request_type = RequestType::from_headers(sec_fetch_mode, accept, None, &url);
    let req_body = body.and_then(|b| String::from_utf8(b.to_vec()).ok());
    let req_query_params = parse_query_params(&url);

    let api_call_id = format!("call_{}_{}", timestamp, rand_id());
    let api_call_session = format!("session_{}", timestamp);
    let api_call_method = method.clone();
    let api_call_url = url.clone();
    let api_call_host = host.clone();
    let api_call_path = path.clone();
    let api_call_headers = headers.clone();

    let dest_addr = format!("{}:80", host);
    log::info!("[handle_http_request] Connecting to {}", dest_addr);

    let mut dest_stream = match TcpStream::connect(&dest_addr).await {
        Ok(s) => s,
        Err(e) => {
            log::error!("[handle_http_request] Connect error: {}", e);
            let resp = "HTTP/1.1 502 Bad Gateway\r\n\r\n";
            let _ = stream.write_all(resp.as_bytes()).await;
            return;
        }
    };

    if let Err(e) = dest_stream.write_all(&full_data).await {
        log::error!("[handle_http_request] Forward error: {}", e);
        return;
    }

    let response_buf = match read_complete_response(&mut dest_stream).await {
        Ok(buf) => buf,
        Err(e) => {
            log::error!("[handle_http_request] Read response error: {}", e);
            return;
        }
    };

    if let Err(e) = stream.write_all(&response_buf).await {
        log::error!("[handle_http_request] Write to client error: {}", e);
    }

    let response_str = String::from_utf8_lossy(&response_buf);
    let resp_lines: Vec<&str> = response_str.lines().collect();

    let mut response_status: u16 = 0;
    let mut response_status_text = String::new();
    let mut response_headers_map = HashMap::new();
    let mut response_body_offset: usize = 0;
    let mut response_content_type: Option<String> = None;

    if !resp_lines.is_empty() {
        let status_line: Vec<&str> = resp_lines[0].split_whitespace().collect();
        if status_line.len() >= 2 {
            response_status = status_line[1].parse().unwrap_or(0);
            response_status_text = status_line.get(2).unwrap_or(&"").to_string();
        }
    }

    for (i, line) in resp_lines.iter().enumerate().skip(1) {
        if line.is_empty() {
            response_body_offset = i + 1;
            break;
        }
        if let Some((key, value)) = line.split_once(':') {
            let key = key.trim().to_lowercase();
            let value = value.trim().to_string();
            if key == "content-type" {
                response_content_type = Some(value.clone());
            }
            response_headers_map.insert(key, value);
        }
    }

    let response_body = if response_buf.len() > response_body_offset {
        let body_start = resp_lines[..response_body_offset].join("\n").len() + response_body_offset;
        if body_start < response_buf.len() {
            Some(String::from_utf8_lossy(&response_buf[body_start..]).to_string())
        } else {
            None
        }
    } else {
        None
    };

    let response_body_size = response_body.as_ref().map(|b| b.len()).unwrap_or(0);

    let api_call = ApiCall {
        id: api_call_id,
        session_id: api_call_session,
        target_id: target_id.clone(),
        timestamp,
        request_type,
        method: api_call_method,
        url: api_call_url,
        host: api_call_host,
        path: api_call_path,
        query_params: req_query_params,
        headers: api_call_headers.clone(),
        cookies: parse_cookies(api_call_headers.get("cookie").map(|s| s.as_str())),
        request_body: req_body,
        request_body_size: body.map(|b| b.len() as u64).unwrap_or(0),
        response_status: Some(response_status),
        response_status_text: Some(response_status_text.clone()),
        response_headers: response_headers_map.clone(),
        response_cookies: extract_response_cookies(&response_headers_map),
        response_body: response_body.clone(),
        response_body_size: response_body_size as u64,
        response_content_type: response_content_type.clone(),
        security_state: "unknown".to_string(),
        server_ip: None,
    };

    let parsed_resp = ParsedResponse {
        status: response_status,
        status_text: response_status_text,
        headers: response_headers_map.into_iter().map(|(k, v)| (k, v)).collect(),
        body: response_body,
        body_size: response_body_size,
        content_type: response_content_type,
    };
    emit_logger_response(&parsed_resp, &app_handle);

    let _ = app_handle.emit("api-call", &api_call);
    api_call.log_raw_data();
}

fn rand_id() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let seed = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_nanos();
    format!("{:x}", seed % 0xffffff)
}