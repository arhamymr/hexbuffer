use crate::CertManager;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::net::SocketAddr;
use std::sync::Arc;
use tokio::net::{TcpListener, TcpStream};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::time::sleep;
use tauri::Emitter;
use chrono::Local;
use rustls::{ClientConfig, RootCertStore, ServerConfig};
use rustls::pki_types::{CertificateDer, PrivateKeyDer, ServerName};
use tokio_rustls::{TlsAcceptor, TlsConnector};
use pem;
use rcgen::KeyPair;

fn build_upstream_client_config() -> Arc<ClientConfig> {
    let mut roots = RootCertStore::empty();
    roots.extend(webpki_roots::TLS_SERVER_ROOTS.iter().cloned());
    let config = ClientConfig::builder()
        .with_root_certificates(roots)
        .with_no_client_auth();
    Arc::new(config)
}

async fn connect_upstream_tls(stream: TcpStream, host: &str, config: Arc<ClientConfig>) -> std::io::Result<tokio_rustls::client::TlsStream<TcpStream>> {
    let connector = TlsConnector::from(config);
    let server_name = ServerName::try_from(host.to_string()).map_err(|e| std::io::Error::new(std::io::ErrorKind::InvalidInput, e))?;
    connector.connect(server_name, stream).await.map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))
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

fn find_body_start(buffer: &[u8], body_offset: usize) -> Option<usize> {
    if body_offset == 0 || body_offset >= buffer.len() {
        return None;
    }
    let mut pos = 0;
    let mut offset_count = 0;
    while pos < buffer.len() {
        if buffer[pos] == b'\r' && pos + 1 < buffer.len() && buffer[pos + 1] == b'\n' {
            if pos + 2 < buffer.len() && buffer[pos + 2] == b'\r' && pos + 3 < buffer.len() && buffer[pos + 3] == b'\n' {
                return Some(pos + 4);
            }
            if body_offset > 0 && offset_count == body_offset - 1 {
                return Some(pos + 2);
            }
            offset_count += 1;
            pos += 2;
        } else {
            pos += 1;
        }
    }
    None
}

#[derive(Clone, Serialize, Deserialize, Default)]
pub struct ProxyState {
    pub running: bool,
    pub port: Option<u16>,
    pub connections: u32,
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
            if let Some(cl) = parse_content_length(&buffer[..header_end]) {
                let body_end = header_end + cl;
                if buffer.len() >= body_end {
                    buffer.truncate(body_end);
                    return Ok(buffer);
                }
                while buffer.len() < body_end {
                    let mut add = vec![0u8; body_end - buffer.len()];
                    let n = AsyncReadExt::read(stream, &mut add).await?;
                    if n == 0 { return Ok(buffer); }
                    buffer.extend_from_slice(&add[..n]);
                }
                return Ok(buffer);
            }
            return Ok(buffer);
        }
        let mut add = vec![0u8; 8192];
        let n = AsyncReadExt::read(stream, &mut add).await?;
        if n == 0 { return Ok(buffer); }
        buffer.extend_from_slice(&add[..n]);
    }
}

