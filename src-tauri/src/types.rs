use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DocumentRecord {
    pub id: String,
    pub name: String,
    pub title: String,
    pub sections: serde_json::Value,
    #[serde(default = "default_json_array")]
    pub custom_sections: serde_json::Value,
    #[serde(default = "default_json_array")]
    pub removed_built_in_sections: serde_json::Value,
    pub api_entries: serde_json::Value,
    pub created_at: String,
    pub updated_at: String,
}

fn default_json_array() -> serde_json::Value {
    serde_json::json!([])
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaginatedResponse<T> {
    pub data: Vec<T>,
    pub total: usize,
    pub page: u32,
    pub per_page: u32,
    pub has_more: bool,
}

/// Lightweight summary row loaded by the optimized paginated queries.
/// Skips request_body, response_body, request_headers, and response_headers BLOBs.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProxySummaryRow {
    pub id: String,
    pub timestamp: String,
    pub method: String,
    pub url: String,
    pub response_status: Option<u16>,
    pub response_status_text: Option<String>,
    pub request_body_size: usize,
    pub response_body_size: usize,
    pub server_addr: String,
    pub user_agent: Option<String>,
    pub referrer: Option<String>,
    pub response_content_type: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TreeNode {
    pub host: String,
    pub paths: Vec<TreePath>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TreePath {
    pub path: String,
    pub url: String,
    pub count: u32,
    pub methods: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StashRecord {
    pub id: String,
    pub name: String,
    pub parent_id: Option<String>,
    #[serde(default)]
    pub sort_order: Option<i32>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StashEndpointRecord {
    pub id: String,
    pub stash_id: String,
    pub name: String,
    pub method: String,
    pub url: String,
    pub headers: Option<String>, // JSON string
    pub body: Option<String>,
    pub body_type: Option<String>,
    pub pre_script: Option<String>,
    pub test_script: Option<String>,
    #[serde(default)]
    pub sort_order: Option<i32>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ContextRecord {
    pub id: String,
    pub name: String,
    pub variables: String, // JSON string
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChronicleLogRecord {
    pub id: String,
    pub timestamp: String,
    pub method: String,
    pub url: String,
    pub request_headers: Option<String>,
    pub request_body: Option<String>,
    pub response_status: Option<u16>,
    pub response_status_text: Option<String>,
    pub response_headers: Option<String>,
    pub response_body: Option<String>,
    pub duration_ms: Option<i64>,
}
