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
