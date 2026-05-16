// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use apprecon::{
    Database, PaginatedResponse, ProxyRecord, ProxyState, ProxyFilter, run, ProxyConfig,
    export_ca_cert_pem,
};
use std::sync::Mutex;
use tauri::{State, AppHandle};

#[tauri::command]
async fn start_proxy(app: AppHandle, port: u16, tls_port: u16) -> Result<String, String> {
    eprintln!("[command] start_proxy called with port={}, tls_port={}", port, tls_port);
    let handle = app.clone();
    tokio::task::spawn_blocking(move || {
        eprintln!("[command] Inside spawn_blocking");
        run(ProxyConfig { port, reuse: true, tls_port }, handle);
    });
    eprintln!("[command] spawn_blocking returned");
    Ok(format!("Proxy starting on port {} (HTTP) and {} (HTTPS MITM)", port, tls_port))
}

#[tauri::command]
async fn clear_proxy_all(db: State<'_, Database>) -> Result<(), String> {
    db.clear_logs().map_err(|e| e.to_string())
}

#[tauri::command]
async fn delete_proxy_by_id(db: State<'_, Database>, log_id: String) -> Result<(), String> {
    db.delete_log(&log_id).map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_proxy_all(db: State<'_, Database>) -> Result<Vec<ProxyRecord>, String> {
    db.get_all().map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_proxy_filtered(db: State<'_, Database>, filter: ProxyFilter) -> Result<Vec<ProxyRecord>, String> {
    db.get_filtered(&filter).map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_proxy_paginated(
    db: State<'_, Database>,
    page: u32,
    per_page: u32,
    filter: Option<ProxyFilter>,
    sort_order: Option<String>,
) -> Result<PaginatedResponse<ProxyRecord>, String> {
    let order = sort_order.unwrap_or_else(|| "DESC".to_string());
    let order = if order.to_uppercase() == "ASC" { "ASC" } else { "DESC" };

    match filter {
        Some(f) => db.get_filtered_paginated(&f, page, per_page, order),
        None => db.get_paginated(page, per_page, order),
    }
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

fn main() {
    let db = Database::new(std::path::PathBuf::from("apprecon.db"))
        .expect("Failed to open database");
    db.init().expect("Failed to initialize database");

    tauri::Builder::default()
        .manage(Mutex::new(ProxyState::new()))
        .manage(db)
        .invoke_handler(tauri::generate_handler![
            start_proxy,
            get_proxy_all,
            get_proxy_filtered,
            get_proxy_paginated,
            clear_proxy_all,
            delete_proxy_by_id,
            get_ca_cert,
            save_ca_cert
        ])
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}