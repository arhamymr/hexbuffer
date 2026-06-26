use std::collections::HashMap;
use std::time::Instant;
use reqwest::Method;
use serde::{Deserialize, Serialize};
use tauri::State;

use crate::{
    HistoryBridge, StashRecord, StashEndpointRecord, ContextRecord, ChronicleLogRecord
};

#[derive(Debug, Deserialize)]
pub struct ForgeRequest {
    pub method: String,
    pub url: String,
    pub headers: HashMap<String, String>,
    pub body: String,
}

#[derive(Debug, Serialize)]
pub struct ForgeResponse {
    pub status: u16,
    pub status_text: String,
    pub headers: HashMap<String, String>,
    pub body: String,
    pub time_ms: u128,
    pub final_url: String,
}

#[tauri::command]
pub async fn send_forge_request(request: ForgeRequest) -> Result<ForgeResponse, String> {
    let method = Method::from_bytes(request.method.as_bytes())
        .map_err(|error| format!("Invalid HTTP method: {}", error))?;

    let client = reqwest::Client::builder()
        .redirect(reqwest::redirect::Policy::limited(10))
        .build()
        .map_err(|error| format!("Failed to build HTTP client: {}", error))?;

    let mut builder = client.request(method, &request.url);
    for (name, value) in &request.headers {
        builder = builder.header(name, value);
    }

    if !request.body.is_empty() {
        builder = builder.body(request.body);
    }

    let started_at = Instant::now();
    let response = builder
        .send()
        .await
        .map_err(|error| format!("Failed to send request: {}", error))?;
    let status = response.status();
    let final_url = response.url().to_string();
    let headers = response
        .headers()
        .iter()
        .map(|(name, value)| {
            (
                name.to_string(),
                value.to_str().unwrap_or_default().to_string(),
            )
        })
        .collect();
    let body = response
        .text()
        .await
        .map_err(|error| format!("Failed to read response body: {}", error))?;

    Ok(ForgeResponse {
        status: status.as_u16(),
        status_text: status.canonical_reason().unwrap_or_default().to_string(),
        headers,
        body,
        time_ms: started_at.elapsed().as_millis(),
        final_url,
    })
}

#[tauri::command]
pub async fn get_stashes(history: State<'_, HistoryBridge>) -> Result<Vec<StashRecord>, String> {
    history.get_stashes()
}

#[tauri::command]
pub async fn save_stash(history: State<'_, HistoryBridge>, record: StashRecord) -> Result<(), String> {
    history.save_stash(&record)
}

#[tauri::command]
pub async fn delete_stash(history: State<'_, HistoryBridge>, id: String) -> Result<(), String> {
    history.delete_stash(&id)
}

#[tauri::command]
pub async fn get_stash_endpoints(history: State<'_, HistoryBridge>) -> Result<Vec<StashEndpointRecord>, String> {
    history.get_stash_endpoints()
}

#[tauri::command]
pub async fn save_stash_endpoint(history: State<'_, HistoryBridge>, record: StashEndpointRecord) -> Result<(), String> {
    history.save_stash_endpoint(&record)
}

#[tauri::command]
pub async fn delete_stash_endpoint(history: State<'_, HistoryBridge>, id: String) -> Result<(), String> {
    history.delete_stash_endpoint(&id)
}

#[tauri::command]
pub async fn get_contexts(history: State<'_, HistoryBridge>) -> Result<Vec<ContextRecord>, String> {
    history.get_contexts()
}

#[tauri::command]
pub async fn save_context(history: State<'_, HistoryBridge>, record: ContextRecord) -> Result<(), String> {
    history.save_context(&record)
}

#[tauri::command]
pub async fn delete_context(history: State<'_, HistoryBridge>, id: String) -> Result<(), String> {
    history.delete_context(&id)
}

#[tauri::command]
pub async fn get_chronicle_logs(history: State<'_, HistoryBridge>, limit: u32) -> Result<Vec<ChronicleLogRecord>, String> {
    history.get_chronicle_logs(limit)
}

#[tauri::command]
pub async fn add_chronicle_log(history: State<'_, HistoryBridge>, record: ChronicleLogRecord) -> Result<(), String> {
    history.add_chronicle_log(&record)
}

#[tauri::command]
pub async fn clear_chronicle_logs(history: State<'_, HistoryBridge>) -> Result<(), String> {
    history.clear_chronicle_logs()
}
