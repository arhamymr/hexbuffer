// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use apprecon::{
    Database, PaginatedResponse, ProxyRecord, ProxyState, ProxyFilter, run, ProxyConfig,
    export_ca_cert_pem, TreeNode,
};
use std::sync::Mutex;
use tauri::{State, AppHandle, Manager};

#[tauri::command]
async fn start_proxy(app: AppHandle, port: u16, tls_port: u16) -> Result<String, String> {
    use std::io::Write;
    let mut file = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open("/tmp/apprecon.log")
        .map_err(|e| e.to_string())?;
    writeln!(file, "start_proxy called: port={}, tls_port={}", port, tls_port).map_err(|e| e.to_string())?;

    let handle = app.clone();
    std::thread::spawn(move || {
        let mut file = std::fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open("/tmp/apprecon.log")
            .unwrap();
        writeln!(file, "thread spawned, calling run()").unwrap();
        run(ProxyConfig { port, reuse: true, tls_port }, handle);
        writeln!(file, "run() returned").unwrap();
    });
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

#[tauri::command]
async fn get_proxy_tree(
    db: State<'_, Database>,
    filter: Option<ProxyFilter>,
) -> Result<Vec<TreeNode>, String> {
    let filter = filter.unwrap_or_default();
    db.get_tree(&filter)
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
            let app_dir = app.path().app_data_dir().expect("Failed to get app data dir");
            std::fs::create_dir_all(&app_dir).expect("Failed to create app data dir");
            let db_path = app_dir.join("apprecon.db");
            eprintln!("[main] Opening database at {:?}", db_path);
            let db = Database::new(db_path).expect("Failed to open database");
            db.init().expect("Failed to initialize database");
            eprintln!("[main] Database initialized");

            app.manage(Mutex::new(ProxyState::new()));
            app.manage(db);
            eprintln!("[main] Building Tauri app...");

            eprintln!("[main] Tauri setup complete, spawning proxy thread...");
            let handle = app.handle().clone();
            std::thread::spawn(move || {
                eprintln!("[main] Inside new thread, calling run()...");
                run(ProxyConfig { port: 8888, reuse: false, tls_port: 8889 }, handle);
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            start_proxy,
            get_proxy_all,
            get_proxy_filtered,
            get_proxy_paginated,
            clear_proxy_all,
            delete_proxy_by_id,
            get_ca_cert,
            save_ca_cert,
            get_proxy_tree
        ])
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}