// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::Mutex;

use apprecon::state::{ProxyRecord, ProxyState};
use apprecon::{run, ProxyConfig};
use tauri::State;

#[tauri::command]
async fn start_proxy(app: tauri::AppHandle, port: u16) -> Result<String, String> {
    let handle = app.clone();
    tokio::task::spawn_blocking(move || {
        run(ProxyConfig { port, reuse: true }, handle);
    });
    Ok(format!("Proxy starting on port {}", port))
}

#[tauri::command]
async fn get_proxy_all(state: State<'_, Mutex<ProxyState>>) -> Result<Vec<ProxyRecord>, String> {
    Ok(state.lock().unwrap().get_records())
}

fn main() {
    tauri::Builder::default()
        .manage(Mutex::new(ProxyState::new()))
        .invoke_handler(tauri::generate_handler![start_proxy, get_proxy_all])
        .plugin(tauri_plugin_opener::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}