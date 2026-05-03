use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProxiedRequest {
    pub method: String,
    pub url: String,
    pub version: String,
    pub headers: HashMap<String, String>,
    pub body: Option<String>,
    pub timestamp: i64,
}

impl ProxiedRequest {
    pub fn new(
        method: impl Into<String>,
        url: impl Into<String>,
        version: impl Into<String>,
        headers: HashMap<String, String>,
        body: Option<String>,
        timestamp: i64,
    ) -> Self {
        Self {
            method: method.into(),
            url: url.into(),
            version: version.into(),
            headers,
            body,
            timestamp,
        }
    }

    pub fn method(&self) -> &str {
        &self.method
    }

    pub fn uri(&self) -> &str {
        &self.url
    }

    pub fn version(&self) -> &str {
        &self.version
    }

    pub fn headers(&self) -> &HashMap<String, String> {
        &self.headers
    }

    pub fn body(&self) -> &Option<String> {
        &self.body
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProxiedResponse {
    pub status: u16,
    pub status_text: String,
    pub version: String,
    pub headers: HashMap<String, String>,
    pub body: Option<String>,
    pub timestamp: i64,
}

impl ProxiedResponse {
    pub fn new(
        status: u16,
        status_text: impl Into<String>,
        version: impl Into<String>,
        headers: HashMap<String, String>,
        body: Option<String>,
        timestamp: i64,
    ) -> Self {
        Self {
            status,
            status_text: status_text.into(),
            version: version.into(),
            headers,
            body,
            timestamp,
        }
    }

    pub fn status(&self) -> u16 {
        self.status
    }

    pub fn status_text(&self) -> &str {
        &self.status_text
    }

    pub fn version(&self) -> &str {
        &self.version
    }

    pub fn headers(&self) -> &HashMap<String, String> {
        &self.headers
    }

    pub fn body(&self) -> &Option<String> {
        &self.body
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum InterceptAction {
    Forward,
    Modified,
    Block,
}

#[derive(Debug, Clone)]
pub struct InterceptDecision {
    pub action: InterceptAction,
    pub method: Option<String>,
    pub url: Option<String>,
    pub headers: Option<HashMap<String, String>>,
    pub body: Option<String>,
    pub status: Option<u16>,
    pub status_text: Option<String>,
    pub response_headers: Option<HashMap<String, String>>,
}

impl InterceptDecision {
    pub fn forward() -> Self {
        Self {
            action: InterceptAction::Forward,
            method: None,
            url: None,
            headers: None,
            body: None,
            status: None,
            status_text: None,
            response_headers: None,
        }
    }

    pub fn modified(
        method: String,
        url: String,
        headers: HashMap<String, String>,
        body: String,
    ) -> Self {
        Self {
            action: InterceptAction::Modified,
            method: Some(method),
            url: Some(url),
            headers: Some(headers),
            body: Some(body),
            status: None,
            status_text: None,
            response_headers: None,
        }
    }

    pub fn block(
        status: u16,
        status_text: String,
        headers: HashMap<String, String>,
        body: String,
    ) -> Self {
        Self {
            action: InterceptAction::Block,
            method: None,
            url: None,
            headers: None,
            body: None,
            status: Some(status),
            status_text: Some(status_text),
            response_headers: Some(headers),
        }
    }
}