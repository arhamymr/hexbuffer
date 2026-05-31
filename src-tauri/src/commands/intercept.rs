use std::collections::HashMap;
use std::path::PathBuf;
use std::process::Command;
use std::sync::Mutex;

use serde::Deserialize;
use tauri::{AppHandle, Manager, State};
use uuid::Uuid;

pub use crate::proxy::state::{InterceptMode, InterceptStatus, PausedRequest, ProxyRequest};

#[derive(Debug, Deserialize)]
pub struct InterceptForwardRequest {
    method: String,
    url: String,
    headers: HashMap<String, String>,
    body: String,
}

#[tauri::command]
pub async fn get_intercept_status(
    state: State<'_, Mutex<crate::proxy::ProxyState>>,
) -> Result<InterceptStatus, String> {
    let proxy_state = state.lock().map_err(|error| format!("{error}"))?;
    Ok(proxy_state.get_status())
}

#[tauri::command]
pub async fn set_intercept_enabled(
    state: State<'_, Mutex<crate::proxy::ProxyState>>,
    enabled: bool,
) -> Result<InterceptStatus, String> {
    let proxy_state = state.lock().map_err(|error| format!("{error}"))?;

    if enabled {
        proxy_state.set_mode(InterceptMode::Enabled);
    } else {
        proxy_state.set_mode(InterceptMode::Disabled);
    }

    Ok(proxy_state.get_status())
}

#[tauri::command]
pub async fn get_paused_requests(
    state: State<'_, Mutex<crate::proxy::ProxyState>>,
) -> Result<Vec<PausedRequest>, String> {
    let proxy_state = state.lock().map_err(|error| format!("{error}"))?;
    Ok(proxy_state.get_all_paused())
}

#[tauri::command]
pub async fn forward_intercepted_request(
    state: State<'_, Mutex<crate::proxy::ProxyState>>,
    request_id: String,
    request: Option<InterceptForwardRequest>,
) -> Result<(), String> {
    let id = Uuid::parse_str(&request_id).map_err(|e| e.to_string())?;
    let request = request.map(|request| {
        let mut body = request.body.into_bytes();

        if let Some(encoding) = request.headers.iter()
            .find(|(k, _)| k.eq_ignore_ascii_case("content-encoding"))
            .map(|(_, v)| v.clone())
        {
            if !encoding.is_empty() {
                match crate::proxy::lifecycle::body_decoder::encode_body(&encoding, &body) {
                    Ok(encoded) => body = encoded,
                    Err(e) => eprintln!("[intercept] re-encode failed ({encoding}): {e}"),
                }
            }
        }

        ProxyRequest {
            method: request.method,
            uri: request.url,
            http_version: "HTTP/1.1".to_string(),
            headers: request.headers,
            body,
            content_decoded: false,
        }
    });
    let proxy_state = state.lock().map_err(|error| format!("{error}"))?;
    let forwarded = proxy_state.forward_paused_request(&id, request);

    if forwarded {
        Ok(())
    } else {
        Err("Paused request not found.".to_string())
    }
}

#[tauri::command]
pub async fn drop_intercepted_request(
    state: State<'_, Mutex<crate::proxy::ProxyState>>,
    request_id: String,
) -> Result<(), String> {
    let id = Uuid::parse_str(&request_id).map_err(|e| e.to_string())?;
    let proxy_state = state.lock().map_err(|error| format!("{error}"))?;
    let dropped = proxy_state.drop_paused_request(&id);

    if dropped {
        Ok(())
    } else {
        Err("Paused request not found.".to_string())
    }
}

#[tauri::command]
pub async fn get_intercept_bypass_patterns(
    state: State<'_, Mutex<crate::proxy::ProxyState>>,
) -> Result<Vec<String>, String> {
    let proxy_state = state.lock().map_err(|error| format!("{error}"))?;
    Ok(proxy_state.get_bypass_patterns())
}

#[tauri::command]
pub async fn set_intercept_bypass_patterns(
    state: State<'_, Mutex<crate::proxy::ProxyState>>,
    patterns: Vec<String>,
) -> Result<Vec<String>, String> {
    let proxy_state = state.lock().map_err(|error| format!("{error}"))?;
    proxy_state.set_bypass_patterns(patterns);
    Ok(proxy_state.get_bypass_patterns())
}

#[tauri::command]
pub async fn add_intercept_bypass_pattern(
    state: State<'_, Mutex<crate::proxy::ProxyState>>,
    pattern: String,
) -> Result<Vec<String>, String> {
    let proxy_state = state.lock().map_err(|error| format!("{error}"))?;
    Ok(proxy_state.add_bypass_pattern(pattern))
}

