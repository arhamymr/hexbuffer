use tauri::State;
use crate::{
    DocumentRecord, HistoryBridge, PaginatedResponse, ProxyFilter, ProxyLogSummary, ProxyRecord,
    TreeNode, WebSocketConnectionDetail, WebSocketConnectionSummary, WebSocketFilter,
};

#[tauri::command]
pub async fn clear_proxy_all(history: State<'_, HistoryBridge>) -> Result<(), String> {
    history.clear_all()
}

#[tauri::command]
pub async fn get_documents(
    history: State<'_, HistoryBridge>,
) -> Result<Vec<DocumentRecord>, String> {
    history.get_documents()
}

#[tauri::command]
pub async fn save_document(
    history: State<'_, HistoryBridge>,
    document: DocumentRecord,
) -> Result<(), String> {
    history.save_document(&document)
}

#[tauri::command]
pub async fn delete_document(
    history: State<'_, HistoryBridge>,
    document_id: String,
) -> Result<(), String> {
    history.delete_document(&document_id)
}

#[tauri::command]
pub async fn delete_proxy_by_id(
    history: State<'_, HistoryBridge>,
    log_id: String,
) -> Result<(), String> {
    history.delete_by_id(&log_id)
}

#[tauri::command]
pub async fn get_proxy_all(history: State<'_, HistoryBridge>) -> Result<Vec<ProxyRecord>, String> {
    history.get_all()
}

#[tauri::command]
pub async fn get_proxy_filtered(
    history: State<'_, HistoryBridge>,
    filter: ProxyFilter,
) -> Result<Vec<ProxyRecord>, String> {
    history.get_filtered(filter)
}

#[tauri::command]
pub async fn get_proxy_paginated(
    history: State<'_, HistoryBridge>,
    page: u32,
    per_page: u32,
    filter: Option<ProxyFilter>,
    sort_order: Option<String>,
) -> Result<PaginatedResponse<ProxyLogSummary>, String> {
    history.get_paginated(page, per_page, filter, sort_order)
}

#[tauri::command]
pub async fn get_proxy_detail(
    history: State<'_, HistoryBridge>,
    log_id: String,
) -> Result<ProxyRecord, String> {
    history
        .get_by_id(&log_id)?
        .ok_or_else(|| format!("Log not found: {}", log_id))
}

#[tauri::command]
pub async fn get_proxy_tree(
    history: State<'_, HistoryBridge>,
    filter: Option<ProxyFilter>,
) -> Result<Vec<TreeNode>, String> {
    history.get_tree(filter)
}

#[tauri::command]
pub async fn get_websocket_paginated(
    history: State<'_, HistoryBridge>,
    page: u32,
    per_page: u32,
    filter: Option<WebSocketFilter>,
) -> Result<PaginatedResponse<WebSocketConnectionSummary>, String> {
    history.get_websocket_paginated(page, per_page, filter)
}

#[tauri::command]
pub async fn get_websocket_detail(
    history: State<'_, HistoryBridge>,
    connection_id: String,
) -> Result<WebSocketConnectionDetail, String> {
    history
        .get_websocket_detail(&connection_id)?
        .ok_or_else(|| format!("WebSocket connection not found: {}", connection_id))
}

#[tauri::command]
pub async fn clear_websocket_all(history: State<'_, HistoryBridge>) -> Result<(), String> {
    history.clear_websocket_all()
}

#[tauri::command]
pub async fn delete_websocket_by_id(
    history: State<'_, HistoryBridge>,
    connection_id: String,
) -> Result<(), String> {
    history.delete_websocket_connection(&connection_id)
}
