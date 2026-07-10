// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod app_commands;
mod setup;
mod tray;

use tauri::Manager;

/// Append a timestamped line to both stderr and /tmp/hexbuffer.log
pub(crate) fn log(msg: &str) {
    let ts = chrono::Local::now().format("%Y-%m-%d %H:%M:%S%.3f");
    let line = format!("[{ts}] {msg}");
    eprintln!("{line}");
    let _ = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open("/tmp/hexbuffer.log")
        .and_then(|mut f| std::io::Write::write_all(&mut f, format!("{line}\n").as_bytes()));
}

fn main() {
    // Start a fresh log file on each launch
    let _ = std::fs::write("/tmp/hexbuffer.log", "");
    log("Application starting...");

    std::panic::set_hook(Box::new(|panic_info| {
        let msg = format!("PANIC: {:?}", panic_info);
        log(&msg);
        let _ = std::fs::write("/tmp/hexbuffer_panic.log", &msg);
    }));

    tauri::Builder::default()
        .setup(|app| {
            setup::init(app)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            hexbuffer::commands::proxy::start_proxy,
            hexbuffer::commands::proxy::stop_proxy,
            hexbuffer::commands::proxy::get_proxy_status,
            hexbuffer::automation::automation_sync_workflows,
            hexbuffer::automation::automation_update_settings,
            hexbuffer::automation::automation_run_workflow,
            hexbuffer::automation::automation_abort_workflow,
            hexbuffer::automation::automation_pause_workflow,
            hexbuffer::automation::automation_resume_workflow,
            hexbuffer::automation::automation_clear_logs,
            hexbuffer::automation::automation_clear_host_insights,
            hexbuffer::automation::automation_ack_host_insight_batch,
            hexbuffer::commands::intercept::get_intercept_status,
            hexbuffer::commands::intercept::set_intercept_enabled,
            hexbuffer::commands::intercept::set_intercept_scope,
            hexbuffer::commands::intercept::get_paused_requests,
            hexbuffer::commands::intercept::forward_intercepted_request,
            hexbuffer::commands::intercept::forward_intercepted_response,
            hexbuffer::commands::intercept::drop_intercepted_request,
            hexbuffer::commands::intercept::forward_intercepted_tab,
            hexbuffer::commands::intercept::get_intercept_bypass_patterns,
            hexbuffer::commands::intercept::set_intercept_bypass_patterns,
            hexbuffer::commands::intercept::add_intercept_bypass_pattern,
            hexbuffer::commands::intercept::remove_intercept_bypass_pattern,
            hexbuffer::commands::intercept::open_intercept_browser,
            hexbuffer::commands::intercept::trust_intercept_ca,
            hexbuffer::commands::history::clear_proxy_all,
            hexbuffer::commands::history::get_documents,
            hexbuffer::commands::history::save_document,
            hexbuffer::commands::history::delete_document,
            hexbuffer::commands::history::delete_proxy_by_id,
            hexbuffer::commands::history::get_proxy_all,
            hexbuffer::commands::history::get_proxy_filtered,
            hexbuffer::commands::history::get_proxy_paginated,
            hexbuffer::commands::history::get_proxy_detail,
            hexbuffer::commands::history::get_proxy_tree,
            hexbuffer::commands::history::get_websocket_paginated,
            hexbuffer::commands::history::get_websocket_detail,
            hexbuffer::commands::history::clear_websocket_all,
            hexbuffer::commands::history::delete_websocket_by_id,
            hexbuffer::commands::repeater::send_repeater_request,
            hexbuffer::commands::repeater::ws_repeater_connect,
            hexbuffer::commands::repeater::ws_repeater_send,
            hexbuffer::commands::repeater::ws_repeater_disconnect,
            hexbuffer::commands::api_collection::send_forge_request,
            hexbuffer::commands::api_collection::get_stashes,
            hexbuffer::commands::api_collection::save_stash,
            hexbuffer::commands::api_collection::delete_stash,
            hexbuffer::commands::api_collection::get_stash_endpoints,
            hexbuffer::commands::api_collection::save_stash_endpoint,
            hexbuffer::commands::api_collection::delete_stash_endpoint,
            hexbuffer::commands::api_collection::get_contexts,
            hexbuffer::commands::api_collection::save_context,
            hexbuffer::commands::api_collection::delete_context,
            hexbuffer::commands::api_collection::get_chronicle_logs,
            hexbuffer::commands::api_collection::add_chronicle_log,
            hexbuffer::commands::api_collection::clear_chronicle_logs,
            hexbuffer::commands::invoker::start_invoker_attack,
            hexbuffer::commands::invoker::stop_invoker_attack,
            hexbuffer::port_scanner::scan_ports,
            hexbuffer::port_scanner::stop_port_scan,
            hexbuffer::ai::get_ai_settings,
            hexbuffer::ai::get_ai_key_status,
            hexbuffer::ai::set_ai_api_key,
            hexbuffer::ai::clear_ai_api_key,
            hexbuffer::ai::save_ai_settings,
            hexbuffer::ai::send_ai_chat_message,
            hexbuffer::ai::suggest_invoker_markers,
            hexbuffer::commands::cert::get_ca_cert,
            hexbuffer::commands::cert::save_ca_cert,
            hexbuffer::commands::cert::regenerate_ca_cert,
            hexbuffer::commands::storage::get_storage_info,
            hexbuffer::commands::storage::clear_browser_automation_artifacts,
            hexbuffer::commands::storage::reset_local_data,
            hexbuffer::commands::storage::reset_database,
            hexbuffer::commands::storage::reset_all_app_data,
            hexbuffer::commands::browser::get_browser_status,
            hexbuffer::commands::browser::browser_open,
            hexbuffer::commands::browser::browser_close,
            hexbuffer::commands::browser::browser_snapshot,
            hexbuffer::commands::browser::browser_click,
            hexbuffer::commands::browser::browser_fill,
            hexbuffer::commands::browser::browser_navigate,
            hexbuffer::commands::browser::browser_type,
            hexbuffer::commands::browser::browser_press,
            hexbuffer::commands::browser::browser_screenshot,
            hexbuffer::commands::browser::browser_batch,
            hexbuffer::commands::browser::browser_execute,
            hexbuffer::commands::browser::ai_browser_start_crawl,
            hexbuffer::commands::browser::ai_browser_pause_crawl,
            hexbuffer::commands::browser::ai_browser_resume_crawl,
            hexbuffer::commands::browser::ai_browser_stop_crawl,
            hexbuffer::commands::browser::ai_browser_submit_human_input,
            hexbuffer::commands::browser::delete_ai_browser_session,
            hexbuffer::commands::browser::get_ai_browser_session,
            hexbuffer::commands::browser::list_ai_browser_pages,
            hexbuffer::commands::browser::list_ai_browser_insights,
            hexbuffer::commands::browser::list_ai_browser_logs,
            hexbuffer::commands::browser::list_recent_ai_browser_sessions,
            hexbuffer::sqli::start_sqli_scan,
            hexbuffer::sqli::stop_sqli_scan,
            hexbuffer::commands::collaborator::list_collaborator_servers,
            hexbuffer::commands::collaborator::add_collaborator_server,
            hexbuffer::commands::collaborator::update_collaborator_server,
            hexbuffer::commands::collaborator::delete_collaborator_server,
            hexbuffer::commands::collaborator::check_collaborator_server_health,
            hexbuffer::commands::collaborator::create_collaborator_payload,
            hexbuffer::commands::collaborator::list_collaborator_payloads,
            hexbuffer::commands::collaborator::delete_collaborator_payload,
            hexbuffer::commands::collaborator::archive_collaborator_payload,
            hexbuffer::commands::collaborator::list_collaborator_interactions,
            hexbuffer::commands::collaborator::get_collaborator_interaction,
            hexbuffer::commands::collaborator::poll_collaborator_interactions,
            hexbuffer::commands::collaborator::get_collaborator_dashboard_stats,
            hexbuffer::commands::license::activate_license,
            hexbuffer::commands::license::verify_license,
            hexbuffer::commands::license::deactivate_license,
            hexbuffer::commands::chat_sessions::create_chat_session,
            hexbuffer::commands::chat_sessions::list_chat_sessions,
            hexbuffer::commands::chat_sessions::rename_chat_session,
            hexbuffer::commands::chat_sessions::delete_chat_session,
            hexbuffer::commands::chat_sessions::get_chat_messages,
            hexbuffer::commands::chat_sessions::save_chat_messages,
            // Regression testing
            hexbuffer::commands::regression::run_regression_test,
            hexbuffer::commands::regression::list_regression_test_cases,
            hexbuffer::commands::regression::save_regression_test_case,
            hexbuffer::commands::regression::delete_regression_test_case,
            hexbuffer::commands::regression::list_regression_runs,
            hexbuffer::commands::regression::scrape_page_for_steps,
            hexbuffer::commands::regression::run_regression_step,
            hexbuffer::commands::regression::abort_regression_test,
            // ponytail: register MockForge commands
            hexbuffer::commands::mock_forge::mock_forge_get_domains,
            hexbuffer::commands::mock_forge::mock_forge_add_domain,
            hexbuffer::commands::mock_forge::mock_forge_delete_domain,
            hexbuffer::commands::mock_forge::mock_forge_toggle_domain,
            hexbuffer::commands::mock_forge::mock_forge_get_routes,
            hexbuffer::commands::mock_forge::mock_forge_add_route,
            hexbuffer::commands::mock_forge::mock_forge_update_route,
            hexbuffer::commands::mock_forge::mock_forge_delete_route,
            hexbuffer::commands::mock_forge::mock_forge_get_logs,
            hexbuffer::commands::mock_forge::mock_forge_clear_logs,
            app_commands::show_main_window,
            app_commands::safe_start_dragging,
            app_commands::get_cdp_targets,
            app_commands::open_cdp_browser,
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
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                // Only run close cleanup when the window is actually visible.
                // Spurious CloseRequested events can fire during startup before the
                // window is shown.
                if !window.is_visible().unwrap_or(true) {
                    return;
                }

                if let Some(state) = window.try_state::<hexbuffer::AiBrowserState>() {
                    hexbuffer::stop_all_active_crawls(window.app_handle(), state.inner());
                }

                if let Some(state) = window.try_state::<hexbuffer::BrowserProcessState>() {
                    if let Err(error) = hexbuffer::stop_browser_process(state.inner()) {
                        eprintln!("[main] Failed to stop browser process on close: {}", error);
                    }
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
