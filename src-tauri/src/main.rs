// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use apprecon::{run, ProxyConfig};
use apprecon::state::PROXY_STORE;

#[tauri::command]
async fn start_proxy(port: u16) -> Result<String, String> {
    tokio::task::spawn_blocking(move || {
        run(ProxyConfig { port, reuse: true });
    });
    Ok(format!("Proxy starting on port {}", port))
}

#[tauri::command]
async fn get_proxy_all() -> Result<Vec<apprecon::state::ProxyRecord>, String> {
    let store = PROXY_STORE.clone();
    tokio::task::spawn_blocking(move || {
        let records = store.read().map_err(|e| e.to_string())?;
        Ok(records.clone())
    })
    .await
    .map_err(|e| e.to_string())?
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![start_proxy, get_proxy_all])
        .plugin(tauri_plugin_opener::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

