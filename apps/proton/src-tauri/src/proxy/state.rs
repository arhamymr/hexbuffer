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
    #[serde(default)]
    pub content_decoded: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProxyResponse {
    pub status_code: u16,
    pub status_text: String,
    pub http_version: String,
    pub headers: HashMap<String, String>,
    pub body: Vec<u8>,
    #[serde(default)]
    pub content_decoded: bool,
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

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum WebSocketConnectionState {
    Open,
    Closed,
    Error,
}

impl Default for WebSocketConnectionState {
    fn default() -> Self {
        Self::Closed
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum WebSocketMessageDirection {
    Inbound,
    Outbound,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum WebSocketMessageType {
    Text,
    Binary,
    Ping,
    Pong,
    Close,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebSocketConnectionRecord {
    pub id: Uuid,
    pub timestamp: DateTime<Utc>,
    pub url: String,
    pub host: String,
    pub path: String,
    pub handshake_request_headers: HashMap<String, String>,
    pub handshake_response_status: Option<u16>,
    pub handshake_response_headers: HashMap<String, String>,
    pub client_addr: String,
    pub server_addr: String,
    pub state: WebSocketConnectionState,
    pub message_count: u32,
    pub last_activity_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebSocketMessageRecord {
    pub id: Uuid,
    pub connection_id: Uuid,
    pub timestamp: DateTime<Utc>,
    pub direction: WebSocketMessageDirection,
    pub message_type: WebSocketMessageType,
    pub payload: Vec<u8>,
    pub payload_size: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct WebSocketFilter {
    pub search: Option<String>,
    pub scope: Option<Vec<String>>,
    pub states: Option<Vec<String>>,
}

impl WebSocketFilter {
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
    #[serde(default)]
    pub tab_id: Option<String>,
    pub request: ProxyRequest,
    pub response: Option<ProxyResponse>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ProxyFilter {
    pub search: Option<String>,
    pub path: Option<String>,
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
    pub paused_actions: HashMap<Uuid, InterceptAction>,
    pub active_intercept_tab_id: Option<String>,
    pub intercept_capture_patterns: Vec<String>,
    pub intercept_bypass_patterns: Vec<String>,
}

#[derive(Debug, Clone)]
pub enum InterceptAction {
    Forward {
        request: Option<ProxyRequest>,
        intercept_response: bool,
    },
    ForwardResponse(Option<ProxyResponse>),
    Drop,
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
        let mut inner = self.0.lock().unwrap();
        if mode == InterceptMode::Disabled && inner.intercept_mode == InterceptMode::Enabled {
            let paused_requests = inner.paused_requests.clone();
            for paused_request in &paused_requests {
                let action = if paused_request.response.is_some() {
                    InterceptAction::ForwardResponse(None)
                } else {
                    InterceptAction::Forward {
                        request: None,
                        intercept_response: false,
                    }
                };
                inner.paused_actions.insert(paused_request.id, action);
            }
            inner.paused_requests.clear();
        }
        inner.intercept_mode = mode;
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
        self.0
            .lock()
            .unwrap()
            .paused_requests
            .iter()
            .find(|r| r.id == *id)
            .cloned()
    }

    pub fn remove_paused_request(&self, id: &Uuid) -> Option<PausedRequest> {
        let mut inner = self.0.lock().unwrap();
        inner
            .paused_requests
            .iter()
            .position(|r| r.id == *id)
            .map(|pos| inner.paused_requests.remove(pos))
    }

    pub fn get_all_paused(&self) -> Vec<PausedRequest> {
        self.0.lock().unwrap().paused_requests.clone()
    }

    pub fn set_intercept_scope(&self, tab_id: String, capture_patterns: Vec<String>) {
        let mut inner = self.0.lock().unwrap();
        inner.active_intercept_tab_id = Some(tab_id);
        inner.intercept_capture_patterns = capture_patterns
            .into_iter()
            .map(|pattern| pattern.trim().to_lowercase())
            .filter(|pattern| !pattern.is_empty())
            .collect();
    }

    pub fn matching_intercept_tab_id(&self, uri: &str) -> Option<String> {
        let host = uri
            .split("://")
            .nth(1)
            .unwrap_or(uri)
            .split('/')
            .next()
            .unwrap_or(uri)
            .to_lowercase();
        let host_without_port = host.split(':').next().unwrap_or(&host);

        let inner = self.0.lock().unwrap();
        let tab_id = inner.active_intercept_tab_id.clone()?;

        if inner.intercept_capture_patterns.is_empty() {
            return None;
        }

        for pattern in &inner.intercept_capture_patterns {
            if let Some(domain) = pattern.strip_prefix("*.") {
                if host_without_port.ends_with(domain) || host.ends_with(domain) {
                    return Some(tab_id);
                }
            } else if host == *pattern || host_without_port == pattern {
                return Some(tab_id);
            }
        }

        None
    }

    pub fn forward_paused_request(
        &self,
        id: &Uuid,
        request: Option<ProxyRequest>,
        intercept_response: bool,
    ) -> bool {
        let mut inner = self.0.lock().unwrap();
        let existed = inner.paused_requests.iter().any(|r| r.id == *id);

        if existed {
            inner.paused_actions.insert(
                *id,
                InterceptAction::Forward {
                    request,
                    intercept_response,
                },
            );
            inner.paused_requests.retain(|request| request.id != *id);
        }

        existed
    }

    pub fn forward_paused_response(&self, id: &Uuid, response: Option<ProxyResponse>) -> bool {
        let mut inner = self.0.lock().unwrap();
        let existed = inner.paused_requests.iter().any(|r| r.id == *id);

        if existed {
            inner
                .paused_actions
                .insert(*id, InterceptAction::ForwardResponse(response));
            inner.paused_requests.retain(|request| request.id != *id);
        }

        existed
    }

    pub fn drop_paused_request(&self, id: &Uuid) -> bool {
        let mut inner = self.0.lock().unwrap();
        let existed = inner.paused_requests.iter().any(|r| r.id == *id);

        if existed {
            inner.paused_actions.insert(*id, InterceptAction::Drop);
            inner.paused_requests.retain(|request| request.id != *id);
        }

        existed
    }

    pub fn take_paused_action(&self, id: &Uuid) -> Option<InterceptAction> {
        self.0.lock().unwrap().paused_actions.remove(id)
    }

    pub fn forward_paused_by_tab(&self, tab_id: &str) -> usize {
        let mut inner = self.0.lock().unwrap();
        let matching_requests: Vec<PausedRequest> = inner
            .paused_requests
            .iter()
            .filter(|request| request.tab_id.as_deref() == Some(tab_id))
            .cloned()
            .collect();

        for request in &matching_requests {
            let action = if request.response.is_some() {
                InterceptAction::ForwardResponse(None)
            } else {
                InterceptAction::Forward {
                    request: None,
                    intercept_response: false,
                }
            };
            inner.paused_actions.insert(request.id, action);
        }

        inner
            .paused_requests
            .retain(|request| request.tab_id.as_deref() != Some(tab_id));

        matching_requests.len()
    }

    pub fn get_records_filtered(&self, filter: &ProxyFilter) -> Vec<ProxyRecord> {
        let inner = self.0.lock().unwrap();
        inner
            .records
            .iter()
            .filter(|record| {
                let host = record
                    .request
                    .uri
                    .split("://")
                    .nth(1)
                    .unwrap_or("")
                    .split('/')
                    .next()
                    .unwrap_or("");
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
                        let path = record
                            .request
                            .uri
                            .split('/')
                            .skip(3)
                            .collect::<Vec<_>>()
                            .join("/");
                        let path_lower = path.to_lowercase();

                        if !uri_lower.contains(&search_lower)
                            && !host_lower.contains(&search_lower)
                            && !path_lower.contains(&search_lower)
                        {
                            return false;
                        }
                    }
                }
                if let Some(ref path) = filter.path {
                    if !path.is_empty() {
                        let record_path = record
                            .request
                            .uri
                            .split("://")
                            .nth(1)
                            .unwrap_or(record.request.uri.as_str())
                            .split_once('/')
                            .map(|(_, p)| format!("/{}", p))
                            .unwrap_or_else(|| "/".to_string());

                        if !record_path.contains(path) {
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
        inner
            .records
            .iter()
            .position(|r| r.id == *id)
            .map(|pos| inner.records.remove(pos))
    }

    pub fn get_bypass_patterns(&self) -> Vec<String> {
        self.0.lock().unwrap().intercept_bypass_patterns.clone()
    }

    pub fn set_bypass_patterns(&self, patterns: Vec<String>) {
        self.0.lock().unwrap().intercept_bypass_patterns = patterns;
    }

    pub fn add_bypass_pattern(&self, pattern: String) -> Vec<String> {
        let mut inner = self.0.lock().unwrap();
        let trimmed = pattern.trim().to_string();
        if !trimmed.is_empty() && !inner.intercept_bypass_patterns.contains(&trimmed) {
            inner.intercept_bypass_patterns.push(trimmed);
        }
        inner.intercept_bypass_patterns.clone()
    }

    pub fn remove_bypass_pattern(&self, pattern: &str) -> Vec<String> {
        let mut inner = self.0.lock().unwrap();
        inner.intercept_bypass_patterns.retain(|p| p != pattern);
        inner.intercept_bypass_patterns.clone()
    }

    pub fn should_bypass_uri(&self, uri: &str) -> bool {
        if crate::proxy::intercept::hooks::is_captive_portal(uri) {
            return true;
        }

        let host = uri
            .split("://")
            .nth(1)
            .unwrap_or(uri)
            .split('/')
            .next()
            .unwrap_or(uri);

        let inner = self.0.lock().unwrap();
        for pattern in &inner.intercept_bypass_patterns {
            if let Some(domain) = pattern.strip_prefix("*.") {
                if host.ends_with(domain) {
                    return true;
                }
            } else if host == pattern {
                return true;
            }
        }
        false
    }
}

impl Default for ProxyState {
    fn default() -> Self {
        Self::new()
    }
}
