use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HttpRequest {
    pub method: String,
    pub url: String,
    #[serde(default)]
    pub headers: HashMap<String, String>,
    #[serde(default)]
    pub body: String,
    #[serde(default = "default_follow_redirects")]
    pub follow_redirects: bool,
    #[serde(default = "default_max_hops")]
    pub max_hops: u32,
}

fn default_follow_redirects() -> bool {
    true
}

fn default_max_hops() -> u32 {
    10
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HttpResponse {
    pub status: u16,
    pub status_text: String,
    pub headers: HashMap<String, String>,
    pub body: String,
    pub time_ms: u64,
    pub final_url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[allow(dead_code)]
pub struct IntruderPayload {
    pub position: usize,
    pub value: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[allow(dead_code)]
pub struct IntruderResult {
    pub id: String,
    pub payload: String,
    pub status: Option<u16>,
    pub response_length: Option<usize>,
    pub response_time_ms: Option<u64>,
    pub error: Option<String>,
    pub comment: Option<String>,
}