#[tauri::command]
pub async fn remove_intercept_bypass_pattern(
    state: State<'_, Mutex<crate::proxy::ProxyState>>,
    pattern: String,
) -> Result<Vec<String>, String> {
    let proxy_state = state.lock().map_err(|error| format!("{error}"))?;
    Ok(proxy_state.remove_bypass_pattern(&pattern))
}

fn browser_candidates() -> Vec<PathBuf> {
    fn workspace_chrome_candidates() -> Vec<PathBuf> {
        let mut roots = Vec::new();

        if let Ok(current_dir) = std::env::current_dir() {
            roots.push(current_dir.clone());
            if let Some(parent) = current_dir.parent() {
                roots.push(parent.to_path_buf());
            }
        }

        let mut candidates = Vec::new();

        for root in roots {
            let chrome_root = root.join("chrome");

            if let Ok(entries) = std::fs::read_dir(&chrome_root) {
                for entry in entries.flatten() {
                    let version_dir = entry.path();
                    candidates.push(
                        version_dir
                            .join("chrome-mac-arm64")
                            .join("Google Chrome for Testing.app")
                            .join("Contents")
                            .join("MacOS")
                            .join("Google Chrome for Testing"),
                    );
                }
            }
        }

        candidates
    }

    #[cfg(target_os = "macos")]
    {
        let mut candidates = workspace_chrome_candidates();
        candidates.extend([
            PathBuf::from("/Applications/Chromium.app/Contents/MacOS/Chromium"),
            PathBuf::from(
                "/Applications/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
            ),
            PathBuf::from("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"),
            PathBuf::from("/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary"),
        ]);
        return candidates;
    }

    #[cfg(target_os = "windows")]
    {
        let mut candidates = Vec::new();

        if let Some(local_app_data) = std::env::var_os("LOCALAPPDATA") {
            candidates.push(PathBuf::from(local_app_data).join("Chromium/Application/chrome.exe"));
        }

        if let Some(program_files) = std::env::var_os("PROGRAMFILES") {
            candidates
                .push(PathBuf::from(program_files).join("Google/Chrome/Application/chrome.exe"));
            candidates.push(PathBuf::from(program_files).join("Chromium/Application/chrome.exe"));
        }

        if let Some(program_files_x86) = std::env::var_os("PROGRAMFILES(X86)") {
            candidates.push(
                PathBuf::from(program_files_x86).join("Google/Chrome/Application/chrome.exe"),
            );
        }

        return candidates;
    }

    #[cfg(target_os = "linux")]
    {
        return vec![
            PathBuf::from("chromium"),
            PathBuf::from("chromium-browser"),
            PathBuf::from("google-chrome"),
            PathBuf::from("google-chrome-stable"),
        ];
    }
}

fn intercept_browser_profile_dir(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("intercept-browser-profile"))
}

fn write_intercept_ca(app: &AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&app_data_dir).map_err(|e| e.to_string())?;

    let ca_path = app_data_dir.join("apprecon-ca.pem");
    let ca_pem = crate::proxy::https::cert::export_ca_cert_pem().map_err(|error| format!("{error}"))?;
    std::fs::write(&ca_path, ca_pem).map_err(|e| e.to_string())?;

    Ok(ca_path)
}

fn certutil_candidates() -> Vec<PathBuf> {
    vec![
        PathBuf::from("certutil"),
        PathBuf::from("/opt/homebrew/opt/nss/bin/certutil"),
        PathBuf::from("/opt/homebrew/bin/certutil"),
        PathBuf::from("/usr/local/opt/nss/bin/certutil"),
        PathBuf::from("/usr/local/bin/certutil"),
    ]
}

fn run_certutil(args: &[String]) -> Result<(), String> {
    let mut last_error = None;

    for candidate in certutil_candidates() {
        let output = Command::new(&candidate).args(args).output();

        match output {
            Ok(output) if output.status.success() => return Ok(()),
            Ok(output) => {
                let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
                last_error = Some(if stderr.is_empty() {
                    format!("certutil exited with {}", output.status)
                } else {
                    stderr
                });
            }
            Err(error) => last_error = Some(error.to_string()),
        }
    }

    Err(last_error.unwrap_or_else(|| {
        "certutil was not found. Install NSS tools first, for example: brew install nss".to_string()
    }))
}

