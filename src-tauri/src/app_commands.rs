// ponytail: extracted from main.rs to keep main entry point clean and focused.

use tauri::Manager;

#[tauri::command]
pub fn show_main_window(app: tauri::AppHandle) -> Result<(), String> {
    crate::log("show_main_window invoked by frontend");

    // Close splashscreen if it exists
    if let Some(splash_window) = app.get_webview_window("splashscreen") {
        crate::log("Closing splash screen");
        splash_window.close().map_err(|error| {
            crate::log(&format!("Failed to close splash: {error}"));
            error.to_string()
        })?;
    } else {
        crate::log("No splash screen found to close");
    }

    // Show and focus main window
    let main_window = app
        .get_webview_window("main")
        .ok_or_else(|| {
            crate::log("ERROR: main window was not found");
            "main window was not found".to_string()
        })?;

    main_window.show().map_err(|error| {
        crate::log(&format!("Failed to show main window: {error}"));
        error.to_string()
    })?;
    main_window.set_focus().map_err(|error| {
        crate::log(&format!("Failed to focus main window: {error}"));
        error.to_string()
    })?;

    crate::log("Main window shown and focused successfully");
    Ok(())
}

/// Safe wrapper around start_dragging that catches the nil-currentEvent panic
/// in tao 0.35.2 on macOS (tao/src/platform_impl/macos/window.rs:936).
#[tauri::command]
pub fn safe_start_dragging(window: tauri::Window) -> Result<(), String> {
    if window.is_fullscreen().unwrap_or(false) {
        return Ok(());
    }
    std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| window.start_dragging()))
        .map_err(|_| "drag failed".to_string())?
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_cdp_targets(port: u16) -> Result<String, String> {
    let url = format!("http://127.0.0.1:{}/json", port);
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(3))
        .build()
        .map_err(|e| e.to_string())?;
    let resp = client.get(&url)
        .send()
        .await
        .map_err(|e| e.to_string())?
        .text()
        .await
        .map_err(|e| e.to_string())?;
    Ok(resp)
}

#[tauri::command]
pub async fn open_cdp_browser(app: tauri::AppHandle, port: u16) -> Result<(), String> {
    // Check if the port is already occupied by a different application
    if std::net::TcpListener::bind(("127.0.0.1", port)).is_err() {
        let url = format!("http://127.0.0.1:{}/json", port);
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_millis(500))
            .build()
            .map_err(|e| e.to_string())?;

        let is_cdp = match client.get(&url).send().await {
            Ok(resp) => {
                if let Ok(text) = resp.text().await {
                    if let Ok(val) = serde_json::from_str::<serde_json::Value>(&text) {
                        val.is_array()
                    } else {
                        false
                    }
                } else {
                    false
                }
            }
            Err(_) => false,
        };

        if !is_cdp {
            return Err(format!(
                "Port {} is already occupied by another application (e.g. AirPlay, web server). Please use a different debugging port (e.g. 9222 or 9223).",
                port
            ));
        } else {
            // It is an existing Chrome CDP instance. Let's terminate it to release any profile/window lock and launch fresh.
            #[cfg(unix)]
            {
                if let Ok(output) = std::process::Command::new("lsof")
                    .args(&["-t", "-i", &format!("tcp:{}", port)])
                    .output()
                {
                    let pid_str = String::from_utf8_lossy(&output.stdout);
                    let pids: Vec<&str> = pid_str.split_whitespace().collect();
                    if !pids.is_empty() {
                        let _ = std::process::Command::new("kill")
                            .arg("-9")
                            .args(&pids)
                            .status();
                        // Wait for port to be released
                        std::thread::sleep(std::time::Duration::from_millis(500));
                    }
                }
            }
        }
    }

    let profile_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join(format!("cdp-browser-profile-{}", port));
    std::fs::create_dir_all(&profile_dir).map_err(|e| e.to_string())?;

    let proxy_port = hexbuffer::proxy::active_proxy_port().unwrap_or(8888);

    let mut args = vec![
        format!("--remote-debugging-port={}", port),
        format!("--user-data-dir={}", profile_dir.display()),
        "--remote-allow-origins=*".to_string(),
        "--new-window".to_string(),
        "--no-first-run".to_string(),
        "--no-default-browser-check".to_string(),
        format!("--proxy-server=127.0.0.1:{proxy_port}"),
        "about:blank".to_string(),
    ];
    #[cfg(target_os = "macos")]
    args.push("--use-mock-keychain".to_string());

    let mut last_error = None;
    for candidate in hexbuffer::commands::intercept::browser_candidates() {
        if candidate.components().count() > 1 && !candidate.exists() {
            continue;
        }

        match std::process::Command::new(&candidate).args(&args).spawn() {
            Ok(_) => return Ok(()),
            Err(error) => last_error = Some(error.to_string()),
        }
    }

    Err(last_error.unwrap_or_else(|| {
        "Google Chrome or Chromium was not found. Install Chrome or Chromium to use Open Browser.".to_string()
    }))
}
