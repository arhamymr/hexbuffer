use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::process::Child;
use std::sync::{atomic::AtomicBool, Arc, Mutex};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CrawlConfig {
    pub target_url: String,
    pub strategy: Option<String>,
    pub max_depth: u32,
    pub max_pages: u32,
    pub same_domain_only: bool,
    pub exclude_paths: Option<String>,
    pub request_delay_ms: u64,
    pub timeout_ms: u64,
    pub enable_ai_insights: bool,
    pub network_settle_ms: Option<u64>,
    #[serde(default = "default_true")]
    pub capture_screenshots: bool,
    #[serde(default = "default_true")]
    pub capture_rendered_html: bool,
}

fn default_true() -> bool {
    true
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CrawlSession {
    pub id: String,
    pub target_url: String,
    pub status: String,
    pub strategy: String,
    pub max_depth: u32,
    pub max_pages: u32,
    pub started_at: Option<String>,
    pub finished_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CrawlPage {
    pub id: String,
    pub session_id: String,
    pub url: String,
    pub title: Option<String>,
    pub status: String,
    pub depth: u32,
    pub parent_url: Option<String>,
    pub http_status: Option<u16>,
    pub links_found: u32,
    pub forms_found: u32,
    pub discovered_at: String,
    pub visited_at: Option<String>,
    pub ai_summary: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ai_used_for_analysis: Option<bool>,
    pub interesting: Option<bool>,
    pub screenshot_path: Option<String>,
    pub rendered_html_path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AIInsight {
    pub id: String,
    pub session_id: String,
    pub page_id: Option<String>,
    pub severity: String,
    pub r#type: String,
    pub title: String,
    pub description: String,
    pub url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ai_used_for_analysis: Option<bool>,
    pub reviewed: bool,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ActivityLog {
    pub id: String,
    pub session_id: String,
    pub level: String,
    pub r#type: String,
    pub message: String,
    pub url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ai_used_for_analysis: Option<bool>,
    pub created_at: String,
}

#[derive(Default, Clone)]
pub struct AiBrowserState {
    pub(crate) sessions: Arc<Mutex<HashMap<String, CrawlSession>>>,
    pub(crate) pages: Arc<Mutex<HashMap<String, Vec<CrawlPage>>>>,
    pub(crate) insights: Arc<Mutex<HashMap<String, Vec<AIInsight>>>>,
    pub(crate) logs: Arc<Mutex<HashMap<String, Vec<ActivityLog>>>>,
    pub(crate) children: Arc<Mutex<HashMap<String, Arc<Mutex<Child>>>>>,
    pub(crate) cancellations: Arc<Mutex<HashMap<String, Arc<AtomicBool>>>>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SidecarMessage {
    #[serde(rename = "type")]
    pub message_type: String,
    pub id: Option<String>,
    pub session_id: Option<String>,
    pub page_id: Option<String>,
    pub url: Option<String>,
    pub parent_url: Option<String>,
    pub title: Option<String>,
    pub status: Option<String>,
    pub depth: Option<u32>,
    pub http_status: Option<u16>,
    pub links_found: Option<u32>,
    pub forms_found: Option<u32>,
    pub discovered_at: Option<String>,
    pub visited_at: Option<String>,
    pub ai_summary: Option<String>,
    pub ai_used_for_analysis: Option<bool>,
    pub interesting: Option<bool>,
    pub screenshot_path: Option<String>,
    pub rendered_html_path: Option<String>,
    pub level: Option<String>,
    pub log_type: Option<String>,
    pub insight_type: Option<String>,
    pub severity: Option<String>,
    pub message: Option<String>,
    pub description: Option<String>,
    pub reason: Option<String>,
    pub requested_fields: Option<Vec<String>>,
    pub safe_actions: Option<Vec<String>>,
    pub created_at: Option<String>,
    pub finished_at: Option<String>,
}