#[tauri::command]
pub async fn open_intercept_browser(app: AppHandle) -> Result<(), String> {
    let profile_dir = intercept_browser_profile_dir(&app)?;
    std::fs::create_dir_all(&profile_dir).map_err(|e| e.to_string())?;
    let ca_import_result = import_intercept_ca_to_chrome_profile(&app);

    let mut last_error = None;
    let proxy_port = crate::proxy::active_proxy_port().unwrap_or(crate::proxy::default_proxy_port());
    let args = vec![
        format!("--user-data-dir={}", profile_dir.display()),
        "--new-window".to_string(),
        "--no-first-run".to_string(),
        "--no-default-browser-check".to_string(),
        format!("--proxy-server=127.0.0.1:{proxy_port}"),
        "about:blank".to_string(),
    ];

    for candidate in browser_candidates() {
        if candidate.components().count() > 1 && !candidate.exists() {
            continue;
        }

        match Command::new(&candidate).args(&args).spawn() {
            Ok(_) => {
                if let Err(error) = ca_import_result {
                    eprintln!("[intercept/browser] Browser opened, but CA import failed: {error}");
                }

                return Ok(());
            }
            Err(error) => last_error = Some(error.to_string()),
        }
    }

    Err(last_error.unwrap_or_else(|| "Chromium or Google Chrome was not found.".to_string()))
}

fn import_intercept_ca_to_chrome_profile(app: &AppHandle) -> Result<String, String> {
    let profile_dir = intercept_browser_profile_dir(app)?;
    std::fs::create_dir_all(&profile_dir).map_err(|e| e.to_string())?;
    let ca_path = write_intercept_ca(app)?;
    let db_dir = format!("sql:{}", profile_dir.display());
    let nickname = "AppRecon Root CA".to_string();

    let init_args = vec![
        "-N".to_string(),
        "-d".to_string(),
        db_dir.clone(),
        "--empty-password".to_string(),
    ];
    let _ = run_certutil(&init_args);

    let delete_args = vec![
        "-D".to_string(),
        "-d".to_string(),
        db_dir.clone(),
        "-n".to_string(),
        nickname.clone(),
    ];
    let _ = run_certutil(&delete_args);

    let add_args = vec![
        "-A".to_string(),
        "-d".to_string(),
        db_dir,
        "-n".to_string(),
        nickname,
        "-t".to_string(),
        "C,,".to_string(),
        "-i".to_string(),
        ca_path.display().to_string(),
    ];

    match run_certutil(&add_args) {
        Ok(()) => Ok("AppRecon CA imported into the managed Chrome profile. Close old Intercept browser windows and open it again.".to_string()),
        Err(error) => Err(format!(
            "Chrome-profile CA import failed: {error}. Install NSS tools with `brew install nss`, then try again."
        )),
    }
}

#[cfg(target_os = "macos")]
fn user_login_keychain_path() -> Result<PathBuf, String> {
    let home = std::env::var_os("HOME")
        .ok_or_else(|| "Could not resolve the current home directory.".to_string())?;
    Ok(PathBuf::from(home).join("Library/Keychains/login.keychain-db"))
}

#[cfg(target_os = "macos")]
fn run_security(args: &[String]) -> Result<(), String> {
    let output = Command::new("security")
        .args(args)
        .output()
        .map_err(|error| error.to_string())?;

    if output.status.success() {
        return Ok(());
    }

    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
    Err(if stderr.is_empty() {
        format!("security exited with {}", output.status)
    } else {
        stderr
    })
}

#[cfg(target_os = "macos")]
fn install_intercept_ca_to_macos_keychain(app: &AppHandle) -> Result<String, String> {
    let ca_path = write_intercept_ca(app)?;
    let keychain_path = user_login_keychain_path()?;
    let cert_name = "0xbufferr Root CA".to_string();

    let delete_args = vec![
        "delete-certificate".to_string(),
        "-c".to_string(),
        cert_name,
        keychain_path.display().to_string(),
    ];
    let _ = run_security(&delete_args);

    let add_args = vec![
        "add-trusted-cert".to_string(),
        "-r".to_string(),
        "trustRoot".to_string(),
        "-p".to_string(),
        "ssl".to_string(),
        "-k".to_string(),
        keychain_path.display().to_string(),
        ca_path.display().to_string(),
    ];

    run_security(&add_args).map(|_| {
        "0xbufferr CA installed in your macOS login keychain and trusted for SSL. Restart browsers that were already open.".to_string()
    })
}

#[tauri::command]
pub async fn trust_intercept_ca(app: AppHandle) -> Result<String, String> {
    #[cfg(target_os = "macos")]
    {
        install_intercept_ca_to_macos_keychain(&app)
    }

    #[cfg(not(target_os = "macos"))]
    {
        import_intercept_ca_to_chrome_profile(&app)
    }
}
