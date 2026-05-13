use chrono::{DateTime, Utc};
use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, RwLock as StdRwLock};
use tokio::sync::RwLock;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProxyRequest {
    pub method: String,
    pub uri: String,
    pub http_version: String,
    pub headers: HashMap<String, String>,
    pub body: Vec<u8>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProxyResponse {
    pub status_code: u16,
    pub status_text: String,
    pub http_version: String,
    pub headers: HashMap<String, String>,
    pub body: Vec<u8>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProxyRecord {
    pub id: Uuid,
    pub timestamp: DateTime<Utc>,
    pub request: ProxyRequest,
    pub response: Option<ProxyResponse>,
    pub client_addr: String,
    pub server_addr: String,
}

pub static PROXY_STORE: Lazy<Arc<StdRwLock<Vec<ProxyRecord>>>> =
    Lazy::new(|| Arc::new(StdRwLock::new(Vec::new())));

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum InterceptMode {
    Enabled,
    Disabled,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InterceptStatus {
    pub mode: InterceptMode,
    pub paused_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PausedRequest {
    pub id: Uuid,
    pub timestamp: DateTime<Utc>,
    pub client_addr: String,
    pub server_addr: String,
    pub request: ProxyRequest,
    pub response: Option<ProxyResponse>,
}

pub static INTERCEPT_MODE: Lazy<Arc<RwLock<InterceptMode>>> =
    Lazy::new(|| Arc::new(RwLock::new(InterceptMode::Disabled)));

pub static PAUSED_REQUESTS: Lazy<Arc<RwLock<Vec<PausedRequest>>>> =
    Lazy::new(|| Arc::new(RwLock::new(Vec::new())));

pub async fn get_mode() -> InterceptMode {
    let mode = INTERCEPT_MODE.read().await;
    mode.clone()
}

pub async fn set_mode(new_mode: InterceptMode) {
    let mut mode = INTERCEPT_MODE.write().await;
    *mode = new_mode;
}

pub async fn enable_intercept() {
    set_mode(InterceptMode::Enabled).await;
}

pub async fn disable_intercept() {
    set_mode(InterceptMode::Disabled).await;
}

pub async fn get_status() -> InterceptStatus {
    let mode = INTERCEPT_MODE.read().await;
    let paused = PAUSED_REQUESTS.read().await;
    InterceptStatus {
        mode: mode.clone(),
        paused_count: paused.len(),
    }
}

pub async fn add_paused_request(req: PausedRequest) {
    let mut paused = PAUSED_REQUESTS.write().await;
    paused.push(req);
}

pub async fn get_paused_request(id: &Uuid) -> Option<PausedRequest> {
    let paused = PAUSED_REQUESTS.read().await;
    paused.iter().find(|r| r.id == *id).cloned()
}

pub async fn remove_paused_request(id: &Uuid) -> Option<PausedRequest> {
    let mut paused = PAUSED_REQUESTS.write().await;
    if let Some(pos) = paused.iter().position(|r| r.id == *id) {
        Some(paused.remove(pos))
    } else {
        None
    }
}

pub async fn get_all_paused() -> Vec<PausedRequest> {
    let paused = PAUSED_REQUESTS.read().await;
    paused.clone()
}