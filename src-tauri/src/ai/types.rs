use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::BTreeMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiSettings {
    pub provider: String,
    pub model: String,
    #[serde(default)]
    pub api_key: String,
    #[serde(default)]
    pub has_api_key: bool,
    #[serde(default)]
    pub provider_key_status: BTreeMap<String, bool>,
    #[serde(default)]
    pub allow_third_party_ai_sharing: bool,
}

impl Default for AiSettings {
    fn default() -> Self {
        Self {
            provider: "deepseek".to_string(),
            model: "deepseek-v4-pro".to_string(),
            api_key: String::new(),
            has_api_key: false,
            provider_key_status: default_ai_key_status(),
            allow_third_party_ai_sharing: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiChatMessage {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiChatRequest {
    pub messages: Vec<AiChatMessage>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AiChatResponse {
    pub provider: String,
    pub model: String,
    pub content: String,
    #[serde(default)]
    pub actions: Vec<AiChatAction>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AiChatAction {
    pub action: String,
    pub payload: Value,
    #[serde(default)]
    pub result: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct AiChatContext {
    pub(crate) crawl_sessions: Vec<crate::commands::browser::CrawlSession>,
    pub(crate) latest_crawl: Option<AiChatCrawlContext>,
    pub(crate) proxy_summary: Vec<crate::ProxyLogSummary>,
    pub(crate) proxy_tree: Vec<crate::TreeNode>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct AiChatCrawlContext {
    pub(crate) session: crate::commands::browser::CrawlSession,
    pub(crate) pages: Vec<crate::commands::browser::CrawlPage>,
    pub(crate) insights: Vec<crate::commands::browser::AIInsight>,
    pub(crate) logs: Vec<crate::commands::browser::ActivityLog>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatSessionRecord {
    pub id: String,
    pub title: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatMessageRecord {
    pub id: String,
    pub session_id: String,
    pub role: String,
    pub content: String,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct AiEngineChatMessage {
    #[serde(rename = "type")]
    pub(crate) message_type: String,
    pub(crate) provider: Option<String>,
    pub(crate) model: Option<String>,
    pub(crate) delta: Option<String>,
    pub(crate) content: Option<String>,
    pub(crate) message: Option<String>,
    #[serde(default)]
    pub(crate) action: Option<String>,
    #[serde(default)]
    pub(crate) payload: Option<Value>,
    #[serde(default)]
    pub(crate) created_at: Option<String>,
    // Workflow passthrough fields
    #[serde(default)]
    pub(crate) workflow_id: Option<String>,
    #[serde(default)]
    pub(crate) step_id: Option<String>,
    #[serde(default)]
    pub(crate) name: Option<String>,
    #[serde(default)]
    pub(crate) duration_ms: Option<f64>,
    #[serde(default)]
    pub(crate) error: Option<String>,
    #[serde(default)]
    pub(crate) step_index: Option<u32>,
    #[serde(default)]
    pub(crate) session_id: Option<String>,
    #[serde(default)]
    pub(crate) started_at: Option<String>,
    #[serde(default)]
    pub(crate) completed_at: Option<String>,
    #[serde(default)]
    pub(crate) failed_at: Option<String>,
    #[serde(default)]
    pub(crate) finished_at: Option<String>,
    #[serde(default)]
    pub(crate) content_length: Option<usize>,
    #[serde(default)]
    pub(crate) extra: Option<Value>,
}

fn default_ai_key_status() -> BTreeMap<String, bool> {
    use super::providers::AI_PROVIDERS;
    let mut status = BTreeMap::new();
    for provider in AI_PROVIDERS {
        status.insert(provider.to_string(), false);
    }
    status
}
