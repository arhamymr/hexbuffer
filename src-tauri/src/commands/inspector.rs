use std::path::PathBuf;
use std::process::Command;
use std::sync::Arc;

use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager};
use tokio::sync::Mutex;

fn inspector_browser_profile_dir(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("inspector-browser-profile"))
}

fn inspector_browser_candidates() -> Vec<PathBuf> {
    #[cfg(target_os = "macos")]
    {
        return vec![
            PathBuf::from("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"),
            PathBuf::from("/Applications/Chromium.app/Contents/MacOS/Chromium"),
            PathBuf::from(
                "/Applications/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
            ),
            PathBuf::from("/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary"),
        ];
    }

    #[cfg(target_os = "windows")]
    {
        let mut candidates = Vec::new();
        if let Some(local_app_data) = std::env::var_os("LOCALAPPDATA") {
            candidates.push(PathBuf::from(local_app_data).join("Chromium/Application/chrome.exe"));
        }
        if let Some(program_files) = std::env::var_os("PROGRAMFILES") {
            candidates.push(PathBuf::from(program_files).join("Google/Chrome/Application/chrome.exe"));
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

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InspectorConsoleLog {
    pub id: String,
    pub level: String,
    pub text: String,
    pub url: String,
    pub timestamp: i64,
}

#[derive(Debug, Deserialize)]
struct CdpTarget {
    #[serde(rename = "type")]
    target_type: String,
    #[serde(rename = "webSocketDebuggerUrl")]
    web_socket_debugger_url: String,
    #[serde(default)]
    url: Option<String>,
    #[serde(default)]
    title: Option<String>,
}

#[derive(Debug, Serialize)]
struct CdpRequest {
    id: u64,
    method: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    params: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
struct CdpResponse {
    #[serde(default)]
    id: Option<u64>,
    #[serde(default)]
    method: Option<String>,
    #[serde(default)]
    params: Option<serde_json::Value>,
    #[serde(default)]
    result: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InspectorPageInfo {
    pub id: String,
    pub url: String,
    pub title: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InspectorNetworkEntry {
    pub id: String,
    pub request_id: String,
    pub method: String,
    pub url: String,
    pub status: Option<i64>,
    pub resource_type: String,
    pub mime_type: String,
    pub size: i64,
    pub time: f64,
    pub start_time: f64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InspectorCookie {
    pub name: String,
    pub value: String,
    pub domain: String,
    pub path: String,
    pub expires: f64,
    pub http_only: bool,
    pub secure: bool,
    #[serde(rename = "sameSite")]
    pub same_site: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InspectorStorageEntry {
    pub key: String,
    pub value: String,
}

pub struct InspectorCdpState {
    cancel_token: Arc<Mutex<Option<tokio::sync::watch::Sender<bool>>>>,
}

impl Default for InspectorCdpState {
    fn default() -> Self {
        Self {
            cancel_token: Arc::new(Mutex::new(None)),
        }
    }
}

#[tauri::command]
pub async fn open_inspector_browser(
    app: AppHandle,
    proxy_port: u16,
    debugging_port: u16,
    profile_path: Option<String>,
) -> Result<String, String> {
    let profile_dir = if let Some(ref path) = profile_path {
        PathBuf::from(path)
    } else {
        inspector_browser_profile_dir(&app)?
    };
    std::fs::create_dir_all(&profile_dir).map_err(|e| e.to_string())?;

    let proxy_port = crate::proxy::active_proxy_port().unwrap_or(proxy_port);

    let mut args = vec![
        format!("--user-data-dir={}", profile_dir.display()),
        "--new-window".to_string(),
        "--no-first-run".to_string(),
        "--no-default-browser-check".to_string(),
        format!("--remote-debugging-port={debugging_port}"),
        format!("--proxy-server=127.0.0.1:{proxy_port}"),
        "about:blank".to_string(),
    ];

    #[cfg(target_os = "macos")]
    args.push("--use-mock-keychain".to_string());

    let mut last_error = None;

    for candidate in inspector_browser_candidates() {
        if candidate.components().count() > 1 && !candidate.exists() {
            continue;
        }

        match Command::new(&candidate).args(&args).spawn() {
            Ok(_) => return Ok(profile_dir.display().to_string()),
            Err(error) => last_error = Some(error.to_string()),
        }
    }

    Err(last_error.unwrap_or_else(|| {
        "Google Chrome or Chromium was not found. Install Chrome or Chromium to use Inspector."
            .to_string()
    }))
}

#[tauri::command]
pub async fn connect_inspector_cdp(
    app: AppHandle,
    state: tauri::State<'_, InspectorCdpState>,
    debugging_port: u16,
) -> Result<(), String> {
    let (cancel_tx, mut cancel_rx) = tokio::sync::watch::channel(false);
    {
        let mut token = state.cancel_token.lock().await;
        if let Some(existing) = token.take() {
            let _ = existing.send(true);
        }
        *token = Some(cancel_tx);
    }

    let app_handle = app.clone();

    tauri::async_runtime::spawn(async move {
        if let Err(e) = run_cdp_loop(app_handle, debugging_port, &mut cancel_rx).await {
            eprintln!("[inspector/cdp] CDP loop error: {e}");
        }
    });

    Ok(())
}

#[tauri::command]
pub async fn disconnect_inspector_cdp(
    state: tauri::State<'_, InspectorCdpState>,
) -> Result<(), String> {
    let mut token = state.cancel_token.lock().await;
    if let Some(sender) = token.take() {
        let _ = sender.send(true);
    }
    Ok(())
}

async fn run_cdp_loop(
    app: AppHandle,
    debugging_port: u16,
    cancel_rx: &mut tokio::sync::watch::Receiver<bool>,
) -> Result<(), String> {
    tokio::time::sleep(tokio::time::Duration::from_millis(1500)).await;

    let json_url = format!("http://127.0.0.1:{debugging_port}/json");
    let client = reqwest::Client::new();

    let targets: Vec<CdpTarget> = loop {
        if *cancel_rx.borrow() {
            return Ok(());
        }

        match client.get(&json_url).send().await {
            Ok(resp) => match resp.json::<Vec<CdpTarget>>().await {
                Ok(t) if !t.is_empty() => break t,
                Ok(_) => {
                    tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
                }
                Err(e) => {
                    eprintln!("[inspector/cdp] Failed to parse targets: {e}");
                    tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
                }
            },
            Err(e) => {
                eprintln!("[inspector/cdp] Waiting for Chrome CDP: {e}");
                tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
            }
        }
    };

    let _ = app.emit("inspector:connected", true);

    let mut seen_urls = std::collections::HashSet::new();
    let page_targets: Vec<_> = targets
        .into_iter()
        .filter(|t| t.target_type == "page" && seen_urls.insert(t.web_socket_debugger_url.clone()))
        .collect();

    // Spawn pages polling task
    let app_pages = app.clone();
    let json_url_pages = json_url.clone();
    let client_pages = client.clone();
    let mut cancel_pages = cancel_rx.clone();
    let pages_handle = tauri::async_runtime::spawn(async move {
        loop {
            tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
            if *cancel_pages.borrow() {
                break;
            }
            if let Ok(resp) = client_pages.get(&json_url_pages).send().await {
                if let Ok(targets) = resp.json::<Vec<CdpTarget>>().await {
                    let pages: Vec<InspectorPageInfo> = targets
                        .iter()
                        .filter(|t| t.target_type == "page")
                        .map(|t| InspectorPageInfo {
                            id: t.web_socket_debugger_url.clone(),
                            url: t.url.clone().unwrap_or_default(),
                            title: t.title.clone().unwrap_or_else(|| {
                                t.url.clone().unwrap_or_else(|| "about:blank".to_string())
                            }),
                        })
                        .collect();
                    let _ = app_pages.emit("inspector:pages-updated", &pages);
                }
            }
        }
    });

    let mut handles = Vec::new();

    for target in page_targets {
        if *cancel_rx.borrow() {
            break;
        }

        let app_clone = app.clone();
        let ws_url = target.web_socket_debugger_url;
        let mut cancel = cancel_rx.clone();

        handles.push(tauri::async_runtime::spawn(async move {
            if let Err(e) = attach_to_page_cdp(app_clone, &ws_url, &mut cancel).await {
                eprintln!("[inspector/cdp] Page CDP error: {e}");
            }
        }));
    }

    for handle in handles {
        let _ = handle.await;
    }

    let _ = app.emit("inspector:connected", false);

    Ok(())
}

async fn attach_to_page_cdp(
    app: AppHandle,
    ws_url: &str,
    cancel_rx: &mut tokio::sync::watch::Receiver<bool>,
) -> Result<(), String> {
    use futures_util::SinkExt;
    use tokio_tungstenite::connect_async;
    use tokio_tungstenite::tungstenite::Message;

    let (ws_stream, _) = connect_async(ws_url)
        .await
        .map_err(|e| format!("WebSocket connection failed: {e}"))?;

    let (mut write, mut read) = ws_stream.split();

    let mut messages_to_send: Vec<String> = vec![
        serde_json::to_string(&CdpRequest {
            id: 1,
            method: "Runtime.enable".to_string(),
            params: None,
        })
        .map_err(|e| e.to_string())?,
        serde_json::to_string(&CdpRequest {
            id: 2,
            method: "Network.enable".to_string(),
            params: None,
        })
        .map_err(|e| e.to_string())?,
    ];

    for msg in messages_to_send {
        write
            .send(Message::Text(msg.into()))
            .await
            .map_err(|e| e.to_string())?;
    }

    loop {
        tokio::select! {
            _ = cancel_rx.changed() => {
                if *cancel_rx.borrow() {
                    return Ok(());
                }
            }
            msg = read.next() => {
                match msg {
                    Some(Ok(Message::Text(text))) => {
                        let text_str = text.to_string();
                        if let Ok(response) = serde_json::from_str::<CdpResponse>(&text_str) {
                            match response.method.as_deref() {
                                Some("Runtime.consoleAPICalled") => {
                                    if let Some(params) = &response.params {
                                        let console_type = params["type"]
                                            .as_str()
                                            .unwrap_or("log")
                                            .to_string();
                                        let args = params["args"].as_array();
                                        let text = args
                                            .map(|a| {
                                                a.iter()
                                                    .filter_map(|arg| {
                                                        arg["value"].as_str()
                                                            .or_else(|| arg["description"].as_str())
                                                    })
                                                    .collect::<Vec<_>>()
                                                    .join(" ")
                                            })
                                            .unwrap_or_default();

                                        let url = params["stackTrace"]["callFrames"]
                                            .as_array()
                                            .and_then(|frames| frames.first())
                                            .and_then(|frame| frame["url"].as_str())
                                            .unwrap_or("")
                                            .to_string();

                                        let log = InspectorConsoleLog {
                                            id: uuid::Uuid::new_v4().to_string(),
                                            level: console_type,
                                            text,
                                            url,
                                            timestamp: chrono::Utc::now().timestamp_millis(),
                                        };
                                        let _ = app.emit("inspector:console-log", &log);
                                    }
                                }
                                Some("Runtime.exceptionThrown") => {
                                    if let Some(params) = &response.params {
                                        let exc = &params["exceptionDetails"];
                                        let text = exc["text"]
                                            .as_str()
                                            .unwrap_or("Unknown exception")
                                            .to_string();
                                        let url = exc["url"]
                                            .as_str()
                                            .unwrap_or("")
                                            .to_string();

                                        let log = InspectorConsoleLog {
                                            id: uuid::Uuid::new_v4().to_string(),
                                            level: "pageerror".to_string(),
                                            text,
                                            url,
                                            timestamp: chrono::Utc::now().timestamp_millis(),
                                        };
                                        let _ = app.emit("inspector:console-log", &log);
                                    }
                                }
                                Some("Network.requestWillBeSent") => {
                                    if let Some(params) = &response.params {
                                        let request = &params["request"];
                                        let request_id = params["requestId"]
                                            .as_str()
                                            .unwrap_or("")
                                            .to_string();
                                        let method = request["method"]
                                            .as_str()
                                            .unwrap_or("GET")
                                            .to_string();
                                        let req_url = request["url"]
                                            .as_str()
                                            .unwrap_or("")
                                            .to_string();
                                        let resource_type = params["type"]
                                            .as_str()
                                            .unwrap_or("Other")
                                            .to_string();
                                        let timestamp_f = params["timestamp"]
                                            .as_f64()
                                            .unwrap_or(0.0);

                                        let entry = InspectorNetworkEntry {
                                            id: uuid::Uuid::new_v4().to_string(),
                                            request_id,
                                            method,
                                            url: req_url,
                                            status: None,
                                            resource_type,
                                            mime_type: String::new(),
                                            size: 0,
                                            time: 0.0,
                                            start_time: timestamp_f,
                                        };
                                        let _ = app.emit("inspector:network-entry", &entry);
                                    }
                                }
                                _ => {}
                            }
                        }
                    }
                    Some(Ok(Message::Close(_))) | None => {
                        return Ok(());
                    }
                    Some(Err(e)) => {
                        eprintln!("[inspector/cdp] WebSocket error: {e}");
                        return Ok(());
                    }
                    _ => {}
                }
            }
        }
    }
}
