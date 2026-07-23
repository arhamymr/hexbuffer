use tauri::{AppHandle, Manager};
use hexbuffer::commands::invoker::InvokerState;
use hexbuffer::{
    AiBrowserState, BrowserProcessState, CollaboratorPollingState, HistoryBridge,
    PortScanState, ProxyState, SqliScanState,
};

pub fn init(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    #[cfg(desktop)]
    app.handle()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .expect("Failed to initialize updater plugin");

    crate::log("Initializing database...");
    let app_dir = app
        .path()
        .app_data_dir()
        .expect("Failed to get app data dir");
    std::fs::create_dir_all(&app_dir).expect("Failed to create app data dir");
    hexbuffer::proxy::ca::init_ca_dir(app_dir.clone());

    let db_path = app_dir.join("hexbuffer.db");
    crate::log(&format!("Opening database at {:?}", db_path));
    let database = hexbuffer::db::repository::Database::new(db_path.clone())
        .expect("Failed to initialize database");
    database.init().expect("Failed to initialize database schema");
    let history = HistoryBridge::new(db_path).expect("Failed to initialize history bridge");
    crate::log("History bridge initialized");

    app.manage(ProxyState::new());
    app.manage(InvokerState::default());
    app.manage(PortScanState::default());
    app.manage(BrowserProcessState::default());
    app.manage(AiBrowserState::default());
    app.manage(SqliScanState::new());
    app.manage(CollaboratorPollingState::default());
    app.manage(hexbuffer::automation::AutomationRuntimeState::default());
    app.manage(database);
    app.manage(history);
    app.manage(hexbuffer::commands::vpn::VpnState::default());

    // ponytail: manage MockForgeState
    let mock_forge = hexbuffer::commands::mock_forge::MockForgeState::new();
    let db_ref = app.state::<hexbuffer::db::repository::Database>();
    if let Err(e) = hexbuffer::commands::mock_forge::load_mock_forge_from_db(&mock_forge, &db_ref) {
        eprintln!("[mock-forge] failed to load from db: {}", e);
    }
    app.manage(mock_forge);

    crate::log("Building Tauri app...");

    #[cfg(desktop)]
    {
        let handle = app.handle().clone();
        tauri::async_runtime::spawn(async move {
            if let Err(e) = check_for_updates(handle).await {
                crate::log(&format!("[updater] startup check failed: {e}"));
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
                crate::log("Splash fallback timer fired — closing splash");
                let _ = splash.close();
            }
            if let Some(main_window) = handle.get_webview_window("main") {
                let _ = main_window.show();
                let _ = main_window.set_focus();
                crate::log("Splash fallback: main window shown");
            }
        });
    }

    // Initialize System Tray Menu
    crate::tray::init(app)?;

    crate::log("Tauri setup complete");
    Ok(())
}

#[cfg(desktop)]
async fn check_for_updates(app: AppHandle) -> tauri_plugin_updater::Result<()> {
    use tauri_plugin_updater::UpdaterExt;

    if let Some(update) = app.updater()?.check().await? {
        crate::log(&format!(
            "[updater] update {} available (current: {}) — user will be prompted via UI",
            update.version, update.current_version
        ));
    } else {
        crate::log("[updater] no update available");
    }

    Ok(())
}
