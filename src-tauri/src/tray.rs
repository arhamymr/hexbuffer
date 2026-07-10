// ponytail: extracted from main.rs to keep main entry point clean and focused.

use tauri::{
    menu::{Menu, MenuItem, Submenu},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager,
};

pub fn init(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let icon = app.default_window_icon().cloned();

    let assistant_i = MenuItem::with_id(app, "nav:/", "Assistant", true, None::<&str>)?;
    let http_history_i = MenuItem::with_id(app, "nav:/http-history", "HTTP History", true, None::<&str>)?;
    let websocket_history_i = MenuItem::with_id(app, "nav:/websocket-history", "WebSocket History", true, None::<&str>)?;
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
        &[&assistant_i, &http_history_i, &websocket_history_i, &browser_i, &intercept_i, &invoker_i, &repeater_i, &code_audit_i, &documents_i, &tools_i],
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
                crate::log("Quit via tray menu");
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

    crate::log("System tray icon created");
    Ok(())
}
