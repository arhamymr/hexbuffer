use std::path::PathBuf;

use crate::{
    db::repository::{Database, DocumentRecord, PaginatedResponse, TreeNode},
    proxy::state::{
        ProxyFilter, ProxyRecord, WebSocketConnectionRecord, WebSocketFilter,
        WebSocketMessageRecord,
    },
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProxyLogSummary {
    pub id: String,
    pub timestamp: String,
    pub method: String,
    pub url: String,
    pub response_status: Option<u16>,
    pub response_status_text: Option<String>,
    pub response_content_type: Option<String>,
    pub request_body_size: usize,
    pub response_body_size: usize,
    pub server_addr: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebSocketConnectionSummary {
    pub id: String,
    pub timestamp: String,
    pub url: String,
    pub host: String,
    pub path: String,
    pub state: String,
    pub message_count: u32,
    pub last_activity_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebSocketConnectionDetail {
    pub connection: WebSocketConnectionRecord,
    pub messages: Vec<WebSocketMessageRecord>,
}

pub struct HistoryBridge {
    db: Database,
}

impl HistoryBridge {
    pub fn new(path: PathBuf) -> Result<Self, String> {
        let db = Database::new(path).map_err(|e| e.to_string())?;
        db.init().map_err(|e| e.to_string())?;
        Ok(Self { db })
    }

    pub fn insert_record(&self, record: &ProxyRecord) -> Result<(), String> {
        self.db.insert_log(record).map_err(|e| e.to_string())
    }

    pub fn get_documents(&self) -> Result<Vec<DocumentRecord>, String> {
        self.db.get_documents().map_err(|e| e.to_string())
    }

    pub fn save_document(&self, document: &DocumentRecord) -> Result<(), String> {
        self.db.upsert_document(document).map_err(|e| e.to_string())
    }

    pub fn delete_document(&self, document_id: &str) -> Result<(), String> {
        self.db
            .delete_document(document_id)
            .map_err(|e| e.to_string())
    }

    pub fn clear_all(&self) -> Result<(), String> {
        self.db.clear_logs().map_err(|e| e.to_string())
    }

    pub fn delete_by_id(&self, log_id: &str) -> Result<(), String> {
        self.db.delete_log(log_id).map_err(|e| e.to_string())
    }

    pub fn get_all(&self) -> Result<Vec<ProxyRecord>, String> {
        self.db.get_all().map_err(|e| e.to_string())
    }

    pub fn get_by_id(&self, log_id: &str) -> Result<Option<ProxyRecord>, String> {
        self.db.get_by_id(log_id).map_err(|e| e.to_string())
    }

    pub fn get_filtered(&self, filter: ProxyFilter) -> Result<Vec<ProxyRecord>, String> {
        let filter = self.normalize_filter(filter);

        if self.has_active_filters(&filter) {
            self.db.get_filtered(&filter).map_err(|e| e.to_string())
        } else {
            self.db.get_all().map_err(|e| e.to_string())
        }
    }

    pub fn get_paginated(
        &self,
        page: u32,
        per_page: u32,
        filter: Option<ProxyFilter>,
        sort_order: Option<String>,
    ) -> Result<PaginatedResponse<ProxyLogSummary>, String> {
        let filter = filter.map(|f| self.normalize_filter(f));
        let sort_order = self.normalize_sort_order(sort_order.as_deref());

        let result = match filter {
            Some(filter) if self.has_active_filters(&filter) => self
                .db
                .get_filtered_paginated(&filter, page, per_page, sort_order),
            _ => self.db.get_paginated(page, per_page, sort_order),
        }?;

        Ok(PaginatedResponse {
            data: result.data.into_iter().map(ProxyLogSummary::from).collect(),
            total: result.total,
            page: result.page,
            per_page: result.per_page,
            has_more: result.has_more,
        })
    }

    pub fn get_tree(&self, filter: Option<ProxyFilter>) -> Result<Vec<TreeNode>, String> {
        let filter = self.normalize_filter(filter.unwrap_or_default());
        self.db.get_tree(&filter)
    }

    pub fn insert_websocket_connection(
        &self,
        record: &WebSocketConnectionRecord,
    ) -> Result<(), String> {
        self.db
            .insert_websocket_connection(record)
            .map_err(|e| e.to_string())
    }

    pub fn insert_websocket_message(&self, record: &WebSocketMessageRecord) -> Result<(), String> {
        self.db
            .insert_websocket_message(record)
            .map_err(|e| e.to_string())
    }

    pub fn clear_websocket_all(&self) -> Result<(), String> {
        self.db.clear_websocket_logs().map_err(|e| e.to_string())
    }

    pub fn get_websocket_paginated(
        &self,
        page: u32,
        per_page: u32,
        filter: Option<WebSocketFilter>,
    ) -> Result<PaginatedResponse<WebSocketConnectionSummary>, String> {
        let filter = filter.map(|value| self.normalize_websocket_filter(value));

        let result = self
            .db
            .get_websocket_paginated(filter.as_ref(), page, per_page)?;

        Ok(PaginatedResponse {
            data: result
                .data
                .into_iter()
                .map(WebSocketConnectionSummary::from)
                .collect(),
            total: result.total,
            page: result.page,
            per_page: result.per_page,
            has_more: result.has_more,
        })
    }

    pub fn get_websocket_detail(
        &self,
        connection_id: &str,
    ) -> Result<Option<WebSocketConnectionDetail>, String> {
        let connection = match self.db.get_websocket_by_id(connection_id)? {
            Some(connection) => connection,
            None => return Ok(None),
        };

        let messages = self
            .db
            .get_websocket_messages_by_connection_id(connection_id)?;

        Ok(Some(WebSocketConnectionDetail {
            connection,
            messages,
        }))
    }

    fn normalize_sort_order(&self, sort_order: Option<&str>) -> &str {
        match sort_order.unwrap_or("DESC").to_uppercase().as_str() {
            "ASC" => "ASC",
            _ => "DESC",
        }
    }

    fn normalize_filter(&self, filter: ProxyFilter) -> ProxyFilter {
        ProxyFilter {
            search: normalize_optional_string(filter.search),
            path: normalize_optional_string(filter.path),
            methods: normalize_string_vec(filter.methods),
            status_codes: normalize_u16_vec(filter.status_codes),
            scope: normalize_string_vec(filter.scope),
        }
    }

    fn has_active_filters(&self, filter: &ProxyFilter) -> bool {
        filter.search.is_some()
            || filter.path.is_some()
            || filter.methods.is_some()
            || filter.status_codes.is_some()
            || filter.scope.is_some()
    }

    fn normalize_websocket_filter(&self, filter: WebSocketFilter) -> WebSocketFilter {
        WebSocketFilter {
            search: normalize_optional_string(filter.search),
            scope: normalize_string_vec(filter.scope),
            states: normalize_string_vec(filter.states),
        }
    }
}

fn normalize_optional_string(value: Option<String>) -> Option<String> {
    value.and_then(|v| {
        let trimmed = v.trim();
        if trimmed.is_empty() {
            None
        } else {
            Some(trimmed.to_string())
        }
    })
}

fn normalize_string_vec(values: Option<Vec<String>>) -> Option<Vec<String>> {
    values.and_then(|items| {
        let normalized: Vec<String> = items
            .into_iter()
            .map(|item| item.trim().to_string())
            .filter(|item| !item.is_empty())
            .collect();

        if normalized.is_empty() {
            None
        } else {
            Some(normalized)
        }
    })
}

fn normalize_u16_vec(values: Option<Vec<u16>>) -> Option<Vec<u16>> {
    values.and_then(|items| if items.is_empty() { None } else { Some(items) })
}

impl From<ProxyRecord> for ProxyLogSummary {
    fn from(record: ProxyRecord) -> Self {
        let response_content_type = record
            .response
            .as_ref()
            .and_then(|response| response.headers.get("content-type").cloned());

        let response_body_size = record
            .response
            .as_ref()
            .map(|response| response.body.len())
            .unwrap_or(0);

        let response_status = record
            .response
            .as_ref()
            .map(|response| response.status_code);
        let response_status_text = record
            .response
            .as_ref()
            .map(|response| response.status_text.clone());

        Self {
            id: record.id.to_string(),
            timestamp: record.timestamp.to_rfc3339(),
            method: record.request.method,
            url: record.request.uri,
            response_status,
            response_status_text,
            response_content_type,
            request_body_size: record.request.body.len(),
            response_body_size,
            server_addr: record.server_addr,
        }
    }
}

impl From<WebSocketConnectionRecord> for WebSocketConnectionSummary {
    fn from(record: WebSocketConnectionRecord) -> Self {
        Self {
            id: record.id.to_string(),
            timestamp: record.timestamp.to_rfc3339(),
            url: record.url,
            host: record.host,
            path: record.path,
            state: format!("{:?}", record.state).to_lowercase(),
            message_count: record.message_count,
            last_activity_at: record.last_activity_at.to_rfc3339(),
        }
    }
}
