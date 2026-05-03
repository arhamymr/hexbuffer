use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tokio_util::sync::CancellationToken;

#[derive(Clone, Serialize, Deserialize, Default)]
pub struct ProxyState {
    pub running: bool,
    pub port: Option<u16>,
    pub connections: u32,
}

#[derive(Clone, Serialize, Deserialize, PartialEq)]
pub enum RequestType { XHR, Media, CSS, JS, Document, Font, Other }

impl RequestType {
    pub fn as_str(&self) -> &'static str {
        match self {
            RequestType::XHR => "XHR", RequestType::Media => "Media",
            RequestType::CSS => "CSS", RequestType::JS => "JS",
            RequestType::Document => "Document", RequestType::Font => "Font",
            RequestType::Other => "Other",
        }
    }
    pub fn from_headers(sec_fetch_mode: Option<&str>, accept: Option<&str>, ct: Option<&str>, url: &str) -> Self {
        if let Some(mode) = sec_fetch_mode {
            if mode == "cors" && accept.map_or(false, |a| a.contains("application/json")) {
                return RequestType::XHR;
            }
        }
        let ct = ct.unwrap_or("");
        if ct.contains("application/json") || url.contains("/api/") || url.contains("/v1/") || url.contains("/v2/") {
            return RequestType::XHR;
        }
        if ct.starts_with("text/css") || url.ends_with(".css") { return RequestType::CSS; }
        if ct.contains("javascript") || url.ends_with(".js") { return RequestType::JS; }
        if ct.starts_with("image/") || ct.starts_with("video/") || ct.starts_with("audio/") { return RequestType::Media; }
        if ct.starts_with("font/") || url.ends_with(".woff2") || url.ends_with(".woff") { return RequestType::Font; }
        if ct.starts_with("text/html") { return RequestType::Document; }
        RequestType::Other
    }
}

#[derive(Clone, Serialize, Deserialize)]
pub struct ApiCall {
    pub id: String, pub session_id: String, pub target_id: String, pub timestamp: u64, pub request_type: RequestType,
    pub method: String, pub url: String, pub host: String, pub path: String, pub query_params: HashMap<String, String>,
    pub headers: HashMap<String, String>, pub cookies: HashMap<String, String>,
    pub request_body: Option<String>, pub request_body_size: u64,
    pub response_status: Option<u16>, pub response_status_text: Option<String>,
    pub response_headers: HashMap<String, String>, pub response_cookies: HashMap<String, String>,
    pub response_body: Option<String>, pub response_body_size: u64, pub response_content_type: Option<String>,
    pub security_state: String, pub server_ip: Option<String>,
    pub duration_ms: Option<u64>,
}

impl ApiCall {
    pub fn new(method: String, url: String, headers: HashMap<String, String>, body: Option<String>, target_id: String, sec_ch: Option<&str>, acc: Option<&str>) -> Self {
        let ts = super::super::utils::now_ms();
        let (host, path) = super::super::utils::parse_url(&url);
        let ct = headers.get("content-type").map(|s| s.as_str());
        Self {
            id: format!("call_{}_{}", ts, super::super::utils::rand_id()),
            session_id: format!("session_{}", ts),
            target_id, timestamp: ts, request_type: RequestType::from_headers(sec_ch, acc, ct, &url),
            method, url, host, path, query_params: super::super::utils::parse_query_params(&url),
            headers, cookies: HashMap::new(),
            request_body: body.clone(), request_body_size: body.as_ref().map(|b| b.len() as u64).unwrap_or(0),
            response_status: None, response_status_text: None,
            response_headers: HashMap::new(), response_cookies: HashMap::new(),
            response_body: None, response_body_size: 0, response_content_type: None,
            security_state: "unknown".to_string(), server_ip: None,
            duration_ms: None,
        }
    }
    pub fn with_response(mut self, status: u16, status_text: String, headers: HashMap<String, String>, body: Option<String>, ct: Option<String>) -> Self {
        let now = super::super::utils::now_ms();
        self.duration_ms = Some(now.saturating_sub(self.timestamp));
        self.response_status = Some(status); self.response_status_text = Some(status_text);
        self.response_headers = headers.clone(); self.response_cookies = super::super::utils::extract_cookies(&headers);
        self.response_body = body.clone(); self.response_body_size = body.as_ref().map(|b| b.len() as u64).unwrap_or(0);
        self.response_content_type = ct; self
    }
    pub fn log_raw_data(&self) {
        log::info!("=== ApiCall Raw Data ===\n{}", serde_json::to_string_pretty(self).unwrap_or_default());
    }
}

#[derive(Clone, Serialize, Deserialize)]
pub struct ProxyConnection {
    pub id: String, pub timestamp: u64, pub host: String, pub port: u16, pub target_id: String,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct ParsedRequest {
    pub id: String, pub timestamp: String, pub method: String, pub url: String,
    pub http_version: String, pub host: String, pub path: String, pub query: Option<String>,
    pub headers: Vec<(String, String)>, pub cookies: Vec<(String, String)>,
    pub body: Option<String>, pub content_type: Option<String>, pub peer: String, pub curl: String, pub raw: String,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct ParsedResponse {
    pub status: u16, pub status_text: String, pub headers: Vec<(String, String)>,
    pub body: Option<String>, pub body_size: usize, pub content_type: Option<String>,
}

#[derive(Clone, Serialize, Deserialize)]
pub enum WsDirection { ClientToServer, ServerToClient }

#[derive(Clone, Serialize, Deserialize)]
pub enum WsOpcode { Text, Binary, Ping, Pong, Close, Continuation }

#[derive(Clone, Serialize, Deserialize)]
pub struct WsFrame {
    pub direction: WsDirection,
    pub opcode: WsOpcode,
    pub time: u64,
    pub payload: bytes::Bytes,
    pub truncated: bool,
}

impl WsFrame {
    pub fn new(direction: WsDirection, opcode: WsOpcode, time: u64, payload: bytes::Bytes, truncated: bool) -> Self {
        Self { direction, opcode, time, payload, truncated }
    }
}

pub struct ProxyServer {
    port: u16,
    target_id: Option<String>,
    cert_manager: std::sync::Arc<crate::CertManager>,
}

impl ProxyServer {
    pub fn new(port: u16, cert_manager: std::sync::Arc<crate::CertManager>) -> Self {
        Self { port, target_id: None, cert_manager }
    }
    pub fn with_target_id(mut self, target_id: String) -> Self { self.target_id = Some(target_id); self }

    pub async fn start(&mut self, app_handle: tauri::AppHandle, cancel_token: CancellationToken) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let listener = tokio::net::TcpListener::bind(std::net::SocketAddr::from(([0, 0, 0, 0], self.port))).await?;
        log::info!("Proxy listening on {}", listener.local_addr().unwrap());
        let target_id = self.target_id.clone().unwrap_or_else(|| "default".to_string());
        let app = app_handle.clone();
        let cert = self.cert_manager.clone();
        tokio::spawn(async move {
            while let Ok((stream, _)) = listener.accept().await {
                if cancel_token.is_cancelled() { break; }
                let app = app.clone(); let tid = target_id.clone(); let cert = cert.clone(); let ct = cancel_token.clone();
                tokio::spawn(super::handlers::handle_connection(stream, app, tid, cert, ct));
            }
        });
        Ok(())
    }
}