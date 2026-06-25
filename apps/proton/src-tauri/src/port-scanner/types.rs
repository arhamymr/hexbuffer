use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Deserialize)]
pub struct PortScanRequest {
    #[serde(alias = "scanId")]
    pub scan_id: String,
    pub target: String,
    pub ports: Vec<u16>,
    #[serde(alias = "timeoutMs")]
    pub timeout_ms: Option<u64>,
    pub concurrency: Option<usize>,
    #[serde(alias = "bannerGrab")]
    pub banner_grab: Option<bool>,
    #[serde(alias = "scanType")]
    pub scan_type: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct PortScanResult {
    pub host: String,
    pub port: u16,
    pub state: String,
    pub service: String,
    pub banner: Option<String>,
    pub response_time_ms: Option<u128>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "type")]
pub enum PortScanProgress {
    Update { current: usize, total: usize },
    Complete,
    Cancelled,
}
