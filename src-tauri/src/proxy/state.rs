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

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ProxyFilter {
    pub search: Option<String>,
    pub methods: Option<Vec<String>>,
    pub status_codes: Option<Vec<u16>>,
    pub scope: Option<Vec<String>>,
}

impl ProxyFilter {
    pub fn host_matches_scope(&self, host: &str) -> bool {
        let Some(ref scope) = self.scope else {
            return true;
        };
        if scope.is_empty() {
            return true;
        }
        for pattern in scope {
            if let Some(domain) = pattern.strip_prefix("*.") {
                if host.ends_with(domain) {
                    return true;
                }
            } else if host.contains(pattern.as_str()) {
                return true;
            }
        }
        false
    }
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
        inner.paused_requests.iter().position(|r| r.id == *id).map(|pos| inner.paused_requests.remove(pos))
    }

    pub fn get_all_paused(&self) -> Vec<PausedRequest> {
        self.0.lock().unwrap().paused_requests.clone()
    }

    pub fn get_records_filtered(&self, filter: &ProxyFilter) -> Vec<ProxyRecord> {
        let inner = self.0.lock().unwrap();
        inner.records.iter()
            .filter(|record| {
                let host = record.request.uri.split("://").nth(1).unwrap_or("").split('/').next().unwrap_or("");
                if !filter.host_matches_scope(host) {
                    return false;
                }
                if let Some(ref methods) = filter.methods {
                    if !methods.is_empty() && !methods.contains(&record.request.method) {
                        return false;
                    }
                }
                if let Some(ref status_codes) = filter.status_codes {
                    if !status_codes.is_empty() {
                        let status = record.response.as_ref().map(|r| r.status_code).unwrap_or(0);
                        if !status_codes.contains(&status) {
                            return false;
                        }
                    }
                }
                if let Some(ref search) = filter.search {
                    if !search.is_empty() {
                        let search_lower = search.to_lowercase();
                        let uri_lower = record.request.uri.to_lowercase();
                        let host_lower = host.to_lowercase();
                        let path = record.request.uri.split('/').skip(3).collect::<Vec<_>>().join("/");
                        let path_lower = path.to_lowercase();

                        if !uri_lower.contains(&search_lower)
                            && !host_lower.contains(&search_lower)
                            && !path_lower.contains(&search_lower)
                        {
                            return false;
                        }
                    }
                }
                true
            })
            .cloned()
            .collect()
    }

    pub fn clear_records(&self) {
        self.0.lock().unwrap().records.clear();
    }

    pub fn delete_record(&self, id: &Uuid) -> Option<ProxyRecord> {
        let mut inner = self.0.lock().unwrap();
        inner.records.iter().position(|r| r.id == *id).map(|pos| inner.records.remove(pos))
    }
}

impl Default for ProxyState {
    fn default() -> Self {
        Self::new()
    }
}