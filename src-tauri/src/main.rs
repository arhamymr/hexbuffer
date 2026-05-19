// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use apprecon::{
    export_ca_cert_pem, run, start_mastra_if_enabled, AiSettings, HistoryBridge,
    MastraProcessState, MastraStatus, PaginatedResponse, ProxyConfig, ProxyFilter,
    ProxyLogSummary, ProxyRecord, ProxyState, TreeNode, WebSocketConnectionDetail,
    WebSocketConnectionSummary, WebSocketFilter,
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Mutex;
use std::time::Instant;
use tauri::{AppHandle, Manager, State};

#[derive(Debug, Deserialize)]
struct RepeaterRequest {
    method: String,
    url: String,
    headers: HashMap<String, String>,
    body: String,
}

#[derive(Debug, Serialize)]
struct RepeaterResponse {
    status: u16,
    status_text: String,
    headers: HashMap<String, String>,
    body: String,
    time_ms: u128,
    final_url: String,
}

#[tauri::command]
async fn send_repeater_request(request: RepeaterRequest) -> Result<RepeaterResponse, String> {
    let method = reqwest::Method::from_bytes(request.method.as_bytes())
        .map_err(|error| format!("Invalid HTTP method: {}", error))?;

    let client = reqwest::Client::builder()
        .redirect(reqwest::redirect::Policy::limited(10))
        .build()
        .map_err(|error| format!("Failed to build HTTP client: {}", error))?;

    let mut builder = client.request(method, &request.url);
    for (name, value) in request.headers {
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

    Ok(RepeaterResponse {
        status: status.as_u16(),
        status_text: status.canonical_reason().unwrap_or_default().to_string(),
        headers,
        body,
        time_ms: started_at.elapsed().as_millis(),
        final_url,
    })
}

#[tauri::command]
async fn start_proxy(app: AppHandle, port: u16, tls_port: u16) -> Result<String, String> {
    use std::io::Write;
    let mut file = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open("/tmp/apprecon.log")
        .map_err(|e| e.to_string())?;
    writeln!(
        file,
        "start_proxy called: port={}, tls_port={}",
        port, tls_port
    )
    .map_err(|e| e.to_string())?;

    let handle = app.clone();
    std::thread::spawn(move || {
        let mut file = std::fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open("/tmp/apprecon.log")
            .unwrap();
        writeln!(file, "thread spawned, calling run()").unwrap();
        run(
            ProxyConfig {
                port,
                reuse: true,
                tls_port,
            },
            handle,
        );
        writeln!(file, "run() returned").unwrap();
    });
    Ok(format!(
        "Proxy starting on port {} (HTTP) and {} (HTTPS MITM)",
        port, tls_port
    ))
}

#[tauri::command]
async fn clear_proxy_all(history: State<'_, HistoryBridge>) -> Result<(), String> {
    history.clear_all()
}

#[tauri::command]
async fn delete_proxy_by_id(
    history: State<'_, HistoryBridge>,
    log_id: String,
) -> Result<(), String> {
    history.delete_by_id(&log_id)
}

#[tauri::command]
async fn get_proxy_all(history: State<'_, HistoryBridge>) -> Result<Vec<ProxyRecord>, String> {
    history.get_all()
}

#[tauri::command]
async fn get_proxy_filtered(
    history: State<'_, HistoryBridge>,
    filter: ProxyFilter,
) -> Result<Vec<ProxyRecord>, String> {
    history.get_filtered(filter)
}

#[tauri::command]
async fn get_proxy_paginated(
    history: State<'_, HistoryBridge>,
    page: u32,
    per_page: u32,
    filter: Option<ProxyFilter>,
    sort_order: Option<String>,
) -> Result<PaginatedResponse<ProxyLogSummary>, String> {
    history.get_paginated(page, per_page, filter, sort_order)
}

#[tauri::command]
async fn get_proxy_detail(
    history: State<'_, HistoryBridge>,
    log_id: String,
) -> Result<ProxyRecord, String> {
    history
        .get_by_id(&log_id)?
        .ok_or_else(|| format!("Log not found: {}", log_id))
}

#[tauri::command]
async fn save_ca_cert(path: String, content: String) -> Result<(), String> {
    std::fs::write(&path, &content).map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_ca_cert() -> Result<String, String> {
    let pem = export_ca_cert_pem().map_err(|e| e.to_string())?;
    String::from_utf8(pem).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_ai_settings(app: AppHandle) -> Result<AiSettings, String> {
    apprecon::ai::get_ai_settings(app)
}

#[tauri::command]
fn save_ai_settings(app: AppHandle, settings: AiSettings) -> Result<AiSettings, String> {
    apprecon::ai::save_ai_settings(app, settings)
}

#[tauri::command]
fn clear_ai_api_key(app: AppHandle) -> Result<AiSettings, String> {
    apprecon::ai::clear_ai_api_key(app)
}

#[tauri::command]
fn get_mastra_status(
    app: AppHandle,
    state: State<'_, MastraProcessState>,
) -> Result<MastraStatus, String> {
    apprecon::ai::get_mastra_status(app, state)
}

#[tauri::command]
fn start_mastra(
    app: AppHandle,
    state: State<'_, MastraProcessState>,
) -> Result<MastraStatus, String> {
    apprecon::ai::start_mastra(app, state)
}

#[tauri::command]
fn stop_mastra(
    app: AppHandle,
    state: State<'_, MastraProcessState>,
) -> Result<MastraStatus, String> {
    apprecon::ai::stop_mastra(app, state)
}

#[tauri::command]
async fn get_proxy_tree(
    history: State<'_, HistoryBridge>,
    filter: Option<ProxyFilter>,
) -> Result<Vec<TreeNode>, String> {
    history.get_tree(filter)
}

#[tauri::command]
async fn get_websocket_paginated(
    history: State<'_, HistoryBridge>,
    page: u32,
    per_page: u32,
    filter: Option<WebSocketFilter>,
) -> Result<PaginatedResponse<WebSocketConnectionSummary>, String> {
    history.get_websocket_paginated(page, per_page, filter)
}

#[tauri::command]
async fn get_websocket_detail(
    history: State<'_, HistoryBridge>,
    connection_id: String,
) -> Result<WebSocketConnectionDetail, String> {
    history
        .get_websocket_detail(&connection_id)?
        .ok_or_else(|| format!("WebSocket connection not found: {}", connection_id))
}

#[tauri::command]
async fn clear_websocket_all(history: State<'_, HistoryBridge>) -> Result<(), String> {
    history.clear_websocket_all()
}

fn main() {
    eprintln!("[main] Application starting...");

    std::panic::set_hook(Box::new(|panic_info| {
        let msg = format!("PANIC: {:?}", panic_info);
        eprintln!("{}", msg);
        let _ = std::fs::write("/tmp/apprecon_panic.log", msg);
    }));

    tauri::Builder::default()
        .setup(|app| {
            eprintln!("[main] Initializing database...");
            let app_dir = app
                .path()
                .app_data_dir()
                .expect("Failed to get app data dir");
            std::fs::create_dir_all(&app_dir).expect("Failed to create app data dir");
            let db_path = app_dir.join("apprecon.db");
            eprintln!("[main] Opening database at {:?}", db_path);
            let history = HistoryBridge::new(db_path).expect("Failed to initialize history bridge");
            eprintln!("[main] History bridge initialized");

            app.manage(Mutex::new(ProxyState::new()));
            app.manage(MastraProcessState::default());
            app.manage(history);
            eprintln!("[main] Building Tauri app...");

            if let Err(error) = start_mastra_if_enabled(&app.handle().clone()) {
                eprintln!("[main] Mastra auto-start skipped: {}", error);
            }

            eprintln!("[main] Tauri setup complete, spawning proxy thread...");
            let handle = app.handle().clone();
            std::thread::spawn(move || {
                eprintln!("[main] Inside new thread, calling run()...");
                run(
                    ProxyConfig {
                        port: 8888,
                        reuse: false,
                        tls_port: 8889,
                    },
                    handle,
                );
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            start_proxy,
            get_proxy_all,
            get_proxy_filtered,
            get_proxy_paginated,
            get_proxy_detail,
            clear_proxy_all,
            delete_proxy_by_id,
            get_ca_cert,
            save_ca_cert,
            get_proxy_tree,
            get_websocket_paginated,
            get_websocket_detail,
            clear_websocket_all,
            send_repeater_request,
            get_ai_settings,
            save_ai_settings,
            clear_ai_api_key,
            get_mastra_status,
            start_mastra,
            stop_mastra
        ])
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
