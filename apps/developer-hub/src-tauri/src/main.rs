// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::Arc;
use std::sync::Mutex;
use tauri::{
    menu::{Menu, MenuItem, Submenu},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager,
};
use hexbuffer::HistoryBridge;

mod git;
/// Append a timestamped line to both stderr and /tmp/developer_hub.log
fn log(msg: &str) {
    let ts = chrono::Local::now().format("%Y-%m-%d %H:%M:%S%.3f");
    let line = format!("[{ts}] {msg}");
    eprintln!("{line}");
    let _ = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open("/tmp/developer_hub.log")
        .and_then(|mut f| std::io::Write::write_all(&mut f, format!("{line}\n").as_bytes()));
}

fn main() {
    // Start a fresh log file on each launch
    let _ = std::fs::write("/tmp/developer_hub.log", "");
    log("Developer Hub starting...");

    std::panic::set_hook(Box::new(|panic_info| {
        let msg = format!("PANIC: {:?}", panic_info);
        log(&msg);
        let _ = std::fs::write("/tmp/developer_hub_panic.log", &msg);
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

            let db_path = app_dir.join("developer_hub.db");
            log(&format!("Opening database at {:?}", db_path));
            let database = hexbuffer::db::repository::Database::new(db_path.clone())
                .expect("Failed to initialize database");
            database.init().expect("Failed to initialize database schema");
            let history = HistoryBridge::new(db_path).expect("Failed to initialize history bridge");
            log("History bridge initialized");

            app.manage(hexbuffer::commands::audit::AuditState::new());
            app.manage(database);
            app.manage(history);

            // Start the LSP Server — prefer the bundled rust-analyzer sidecar binary.
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

                let playground_i = MenuItem::with_id(app, "nav:/playground", "Playground", true, None::<&str>)?;
                let code_audit_i = MenuItem::with_id(app, "nav:/code-audit", "Code Audit", true, None::<&str>)?;
                let api_collection_i = MenuItem::with_id(app, "nav:/api-collection", "APIs Collection", true, None::<&str>)?;
                let features_menu = Submenu::with_items(
                    app,
                    "Features",
                    true,
                    &[&playground_i, &code_audit_i, &api_collection_i],
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
            hexbuffer::commands::history::get_documents,
            hexbuffer::commands::history::save_document,
            hexbuffer::commands::history::delete_document,
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
            hexbuffer::commands::storage::get_storage_info,
            hexbuffer::commands::storage::reset_local_data,
            hexbuffer::commands::terminal::get_default_shell,
            hexbuffer::commands::terminal::get_home_directory,
            hexbuffer::commands::audit::audit_directory,
            hexbuffer::commands::audit::stop_audit,
            hexbuffer::commands::audit::generate_audit_report,
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
            git::git_init,
            git::git_status,
            git::git_stage_file,
            git::git_unstage_file,
            git::git_commit,
            git::git_get_branches,
            git::git_switch_branch,
            git::git_create_branch,
            git::git_get_original_content,
            git::git_pull,
            git::git_push,
            git::git_clone,
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
