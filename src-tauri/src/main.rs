// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::Mutex;
use tauri::Manager;
use zeroxbuffer::commands::intruder::IntruderState;
use zeroxbuffer::commands::repeater::WsRepeaterState;
use zeroxbuffer::{
    AiBrowserState, BrowserProcessState, CollaboratorPollingState, HistoryBridge,
    PacketCaptureState, PortScanState, ProxyState, SqliScanState,
};

fn main() {
    eprintln!("[main] Application starting...");

    std::panic::set_hook(Box::new(|panic_info| {
        let msg = format!("PANIC: {:?}", panic_info);
        eprintln!("{}", msg);
        let _ = std::fs::write("/tmp/0xbuffer_panic.log", msg);
    }));

    tauri::Builder::default()
        .setup(|app| {
            #[cfg(desktop)]
            app.handle()
                .plugin(tauri_plugin_updater::Builder::new().build())
                .expect("Failed to initialize updater plugin");

            eprintln!("[main] Initializing database...");
            let app_dir = app
                .path()
                .app_data_dir()
                .expect("Failed to get app data dir");
            std::fs::create_dir_all(&app_dir).expect("Failed to create app data dir");
            zeroxbuffer::proxy::https::cert::init_ca_dir(app_dir.clone());

            let db_path = app_dir.join("0xbuffer.db");
            eprintln!("[main] Opening database at {:?}", db_path);
            let history = HistoryBridge::new(db_path).expect("Failed to initialize history bridge");
            eprintln!("[main] History bridge initialized");

            app.manage(Mutex::new(ProxyState::new()));
            app.manage(IntruderState::default());
            app.manage(PortScanState::default());
            app.manage(PacketCaptureState::default());
            app.manage(BrowserProcessState::default());
            app.manage(AiBrowserState::default());
            app.manage(SqliScanState::new());
            app.manage(WsRepeaterState::default());
            app.manage(CollaboratorPollingState::default());
            app.manage(history);
            eprintln!("[main] Building Tauri app...");

            #[cfg(desktop)]
            {
                let handle = app.handle().clone();
                tauri::async_runtime::spawn(async move {
                    if let Err(e) = check_for_updates(handle).await {
                        eprintln!("[updater] startup check failed: {e}");
                    }
                });
            }

            // Show main window after setup
            if let Some(main_window) = app.get_webview_window("main") {
                main_window.show().map_err(|e| {
                    eprintln!("[main] Failed to show main window: {}", e);
                    tauri::Error::WindowNotFound
                }).ok();
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
            zeroxbuffer::commands::intercept::set_intercept_scope,
            zeroxbuffer::commands::intercept::get_paused_requests,
            zeroxbuffer::commands::intercept::forward_intercepted_request,
            zeroxbuffer::commands::intercept::forward_intercepted_response,
            zeroxbuffer::commands::intercept::drop_intercepted_request,
            zeroxbuffer::commands::intercept::forward_intercepted_tab,
            zeroxbuffer::commands::intercept::get_intercept_bypass_patterns,
            zeroxbuffer::commands::intercept::set_intercept_bypass_patterns,
            zeroxbuffer::commands::intercept::add_intercept_bypass_pattern,
            zeroxbuffer::commands::intercept::remove_intercept_bypass_pattern,
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
            zeroxbuffer::commands::history::delete_websocket_by_id,
            zeroxbuffer::commands::repeater::send_repeater_request,
            zeroxbuffer::commands::repeater::ws_repeater_connect,
            zeroxbuffer::commands::repeater::ws_repeater_send,
            zeroxbuffer::commands::repeater::ws_repeater_disconnect,
            zeroxbuffer::commands::intruder::start_intruder_attack,
            zeroxbuffer::commands::intruder::stop_intruder_attack,
            zeroxbuffer::port_scanner::scan_ports,
            zeroxbuffer::port_scanner::stop_port_scan,
            zeroxbuffer::commands::packet_capture::list_capture_interfaces,
            zeroxbuffer::commands::packet_capture::configure_capture_network,
            zeroxbuffer::commands::packet_capture::prepare_packet_capture_permissions,
            zeroxbuffer::commands::packet_capture::start_packet_capture,
            zeroxbuffer::commands::packet_capture::stop_packet_capture,
            zeroxbuffer::commands::packet_capture::get_packet_capture_status,
            zeroxbuffer::commands::packet_capture::get_packets_paginated,
            zeroxbuffer::ai::get_ai_settings,
            zeroxbuffer::ai::get_ai_key_status,
            zeroxbuffer::ai::set_ai_api_key,
            zeroxbuffer::ai::clear_ai_api_key,
            zeroxbuffer::ai::save_ai_settings,
            zeroxbuffer::ai::send_ai_chat_message,
            zeroxbuffer::commands::cert::get_ca_cert,
            zeroxbuffer::commands::cert::save_ca_cert,
            zeroxbuffer::commands::storage::get_storage_info,
            zeroxbuffer::commands::storage::clear_browser_automation_artifacts,
            zeroxbuffer::commands::storage::reset_local_data,
            zeroxbuffer::commands::browser::get_browser_status,
            zeroxbuffer::commands::browser::browser_open,
            zeroxbuffer::commands::browser::browser_close,
            zeroxbuffer::commands::browser::browser_snapshot,
            zeroxbuffer::commands::browser::browser_click,
            zeroxbuffer::commands::browser::browser_fill,
            zeroxbuffer::commands::browser::browser_navigate,
            zeroxbuffer::commands::browser::browser_type,
            zeroxbuffer::commands::browser::browser_press,
            zeroxbuffer::commands::browser::browser_screenshot,
            zeroxbuffer::commands::browser::browser_batch,
            zeroxbuffer::commands::browser::browser_execute,
            zeroxbuffer::commands::browser::ai_browser_start_crawl,
            zeroxbuffer::commands::browser::ai_browser_pause_crawl,
            zeroxbuffer::commands::browser::ai_browser_resume_crawl,
            zeroxbuffer::commands::browser::ai_browser_stop_crawl,
            zeroxbuffer::commands::browser::ai_browser_submit_human_input,
            zeroxbuffer::commands::browser::delete_ai_browser_session,
            zeroxbuffer::commands::browser::get_ai_browser_session,
            zeroxbuffer::commands::browser::list_ai_browser_pages,
            zeroxbuffer::commands::browser::list_ai_browser_insights,
            zeroxbuffer::commands::browser::list_ai_browser_logs,
            zeroxbuffer::commands::browser::list_recent_ai_browser_sessions,
            zeroxbuffer::sqli::start_sqli_scan,
            zeroxbuffer::sqli::stop_sqli_scan,
            zeroxbuffer::commands::collaborator::list_collaborator_servers,
            zeroxbuffer::commands::collaborator::add_collaborator_server,
            zeroxbuffer::commands::collaborator::update_collaborator_server,
            zeroxbuffer::commands::collaborator::delete_collaborator_server,
            zeroxbuffer::commands::collaborator::check_collaborator_server_health,
            zeroxbuffer::commands::collaborator::create_collaborator_payload,
            zeroxbuffer::commands::collaborator::list_collaborator_payloads,
            zeroxbuffer::commands::collaborator::delete_collaborator_payload,
            zeroxbuffer::commands::collaborator::archive_collaborator_payload,
            zeroxbuffer::commands::collaborator::list_collaborator_interactions,
            zeroxbuffer::commands::collaborator::get_collaborator_interaction,
            zeroxbuffer::commands::collaborator::poll_collaborator_interactions,
            zeroxbuffer::commands::collaborator::get_collaborator_dashboard_stats,
            zeroxbuffer::commands::license::activate_license,
            zeroxbuffer::commands::license::verify_license,
            zeroxbuffer::commands::license::deactivate_license,
            zeroxbuffer::commands::chat_sessions::create_chat_session,
            zeroxbuffer::commands::chat_sessions::list_chat_sessions,
            zeroxbuffer::commands::chat_sessions::rename_chat_session,
            zeroxbuffer::commands::chat_sessions::delete_chat_session,
            zeroxbuffer::commands::chat_sessions::get_chat_messages,
            zeroxbuffer::commands::chat_sessions::save_chat_messages,
            zeroxbuffer::commands::terminal::get_default_shell,
            zeroxbuffer::commands::terminal::get_home_directory,
            show_main_window
        ])
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_pty::init())
        .plugin(tauri_plugin_notification::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(desktop)]
async fn check_for_updates(app: tauri::AppHandle) -> tauri_plugin_updater::Result<()> {
    use tauri_plugin_updater::UpdaterExt;

    if let Some(update) = app.updater()?.check().await? {
        eprintln!(
            "[updater] update {} available (current: {})",
            update.version, update.current_version
        );

        let mut downloaded = 0;
        update
            .download_and_install(
                |chunk_length, content_length| {
                    downloaded += chunk_length;
                    if let Some(total) = content_length {
                        eprintln!("[updater] downloaded {downloaded} / {total}");
                    } else {
                        eprintln!("[updater] downloaded {downloaded}");
                    }
                },
                || {
                    eprintln!("[updater] download finished");
                },
            )
            .await?;

        eprintln!("[updater] update installed, restarting");
        app.restart();
    } else {
        eprintln!("[updater] no update available");
    }

    Ok(())
}

#[tauri::command]
fn show_main_window(app: tauri::AppHandle) -> Result<(), String> {
    // Close splashscreen if it exists
    if let Some(splash_window) = app.get_webview_window("splashscreen") {
        splash_window.close().map_err(|error| error.to_string())?;
    }

    // Show and focus main window
    let main_window = app
        .get_webview_window("main")
        .ok_or_else(|| "main window was not found".to_string())?;

    main_window.show().map_err(|error| error.to_string())?;
    main_window.set_focus().map_err(|error| error.to_string())?;

    Ok(())
}
