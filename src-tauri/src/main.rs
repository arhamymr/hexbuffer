// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use apprecon::{run, ProxyConfig};

#[tauri::command]
async fn start_proxy(port: u16) -> Result<String, String> {
    tokio::spawn(async move {
        run(ProxyConfig { port, reuse: true });
    });
    Ok(format!("Proxy starting on port {}", port))
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![start_proxy])
        .plugin(tauri_plugin_opener::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

