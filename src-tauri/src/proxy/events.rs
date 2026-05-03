use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicU64, Ordering};
use std::collections::HashMap;

use super::types::{ProxiedRequest, ProxiedResponse};

static NEXT_ID: AtomicU64 = AtomicU64::new(1);

pub(crate) fn next_id() -> u64 {
    NEXT_ID.fetch_add(1, Ordering::Relaxed)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProxyEvent {
    #[serde(rename = "type")]
    pub event_type: String,
    pub id: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub request: Option<ProxiedRequest>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub response: Option<ProxiedResponse>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stage: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub meta: Option<ProxyEventMeta>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProxyEventMeta {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub duration_ms: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub size: Option<usize>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub waiting_since_ms: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub request_truncated: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub response_truncated: Option<bool>,
}

impl ProxyEvent {
    pub fn request_complete(
        id: u64,
        request: ProxiedRequest,
        response: ProxiedResponse,
        duration_ms: u64,
        size: usize,
    ) -> Self {
        Self {
            event_type: "RequestComplete".to_string(),
            id,
            request: Some(request),
            response: Some(response),
            message: None,
            stage: None,
            meta: Some(ProxyEventMeta {
                duration_ms: Some(duration_ms),
                size: Some(size),
                url: None,
                waiting_since_ms: None,
                request_truncated: None,
                response_truncated: None,
            }),
        }
    }

    pub fn request_intercepted(id: u64, request: ProxiedRequest, waiting_since_ms: i64) -> Self {
        Self {
            event_type: "RequestIntercepted".to_string(),
            id,
            request: Some(request),
            response: None,
            message: None,
            stage: None,
            meta: Some(ProxyEventMeta {
                duration_ms: None,
                size: None,
                url: None,
                waiting_since_ms: Some(waiting_since_ms),
                request_truncated: None,
                response_truncated: None,
            }),
        }
    }

    pub fn error(id: u64, message: String, stage: String, url: Option<String>) -> Self {
        Self {
            event_type: "Error".to_string(),
            id,
            request: None,
            response: None,
            message: Some(message),
            stage: Some(stage),
            meta: Some(ProxyEventMeta {
                duration_ms: None,
                size: None,
                url,
                waiting_since_ms: None,
                request_truncated: None,
                response_truncated: None,
            }),
        }
    }

    pub fn replay_complete(
        id: u64,
        request: ProxiedRequest,
        response: ProxiedResponse,
        duration_ms: u64,
        size: usize,
    ) -> Self {
        Self {
            event_type: "ReplayComplete".to_string(),
            id,
            request: Some(request),
            response: Some(response),
            message: None,
            stage: None,
            meta: Some(ProxyEventMeta {
                duration_ms: Some(duration_ms),
                size: Some(size),
                url: None,
                waiting_since_ms: None,
                request_truncated: None,
                response_truncated: None,
            }),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_next_id_increments() {
        let id1 = next_id();
        let id2 = next_id();
        assert!(id2 > id1);
    }

    #[test]
    fn test_request_complete_serialization() {
        let request = ProxiedRequest::new("GET", "https://example.com", "HTTP/1.1", HashMap::new(), None, 100);
        let response = ProxiedResponse::new(200, "OK", "HTTP/1.1", HashMap::new(), None, 200);
        let event = ProxyEvent::request_complete(42, request, response, 123, 456);

        let json = serde_json::to_string(&event).unwrap();
        assert!(json.contains("\"type\":\"RequestComplete\""));
        assert!(json.contains("\"id\":42"));
        assert!(json.contains("\"duration_ms\":123"));
        assert!(json.contains("\"size\":456"));
    }

    #[test]
    fn test_error_serialization() {
        let event = ProxyEvent::error(1, "Connection failed".to_string(), "connecting".to_string(), Some("https://example.com".to_string()));

        let json = serde_json::to_string(&event).unwrap();
        assert!(json.contains("\"type\":\"Error\""));
        assert!(json.contains("\"message\":\"Connection failed\""));
        assert!(json.contains("\"stage\":\"connecting\""));
    }
}