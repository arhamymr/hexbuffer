// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use apprecon::{
    ProxyRecord, ProxyState, ProxyFilter, run, ProxyConfig, PausedRequest,
};
use std::sync::Mutex;
use tauri::State;
use uuid::Uuid;

#[tauri::command]
async fn start_proxy(app: tauri::AppHandle, port: u16) -> Result<String, String> {
    let handle = app.clone();
    tokio::task::spawn_blocking(move || {
        run(ProxyConfig { port, reuse: true }, handle);
    });
    Ok(format!("Proxy starting on port {}", port))
}

#[tauri::command]
async fn clear_proxy_all(state: State<'_, Mutex<ProxyState>>) -> Result<(), String> {
    state.lock().unwrap().clear_records();
    Ok(())
}

#[tauri::command]
async fn delete_proxy_by_id(state: State<'_, Mutex<ProxyState>>, log_id: String) -> Result<Option<ProxyRecord>, String> {
    let uuid = Uuid::parse_str(&log_id).map_err(|e| e.to_string())?;
    Ok(state.lock().unwrap().delete_record(&uuid))
}

#[tauri::command]
async fn get_proxy_all(state: State<'_, Mutex<ProxyState>>) -> Result<Vec<ProxyRecord>, String> {
    Ok(state.lock().unwrap().get_records())
}

#[tauri::command]
async fn get_proxy_filtered(state: State<'_, Mutex<ProxyState>>, filter: ProxyFilter) -> Result<Vec<ProxyRecord>, String> {
    Ok(state.lock().unwrap().get_records_filtered(&filter))
}

fn main() {
    tauri::Builder::default()
        .manage(Mutex::new(ProxyState::new()))
        .invoke_handler(tauri::generate_handler![
            start_proxy,
            get_proxy_all,
            get_proxy_filtered,
            clear_proxy_all,
            delete_proxy_by_id
        ])
        .plugin(tauri_plugin_opener::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