async fn read_complete_response(stream: &mut TcpStream) -> Result<Vec<u8>, std::io::Error> {
    let mut buffer = Vec::new();
    loop {
        if let Some(header_end) = find_header_end(&buffer) {
            let cl = parse_content_length(&buffer[..header_end]);
            if let Some(len) = cl {
                let body_end = header_end + len;
                if buffer.len() >= body_end {
                    buffer.truncate(body_end);
                    return Ok(buffer);
                }
                while buffer.len() < body_end {
                    let mut add = vec![0u8; body_end - buffer.len()];
                    let n = AsyncReadExt::read(stream, &mut add).await?;
                    if n == 0 { return Ok(buffer); }
                    buffer.extend_from_slice(&add[..n]);
                }
                return Ok(buffer);
            }
            return Ok(buffer);
        }
        let mut add = vec![0u8; 16384];
        let n = AsyncReadExt::read(stream, &mut add).await?;
        if n == 0 { return Ok(buffer); }
        buffer.extend_from_slice(&add[..n]);
    }
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

#[derive(Clone, Serialize, Deserialize)]
pub struct ProxyLogEntry {
    pub id: String,
    pub timestamp: String,
    pub event_type: String,
    pub connection_id: String,
    pub host: String,
    pub port: u16,
    pub target_id: String,
    pub method: Option<String>,
    pub url: Option<String>,
    pub status: Option<u16>,
    pub status_text: Option<String>,
    pub headers: Vec<(String, String)>,
    pub body: Option<String>,
    pub body_size: usize,
    pub curl: Option<String>,
    pub request_headers: Option<Vec<(String, String)>>,
    pub request_body: Option<String>,
    pub request_body_size: Option<usize>,
    pub response_headers: Option<Vec<(String, String)>>,
    pub response_body: Option<String>,
    pub response_body_size: Option<usize>,
    pub content_type: Option<String>,
    pub client_addr: String,
    pub duration_ms: Option<u64>,
    pub client_bytes: u64,
    pub server_bytes: u64,
}

impl ProxyLogEntry {
    pub fn new_complete(
        connection_id: String,
        host: String,
        port: u16,
        target_id: String,
        id: String,
        method: String,
        url: String,
        req_headers: Vec<(String, String)>,
        req_body: Option<String>,
        req_body_size: usize,
        curl: String,
        status: u16,
        status_text: String,
        resp_headers: Vec<(String, String)>,
        resp_body: Option<String>,
        resp_body_size: usize,
        content_type: Option<String>,
        client_addr: String,
        duration_ms: u64,
        client_bytes: u64,
        server_bytes: u64,
    ) -> Self {
        Self {
            id,
            timestamp: Local::now().format("%H:%M:%S%.3f").to_string(),
            event_type: "complete".to_string(),
            connection_id,
            host,
            port,
            target_id,
            method: Some(method),
            url: Some(url),
            status: Some(status),
            status_text: Some(status_text),
            headers: req_headers.clone(),
            body: req_body.clone(),
            body_size: req_body_size,
            curl: Some(curl),
            request_headers: Some(req_headers),
            request_body: req_body,
            request_body_size: Some(req_body_size),
            response_headers: Some(resp_headers),
            response_body: resp_body,
            response_body_size: Some(resp_body_size),
            content_type,
            client_addr,
            duration_ms: Some(duration_ms),
            client_bytes,
            server_bytes,
        }
    }
}

fn emit_proxy_log(log: &ProxyLogEntry, app: &tauri::AppHandle) {
    let _ = app.emit("proxy-log", log);
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

    server_config.alpn_protocols.clear();

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
    let mut preface_seen = false;

    loop {
        let mut read_buf = [0u8; 8192];
        let read_future = AsyncReadExt::read(&mut tls_stream, &mut read_buf);

        tokio::select! {
            _ = sleep(tokio::time::Duration::from_secs(10)) => {
                log::warn!("[MITM] Connection timeout for {}, closing", host);
                break;
            }
            result = read_future => {
                match result {
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
                                if first_line.len() >= 3 {
                                    let method = first_line[0].to_string();
                                    let path = first_line[1].to_string();
                                    let http_version = first_line.get(2).unwrap_or(&"HTTP/1.1").to_string();

                                    if method == "PRI" && path == "*" && http_version == "HTTP/2.0" {
                                        if !preface_seen {
                                            log::info!("[MITM] HTTP/2 connection preface received for {}, waiting for actual requests", host);
                                            preface_seen = true;
                                        }
                                        http_request_buf.clear();
                                        continue;
                                    }

                                    if method == "CONNECT" {
                                        log::info!("[MITM] Received CONNECT for {}, forwarding as-is", path);
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
    _port: u16,
    mut request_data: Vec<u8>,
    method: String,
    path: String,
    http_version: String,
    app_handle: tauri::AppHandle,
    target_id: String,
    connection: ProxyConnection,
    timestamp: u64,
    peer_addr: SocketAddr,
    mut client_tls: tokio_rustls::server::TlsStream<TcpStream>,
    _cert_manager: Arc<CertManager>,
) {
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
            headers.insert(key.trim().to_lowercase(), value.trim().to_string());
        }
    }

    let body = if header_end < request_data.len() {
        Some(&request_data[header_end..])
    } else {
        None
    };

    let url = format!("https://{}{}", host, path);
    let parsed_req = parse_request_for_logger(&method, &url, &http_version, &headers, body, &peer_addr.to_string(), &String::from_utf8_lossy(&request_data));

    let req_body = body.and_then(|b| String::from_utf8(b.to_vec()).ok());
    let api_call_id = format!("call_{}_{}", timestamp, rand_id());
    let api_call_session = format!("session_{}", timestamp);

    let upstream_addr = format!("{}:443", host);
    log::info!("[MITM] Connecting to {}", upstream_addr);

    let upstream_tcp = match TcpStream::connect(&upstream_addr).await {
        Ok(s) => s,
        Err(e) => {
            log::error!("[MITM] Upstream connect error: {}", e);
            return;
        }
    };

    let client_cfg = build_upstream_client_config();
    let mut upstream_tls = match connect_upstream_tls(upstream_tcp, &host, client_cfg).await {
        Ok(s) => s,
        Err(e) => {
            log::error!("[MITM] Upstream TLS error: {}", e);
            return;
        }
    };

    log::info!("[MITM] Forwarding request to upstream");
    if let Err(e) = upstream_tls.write_all(&request_data).await {
        log::error!("[MITM] Failed to forward request: {}", e);
        return;
    }

    log::info!("[MITM] Reading response from upstream");
    let mut response_buf = Vec::new();
    let mut body_offset = 0;
    let mut status_line = String::new();
    let mut response_headers_map = HashMap::new();

    loop {
        let mut read_buf = [0u8; 8192];
        match upstream_tls.read(&mut read_buf).await {
            Ok(0) => break,
            Ok(n) => {
                response_buf.extend_from_slice(&read_buf[..n]);

                if body_offset == 0 {
                    if let Some(header_end_pos) = find_header_end(&response_buf) {
                        let header_str = String::from_utf8_lossy(&response_buf[..header_end_pos]);
                        let resp_lines: Vec<&str> = header_str.lines().collect();

                        if !resp_lines.is_empty() {
                            status_line = resp_lines[0].to_string();
                        }

                        for line in resp_lines.iter().skip(1) {
                            let line_trimmed = line.trim();
                            if line_trimmed.is_empty() {
                                body_offset = header_end_pos;
                                break;
                            }
                            if let Some((key, value)) = line_trimmed.split_once(':') {
                                response_headers_map.insert(key.trim().to_lowercase(), value.trim().to_string());
                            }
                        }

                        let content_length = response_headers_map.get("content-length").and_then(|v| v.parse::<usize>().ok());
                        let chunked = response_headers_map.get("transfer-encoding").map(|v| v.contains("chunked")).unwrap_or(false);

                        if content_length.is_some() || chunked {
                            if let Some(cl) = content_length {
                                if response_buf.len() >= header_end_pos + cl {
                                    response_buf.truncate(header_end_pos + cl);
                                    break;
                                }
                            }
                        } else {
                            if response_buf.len() > header_end_pos {
                                break;
                            }
                        }
                    }
                } else {
                    if let Some(cl) = response_headers_map.get("content-length").and_then(|v| v.parse::<usize>().ok()) {
                        if response_buf.len() >= body_offset + cl {
                            response_buf.truncate(body_offset + cl);
                            break;
                        }
                    } else if response_headers_map.get("transfer-encoding").map(|v| v.contains("chunked")).unwrap_or(false) {
                        let chunk_end: &[u8] = b"0\r\n\r\n";
                        if response_buf.len() >= 5 && response_buf[response_buf.len() - 5..] == *chunk_end {
                            break;
                        }
                    } else {
                        break;
                    }
                }

                if response_buf.len() > 50 * 1024 * 1024 {
                    log::warn!("[MITM] Response buffer too large, truncating");
                    break;
                }
            }
            Err(e) => {
                log::error!("[MITM] Upstream read error: {}", e);
                break;
            }
        }
    }

    let (response_status, response_status_text, response_body_offset) = parse_response_status(&response_buf);
    let response_body = if response_body_offset > 0 && response_body_offset < response_buf.len() {
        Some(String::from_utf8_lossy(&response_buf[response_body_offset..]).to_string())
    } else {
        None
    };
    let response_body_size = response_body.as_ref().map(|b| b.len()).unwrap_or(0);
    let response_content_type = response_headers_map.get("content-type").cloned();

    log::info!("[MITM] Response: {} {} body_size={}", response_status, response_status_text, response_body_size);

let req_headers: Vec<(String, String)> = headers.clone().into_iter().map(|(k, v)| (k, v)).collect();
    let resp_headers: Vec<(String, String)> = response_headers_map.clone().into_iter().map(|(k, v)| (k, v)).collect();

    let start_time = std::time::Instant::now();
    let _ = client_tls.write_all(&response_buf).await;
    let _ = client_tls.flush().await;
    let duration = start_time.elapsed().as_millis() as u64;

    drop(upstream_tls);

    let sec_fetch_mode = headers.get("sec-fetch-mode").map(|s| s.as_str());
    let accept = headers.get("accept").map(|s| s.as_str());
    let request_type = RequestType::from_headers(sec_fetch_mode, accept, None, &url);

    let req_body_size = body.map(|b| b.len()).unwrap_or(0);

    let log_entry = ProxyLogEntry::new_complete(
        connection.id.clone(),
        host.clone(),
        443,
        target_id.clone(),
        api_call_id.clone(),
        method.clone(),
        url.clone(),
        req_headers.clone(),
        req_body.clone(),
        req_body_size,
        parsed_req.curl,
        response_status,
response_status_text.clone(),
        resp_headers,
        response_body.clone(),
        response_body_size,
        response_content_type.clone(),
        peer_addr.to_string(),
        duration,
        request_data.len() as u64,
        response_buf.len() as u64,
    );

    emit_proxy_log(&log_entry, &app_handle);
}

fn parse_response_status(buffer: &[u8]) -> (u16, String, usize) {
    let header_end = match find_header_end(buffer) {
        Some(pos) => pos,
        None => return (0, String::new(), 0),
    };

    let header_str = String::from_utf8_lossy(&buffer[..header_end]);
    let lines: Vec<&str> = header_str.lines().collect();

    if lines.is_empty() {
        return (0, String::new(), 0);
    }

    let status_parts: Vec<&str> = lines[0].split_whitespace().collect();
    let status = status_parts.get(1).and_then(|s| s.parse().ok()).unwrap_or(0);
    let status_text = status_parts.get(2).unwrap_or(&"").to_string();

    (status, status_text, header_end)
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

    let response_body = if let Some(body_start) = find_body_start(&response_buf, response_body_offset) {
        Some(String::from_utf8_lossy(&response_buf[body_start..]).to_string())
    } else {
        None
    };

    let response_body_size = response_body.as_ref().map(|b| b.len()).unwrap_or(0);

    let req_headers: Vec<(String, String)> = api_call_headers.clone().into_iter().map(|(k, v)| (k, v)).collect();
    let resp_headers: Vec<(String, String)> = response_headers_map.clone().into_iter().map(|(k, v)| (k, v)).collect();

    let log_entry = ProxyLogEntry::new_complete(
        format!("conn_{}", timestamp),
        api_call_host.clone(),
        80,
        target_id.clone(),
        api_call_id.clone(),
        api_call_method.clone(),
        api_call_url.clone(),
        req_headers.clone(),
        req_body.clone(),
        body.map(|b| b.len()).unwrap_or(0),
        format!("curl -X {} '{}'", api_call_method, api_call_url),
        response_status,
        response_status_text.clone(),
        resp_headers,
        response_body.clone(),
        response_body_size,
        response_content_type.clone(),
        peer_addr.to_string(),
        0,
        full_data.len() as u64,
        response_buf.len() as u64,
    );

    emit_proxy_log(&log_entry, &app_handle);
}

fn rand_id() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let seed = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_nanos();
    format!("{:x}", seed % 0xffffff)
}