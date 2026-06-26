// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::Arc;
use std::sync::Mutex;
use tauri::{
    menu::{Menu, MenuItem, Submenu},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager,
};
use hexbuffer::commands::browser_panel::BrowserTabManager;
use hexbuffer::commands::intruder::IntruderState;
use hexbuffer::commands::repeater::WsRepeaterState;
use hexbuffer::commands::threats::ThreatAnalysisState;
use hexbuffer::{
    AiBrowserState, BrowserProcessState, CollaboratorPollingState, HistoryBridge,
    PortScanState, ProxyState, SqliScanState,
};

/// Append a timestamped line to both stderr and /tmp/hexbuffer.log
fn log(msg: &str) {
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
            #[cfg(desktop)]
            app.handle()
                .plugin(tauri_plugin_updater::Builder::new().build())
                .expect("Failed to initialize updater plugin");

            log("Initializing database...");
            let app_dir = app
                .path()
                .app_data_dir()
                .expect("Failed to get app data dir");
            std::fs::create_dir_all(&app_dir).expect("Failed to create app data dir");
            hexbuffer::proxy::https::cert::init_ca_dir(app_dir.clone());

            let db_path = app_dir.join("hexbuffer.db");
            log(&format!("Opening database at {:?}", db_path));
            let database = hexbuffer::db::repository::Database::new(db_path.clone())
                .expect("Failed to initialize database");
            database.init().expect("Failed to initialize database schema");
            let history = HistoryBridge::new(db_path).expect("Failed to initialize history bridge");
            log("History bridge initialized");

            app.manage(Mutex::new(ProxyState::new()));
            app.manage(IntruderState::default());
            app.manage(PortScanState::default());
            app.manage(BrowserProcessState::default());
            app.manage(AiBrowserState::default());
            app.manage(SqliScanState::new());
            app.manage(WsRepeaterState::default());
            app.manage(ThreatAnalysisState::default());
            app.manage(CollaboratorPollingState::default());
            app.manage(hexbuffer::automation::AutomationRuntimeState::default());
            app.manage(hexbuffer::commands::audit::AuditState::new());
            app.manage(hexbuffer::commands::inspector::InspectorCdpState::default());
            app.manage(Arc::new(BrowserTabManager::new(app.handle().clone())));
            app.manage(database);
            app.manage(history);
            // Start the LSP Server — prefer the bundled rust-analyzer sidecar binary.
            // Tauri places externalBin sidecars next to the app executable.
            let (port_tx, port_rx) = tokio::sync::oneshot::channel();
            {
                let ext = if cfg!(windows) { ".exe" } else { "" };
                let bundled_ra = std::env::current_exe()
                    .ok()
                    .and_then(|exe| exe.parent().map(|dir| {
                        dir.join(format!("rust-analyzer{}", ext))
                    }));
                tauri::async_runtime::spawn(async move {
                    hexbuffer::commands::lsp::run_lsp_server(port_tx, bundled_ra).await;
                });
            }
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                if let Ok(port) = port_rx.await {
                    if let Some(state) = app_handle.try_state::<hexbuffer::commands::lsp::LspState>() {
                        if let Ok(mut port_lock) = state.port.lock() {
                            *port_lock = Some(port);
                        }
                    }
                }
            });
            app.manage(hexbuffer::commands::lsp::LspState {
                port: Mutex::new(None),
            });

            log("Building Tauri app...");

            #[cfg(desktop)]
            {
                let handle = app.handle().clone();
                tauri::async_runtime::spawn(async move {
                    if let Err(e) = check_for_updates(handle).await {
                        log(&format!("[updater] startup check failed: {e}"));
                    }
                });
            }

            // Fallback: if React fails to mount and call show_main_window,
            // auto-dismiss the splash after 10 seconds to prevent the app from
            // getting stuck on the splash screen in production builds.
            {
                let handle = app.handle().clone();
                tauri::async_runtime::spawn(async move {
                    tokio::time::sleep(std::time::Duration::from_secs(10)).await;
                    if let Some(splash) = handle.get_webview_window("splashscreen") {
                        log("Splash fallback timer fired — closing splash");
                        let _ = splash.close();
                    }
                    if let Some(main_window) = handle.get_webview_window("main") {
                        let _ = main_window.show();
                        let _ = main_window.set_focus();
                        log("Splash fallback: main window shown");
                    }
                });
            }

            // System tray icon + menu
            {
                let icon = app.default_window_icon().cloned();

                let assistant_i = MenuItem::with_id(app, "nav:/", "Assistant", true, None::<&str>)?;
                let live_traffic_i = MenuItem::with_id(app, "nav:/live-traffic", "Live Traffic", true, None::<&str>)?;
                let browser_i = MenuItem::with_id(app, "nav:/browser-automation", "Browser", true, None::<&str>)?;
                let intercept_i = MenuItem::with_id(app, "nav:/intercept", "Intercept", true, None::<&str>)?;
                let invoker_i = MenuItem::with_id(app, "nav:/invoker", "Invoker", true, None::<&str>)?;
                let repeater_i = MenuItem::with_id(app, "nav:/repeater", "Repeater", true, None::<&str>)?;
                let code_audit_i = MenuItem::with_id(app, "nav:/code-audit", "Code Audit", true, None::<&str>)?;
                let documents_i = MenuItem::with_id(app, "nav:/documents", "Documents", true, None::<&str>)?;
                let tools_i = MenuItem::with_id(app, "nav:/tools", "Tools", true, None::<&str>)?;
                let features_menu = Submenu::with_items(
                    app,
                    "Features",
                    true,
                    &[&assistant_i, &live_traffic_i, &browser_i, &intercept_i, &invoker_i, &repeater_i, &code_audit_i, &documents_i, &tools_i],
                )?;

                let settings_i = MenuItem::with_id(app, "nav:/settings", "Settings", true, None::<&str>)?;
                let show_i =
                    MenuItem::with_id(app, "show", "Show", true, None::<&str>)?;
                let quit_i =
                    MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
                let menu = Menu::with_items(app, &[&features_menu, &settings_i, &show_i, &quit_i])?;

                let handle = app.handle().clone();
                TrayIconBuilder::new()
                    .menu(&menu)
                    .on_menu_event(move |app, event| match event.id.as_ref() {
                        "show" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.unminimize();
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                        "quit" => {
                            log("Quit via tray menu");
                            app.exit(0);
                        }
                        id if id.starts_with("nav:") => {
                            let path = &id[4..]; // strip "nav:" prefix
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.unminimize();
                                let _ = window.show();
                                let _ = window.set_focus();
                                let js = format!("window.location.href = '{}'", path);
                                let _ = window.eval(&js);
                            }
                        }
                        _ => {}
                    })
                    .on_tray_icon_event(move |_tray, event| match event {
                        TrayIconEvent::Click {
                            button: MouseButton::Left,
                            button_state: MouseButtonState::Up,
                            ..
                        } => {
                            if let Some(window) = handle.get_webview_window("main") {
                                let _ = window.unminimize();
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                        _ => {}
                    })
                    .icon(
                        icon.expect("default window icon must be set in tauri.conf.json"),
                    )
                    .build(app)?;
                log("System tray icon created");
            }

            log("Tauri setup complete");
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
            hexbuffer::commands::inspector::open_inspector_browser,
            hexbuffer::commands::inspector::connect_inspector_cdp,
            hexbuffer::commands::inspector::disconnect_inspector_cdp,
            hexbuffer::commands::inspector::get_inspector_pages,
            hexbuffer::commands::inspector::get_inspector_cookies,
            hexbuffer::commands::inspector::get_inspector_storage,
            hexbuffer::commands::inspector::reset_inspector_browser,
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
            hexbuffer::commands::intruder::start_intruder_attack,

            hexbuffer::commands::intruder::stop_intruder_attack,
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
            hexbuffer::commands::storage::get_storage_info,
            hexbuffer::commands::storage::clear_browser_automation_artifacts,
            hexbuffer::commands::storage::reset_local_data,
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
            hexbuffer::commands::terminal::get_default_shell,
            hexbuffer::commands::terminal::get_home_directory,
            hexbuffer::commands::threats::get_threats_settings,
            hexbuffer::commands::threats::save_threats_settings,
            hexbuffer::commands::threats::validate_ghidra_headless,
            hexbuffer::commands::threats::import_yara_rule_pack,
            hexbuffer::commands::threats::update_yara_rule_pack,
            hexbuffer::commands::threats::delete_yara_rule_pack,
            hexbuffer::commands::threats::import_threat_sample,
            hexbuffer::commands::threats::start_threat_analysis,
            hexbuffer::commands::threats::get_threat_analysis,
            hexbuffer::commands::threats::list_threat_samples,
            hexbuffer::commands::threats::delete_threat_sample,
            hexbuffer::commands::threats::cancel_threat_analysis,
            // Audit
            hexbuffer::commands::audit::audit_directory,
            hexbuffer::commands::audit::stop_audit,
            hexbuffer::commands::audit::generate_audit_report,
            // Playground
            hexbuffer::commands::playground::check_compilers,
            hexbuffer::commands::playground::get_system_info,
            hexbuffer::commands::playground::create_project,
            hexbuffer::commands::playground::list_projects,
            hexbuffer::commands::playground::list_project_files,
            hexbuffer::commands::playground::read_project_file,
            hexbuffer::commands::playground::write_project_file,
            hexbuffer::commands::playground::delete_project_file,
            hexbuffer::commands::playground::rename_project_file,
            hexbuffer::commands::playground::create_directory,
            hexbuffer::commands::playground::run_build_command,
            // Regression testing
            hexbuffer::commands::regression::run_regression_test,
            hexbuffer::commands::regression::list_regression_test_cases,
            hexbuffer::commands::regression::save_regression_test_case,
            hexbuffer::commands::regression::delete_regression_test_case,
            hexbuffer::commands::regression::list_regression_runs,
            hexbuffer::commands::regression::scrape_page_for_steps,
            hexbuffer::commands::regression::run_regression_step,
            // Browser panel (embedded webview)
            hexbuffer::commands::browser_panel::browser_tab_create,
            hexbuffer::commands::browser_panel::browser_tab_navigate,
            hexbuffer::commands::browser_panel::browser_tab_resize,
            hexbuffer::commands::browser_panel::browser_tab_show,
            hexbuffer::commands::browser_panel::browser_tab_hide,
            hexbuffer::commands::browser_panel::browser_tab_destroy,
            hexbuffer::commands::browser_panel::browser_tab_go_back,
            hexbuffer::commands::browser_panel::browser_tab_go_forward,
            hexbuffer::commands::browser_panel::browser_tab_reload,
            hexbuffer::commands::browser_panel::browser_tab_inject_annotation,
            hexbuffer::commands::browser_panel::browser_tab_remove_annotation_overlay,
            hexbuffer::commands::browser_panel::browser_tab_inject_annotation_markers,
            hexbuffer::commands::browser_panel::browser_tab_update_annotation_marker_selection,
            hexbuffer::commands::browser_panel::browser_tab_report_url,
            hexbuffer::commands::browser_panel::browser_tab_report_loaded,
            hexbuffer::commands::browser_panel::browser_tab_report_title,
            hexbuffer::commands::browser_panel::browser_tab_report_region_captured,
            hexbuffer::commands::browser_panel::browser_tab_report_element_captured,
            hexbuffer::commands::browser_panel::browser_tab_report_annotation_marker_clicked,
            show_main_window,
            safe_start_dragging,
            hexbuffer::commands::lsp::get_lsp_port
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

#[cfg(desktop)]
async fn check_for_updates(app: tauri::AppHandle) -> tauri_plugin_updater::Result<()> {
    use tauri_plugin_updater::UpdaterExt;

    if let Some(update) = app.updater()?.check().await? {
        log(&format!(
            "[updater] update {} available (current: {}) — user will be prompted via UI",
            update.version, update.current_version
        ));
    } else {
        log("[updater] no update available");
    }

    Ok(())
}

#[tauri::command]
fn show_main_window(app: tauri::AppHandle) -> Result<(), String> {
    log("show_main_window invoked by frontend");

    // Close splashscreen if it exists
    if let Some(splash_window) = app.get_webview_window("splashscreen") {
        log("Closing splash screen");
        splash_window.close().map_err(|error| {
            log(&format!("Failed to close splash: {error}"));
            error.to_string()
        })?;
    } else {
        log("No splash screen found to close");
    }

    // Show and focus main window
    let main_window = app
        .get_webview_window("main")
        .ok_or_else(|| {
            log("ERROR: main window was not found");
            "main window was not found".to_string()
        })?;

    main_window.show().map_err(|error| {
        log(&format!("Failed to show main window: {error}"));
        error.to_string()
    })?;
    main_window.set_focus().map_err(|error| {
        log(&format!("Failed to focus main window: {error}"));
        error.to_string()
    })?;

    log("Main window shown and focused successfully");
    Ok(())
}

/// Safe wrapper around start_dragging that catches the nil-currentEvent panic
/// in tao 0.35.2 on macOS (tao/src/platform_impl/macos/window.rs:936).
#[tauri::command]
fn safe_start_dragging(window: tauri::Window) -> Result<(), String> {
    if window.is_fullscreen().unwrap_or(false) {
        return Ok(());
    }
    std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| window.start_dragging()))
        .map_err(|_| "drag failed".to_string())?
        .map_err(|e| e.to_string())
}
