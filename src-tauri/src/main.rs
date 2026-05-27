// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::Mutex;
use tauri::Manager;
use zeroxbuffer::{
    BrowserProcessState, HistoryBridge, PacketCaptureState,
    PortScanState, ProxyState, SqliScanState,
};
use zeroxbuffer::ai::MastraProcessState;
use zeroxbuffer::commands::intruder::IntruderState;

fn main() {
    eprintln!("[main] Application starting...");

    std::panic::set_hook(Box::new(|panic_info| {
        let msg = format!("PANIC: {:?}", panic_info);
        eprintln!("{}", msg);
        let _ = std::fs::write("/tmp/seven_project_panic.log", msg);
    }));

    tauri::Builder::default()
        .setup(|app| {
            eprintln!("[main] Initializing database...");
            let app_dir = app
                .path()
                .app_data_dir()
                .expect("Failed to get app data dir");
            std::fs::create_dir_all(&app_dir).expect("Failed to create app data dir");
            let db_path = app_dir.join("seven_project.db");
            eprintln!("[main] Opening database at {:?}", db_path);
            let history = HistoryBridge::new(db_path).expect("Failed to initialize history bridge");
            eprintln!("[main] History bridge initialized");

            app.manage(Mutex::new(ProxyState::new()));
            app.manage(MastraProcessState::default());
            app.manage(IntruderState::default());
            app.manage(PortScanState::default());
            app.manage(PacketCaptureState::default());
            app.manage(BrowserProcessState::default());
            app.manage(SqliScanState::new());
            app.manage(history);
            eprintln!("[main] Building Tauri app...");

            if let Err(error) = zeroxbuffer::ai::start_mastra_if_enabled(&app.handle().clone()) {
                eprintln!("[main] Mastra auto-start skipped: {}", error);
            }

            eprintln!("[main] Tauri setup complete");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            zeroxbuffer::commands::proxy::start_proxy,
            zeroxbuffer::commands::proxy::stop_proxy,
            zeroxbuffer::commands::proxy::get_proxy_status,
            zeroxbuffer::commands::intercept::get_intercept_status,
            zeroxbuffer::commands::intercept::set_intercept_enabled,
            zeroxbuffer::commands::intercept::get_paused_requests,
            zeroxbuffer::commands::intercept::forward_intercepted_request,
            zeroxbuffer::commands::intercept::drop_intercepted_request,
            zeroxbuffer::commands::intercept::open_intercept_browser,
            zeroxbuffer::commands::intercept::trust_intercept_ca,
            zeroxbuffer::commands::history::clear_proxy_all,
            zeroxbuffer::commands::history::get_documents,
            zeroxbuffer::commands::history::save_document,
            zeroxbuffer::commands::history::delete_document,
            zeroxbuffer::commands::history::delete_proxy_by_id,
            zeroxbuffer::commands::history::get_proxy_all,
            zeroxbuffer::commands::history::get_proxy_filtered,
            zeroxbuffer::commands::history::get_proxy_paginated,
            zeroxbuffer::commands::history::get_proxy_detail,
            zeroxbuffer::commands::history::get_proxy_tree,
            zeroxbuffer::commands::history::get_websocket_paginated,
            zeroxbuffer::commands::history::get_websocket_detail,
            zeroxbuffer::commands::history::clear_websocket_all,
            zeroxbuffer::commands::repeater::send_repeater_request,
            zeroxbuffer::commands::intruder::start_intruder_attack,
            zeroxbuffer::commands::intruder::stop_intruder_attack,
            zeroxbuffer::port_scanner::scan_ports,
            zeroxbuffer::port_scanner::stop_port_scan,
            zeroxbuffer::packet_capture::commands::list_capture_interfaces,
            zeroxbuffer::packet_capture::commands::configure_capture_network,
            zeroxbuffer::packet_capture::commands::prepare_packet_capture_permissions,
            zeroxbuffer::packet_capture::commands::start_packet_capture,
            zeroxbuffer::packet_capture::commands::stop_packet_capture,
            zeroxbuffer::packet_capture::commands::get_packet_capture_status,
            zeroxbuffer::ai::get_ai_settings,
            zeroxbuffer::ai::save_ai_settings,
            zeroxbuffer::ai::has_ai_api_key,
            zeroxbuffer::ai::clear_ai_api_key,
            zeroxbuffer::ai::get_mastra_status,
            zeroxbuffer::ai::start_mastra,
            zeroxbuffer::ai::stop_mastra,
            zeroxbuffer::commands::cert::get_ca_cert,
            zeroxbuffer::commands::cert::save_ca_cert,
            zeroxbuffer::browser::get_browser_status,
            zeroxbuffer::browser::browser_open,
            zeroxbuffer::browser::browser_close,
            zeroxbuffer::browser::browser_snapshot,
            zeroxbuffer::browser::browser_click,
            zeroxbuffer::browser::browser_fill,
            zeroxbuffer::browser::browser_navigate,
            zeroxbuffer::browser::browser_type,
            zeroxbuffer::browser::browser_press,
            zeroxbuffer::browser::browser_screenshot,
            zeroxbuffer::browser::browser_batch,
            zeroxbuffer::browser::browser_execute,
            zeroxbuffer::sqli::start_sqli_scan,
            zeroxbuffer::sqli::stop_sqli_scan
        ])
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
