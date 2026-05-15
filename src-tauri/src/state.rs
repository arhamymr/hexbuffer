use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Mutex;
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

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Default)]
pub enum InterceptMode {
    #[default]
    Disabled,
    Enabled,
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

#[derive(Default)]
pub struct ProxyStateInner {
    pub records: Vec<ProxyRecord>,
    pub intercept_mode: InterceptMode,
    pub paused_requests: Vec<PausedRequest>,
}

pub struct ProxyState(Mutex<ProxyStateInner>);

impl ProxyState {
    pub fn new() -> Self {
        Self(Mutex::new(ProxyStateInner::default()))
    }

    pub fn get_records(&self) -> Vec<ProxyRecord> {
        self.0.lock().unwrap().records.clone()
    }

    pub fn add_record(&self, record: ProxyRecord) {
        self.0.lock().unwrap().records.push(record);
    }

    pub fn get_mode(&self) -> InterceptMode {
        self.0.lock().unwrap().intercept_mode.clone()
    }

    pub fn set_mode(&self, mode: InterceptMode) {
        self.0.lock().unwrap().intercept_mode = mode;
    }

    pub fn enable_intercept(&self) {
        self.0.lock().unwrap().intercept_mode = InterceptMode::Enabled;
    }

    pub fn disable_intercept(&self) {
        self.0.lock().unwrap().intercept_mode = InterceptMode::Disabled;
    }

    pub fn get_status(&self) -> InterceptStatus {
        let inner = self.0.lock().unwrap();
        InterceptStatus {
            mode: inner.intercept_mode.clone(),
            paused_count: inner.paused_requests.len(),
        }
    }

    pub fn add_paused_request(&self, req: PausedRequest) {
        self.0.lock().unwrap().paused_requests.push(req);
    }

    pub fn get_paused_request(&self, id: &Uuid) -> Option<PausedRequest> {
        self.0.lock().unwrap()
            .paused_requests
            .iter()
            .find(|r| r.id == *id)
            .cloned()
    }

    pub fn remove_paused_request(&self, id: &Uuid) -> Option<PausedRequest> {
        let mut inner = self.0.lock().unwrap();
        if let Some(pos) = inner.paused_requests.iter().position(|r| r.id == *id) {
            Some(inner.paused_requests.remove(pos))
        } else {
            None
        }
    }

    pub fn get_all_paused(&self) -> Vec<PausedRequest> {
        self.0.lock().unwrap().paused_requests.clone()
    }
}

impl Default for ProxyState {
    fn default() -> Self {
        Self::new()
    }
}