use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::io::{BufRead, BufReader};
use std::net::{TcpStream, ToSocketAddrs};
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::time::Duration;
use tauri::{AppHandle, Manager, State};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiSettings {
    pub provider: String,
    pub model: String,
    #[serde(default)]
    pub api_key: String,
    #[serde(default)]
    pub has_api_key: bool,
    pub mastra_auto_start: bool,
    pub mastra_url: String,
}

impl Default for AiSettings {
    fn default() -> Self {
        Self {
            provider: "openai".to_string(),
            model: "gpt-4.1-mini".to_string(),
            api_key: String::new(),
            has_api_key: false,
            mastra_auto_start: true,
            mastra_url: "http://localhost:4111".to_string(),
        }
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MastraStatus {
    pub running: bool,
    pub pid: Option<u32>,
    pub url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiChatMessage {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiChatRequest {
    pub messages: Vec<AiChatMessage>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AiChatResponse {
    pub provider: String,
    pub model: String,
    pub content: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct AiChatContext {
    crawl_sessions: Vec<crate::commands::browser::CrawlSession>,
    latest_crawl: Option<AiChatCrawlContext>,
    proxy_summary: Vec<Value>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct AiChatCrawlContext {
    session: crate::commands::browser::CrawlSession,
    pages: Vec<crate::commands::browser::CrawlPage>,
    insights: Vec<crate::commands::browser::AIInsight>,
    logs: Vec<crate::commands::browser::ActivityLog>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AiEngineChatMessage {
    #[serde(rename = "type")]
    message_type: String,
    provider: Option<String>,
    model: Option<String>,
    delta: Option<String>,
    content: Option<String>,
    message: Option<String>,
}

#[derive(Default)]
pub struct MastraProcessState {
    child: Mutex<Option<Child>>,
}

#[tauri::command]
pub fn get_ai_settings(app: AppHandle) -> Result<AiSettings, String> {
    read_ai_settings(&app)
}

#[tauri::command]
pub fn save_ai_settings(app: AppHandle, settings: AiSettings) -> Result<AiSettings, String> {
    let mut settings = settings;
    // API key is managed by frontend (Zustand store)
    settings.api_key.clear();
    write_ai_settings(&app, &settings)?;
    read_ai_settings(&app)
}

#[tauri::command]
pub async fn send_ai_chat_message(
    app: AppHandle,
    history: State<'_, crate::HistoryBridge>,
    request: AiChatRequest,
    api_key: String,
) -> Result<AiChatResponse, String> {
    let settings = read_ai_settings(&app)?;

    if api_key.trim().is_empty() {
        return Err(format!("No {} API key provided", settings.provider));
    }

    let context = build_ai_chat_context(&history)?;
    let response = tauri::async_runtime::spawn_blocking(move || {
        run_ai_chat_engine(&app, &settings, &api_key, &request, &context)
    })
    .await
    .map_err(|error| error.to_string())??;

    Ok(response)
}

fn build_ai_chat_context(history: &crate::HistoryBridge) -> Result<AiChatContext, String> {
    let crawl_sessions = history.list_recent_ai_browser_sessions(5)?;
    let latest_crawl = if let Some(session) = crawl_sessions.first() {
        Some(AiChatCrawlContext {
            session: session.clone(),
            pages: history.list_ai_browser_pages(&session.id)?,
            insights: history.list_ai_browser_insights(&session.id)?,
            logs: history.list_ai_browser_logs(&session.id)?,
        })
    } else {
        None
    };

    Ok(AiChatContext {
        crawl_sessions,
        latest_crawl,
        proxy_summary: Vec::new(),
    })
}

fn run_ai_chat_engine(
    app: &AppHandle,
    settings: &AiSettings,
    api_key: &str,
    request: &AiChatRequest,
    context: &AiChatContext,
) -> Result<AiChatResponse, String> {
    let script = find_ai_engine_script(app)?;
    let node = if cfg!(windows) { "node.exe" } else { "node" };
    let mut command = Command::new(node);
    command
        .arg(script)
        .env("APPRECON_AI_ENGINE_MODE", "chat")
        .env(
            "APPRECON_AI_CHAT_REQUEST_JSON",
            serde_json::to_string(request).map_err(|error| error.to_string())?,
        )
        .env(
            "APPRECON_AI_CONTEXT_JSON",
            serde_json::to_string(context).map_err(|error| error.to_string())?,
        )
        .env("APPRECON_AI_PROVIDER", settings.provider.trim())
        .env("APPRECON_AI_MODEL", settings.model.trim())
        .env(api_key_env_name(&settings.provider)?, api_key.trim())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    let mut child = command
        .spawn()
        .map_err(|error| format!("Failed to start AI engine: {}", error))?;
    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| "Failed to capture AI engine stdout".to_string())?;
    let reader = BufReader::new(stdout);
    let mut provider = settings.provider.clone();
    let mut model = settings.model.clone();
    let mut content = String::new();
    let mut failed = None;

    for line in reader.lines() {
        let line = line.map_err(|error| error.to_string())?;
        if line.trim().is_empty() {
            continue;
        }

        let message: AiEngineChatMessage = serde_json::from_str(&line)
            .map_err(|error| format!("Invalid AI engine message: {} ({})", line, error))?;
        match message.message_type.as_str() {
            "chat_started" => {
                if let Some(value) = message.provider {
                    provider = value;
                }
                if let Some(value) = message.model {
                    model = value;
                }
            }
            "chat_delta" => {
                if let Some(delta) = message.delta {
                    content.push_str(&delta);
                }
            }
            "chat_finished" => {
                if let Some(value) = message.provider {
                    provider = value;
                }
                if let Some(value) = message.model {
                    model = value;
                }
                if let Some(value) = message.content {
                    content = value;
                }
            }
            "chat_failed" => {
                failed = Some(
                    message
                        .message
                        .unwrap_or_else(|| "AI chat failed".to_string()),
                );
            }
            _ => {}
        }
    }

    let status = child.wait().map_err(|error| error.to_string())?;
    if let Some(error) = failed {
        return Err(error);
    }
    if !status.success() {
        return Err(format!("AI engine exited with {}", status));
    }
    if content.trim().is_empty() {
        return Err("AI engine did not return chat content".to_string());
    }

    Ok(AiChatResponse {
        provider,
        model,
        content,
    })
}

#[tauri::command]
pub fn get_mastra_status(
    app: AppHandle,
    state: State<'_, MastraProcessState>,
) -> Result<MastraStatus, String> {
    mastra_status(&app, &state)
}

#[tauri::command]
pub fn start_mastra(
    app: AppHandle,
    state: State<'_, MastraProcessState>,
) -> Result<MastraStatus, String> {
    start_mastra_process(&app, &state)
}

#[tauri::command]
pub fn stop_mastra(
    app: AppHandle,
    state: State<'_, MastraProcessState>,
) -> Result<MastraStatus, String> {
    {
        let mut child = state
            .child
            .lock()
            .map_err(|_| "Failed to lock Mastra process state".to_string())?;

        if let Some(mut process) = child.take() {
            let _ = process.kill();
            let _ = process.wait();
        }
    }

    mastra_status(&app, &state)
}

pub fn start_mastra_if_enabled(app: &AppHandle) -> Result<(), String> {
    let settings = read_ai_settings(app)?;
    if !settings.mastra_auto_start {
        return Ok(());
    }

    let state = app.state::<MastraProcessState>();
    start_mastra_process(app, &state)?;
    Ok(())
}

pub(crate) fn read_ai_settings(app: &AppHandle) -> Result<AiSettings, String> {
    let path = ai_settings_path(app)?;
    let mut settings = if path.exists() {
        let content = std::fs::read_to_string(path).map_err(|error| error.to_string())?;
        serde_json::from_str(&content).map_err(|error| error.to_string())?
    } else {
        AiSettings::default()
    };

    settings.api_key.clear();
    // has_api_key is set by frontend based on Zustand store
    Ok(settings)
}

fn write_ai_settings(app: &AppHandle, settings: &AiSettings) -> Result<(), String> {
    let path = ai_settings_path(app)?;
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }

    let mut settings_to_write = settings.clone();
    settings_to_write.api_key.clear();
    let content =
        serde_json::to_string_pretty(&settings_to_write).map_err(|error| error.to_string())?;
    std::fs::write(path, content).map_err(|error| error.to_string())
}

fn ai_settings_path(app: &AppHandle) -> Result<PathBuf, String> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?;
    Ok(app_dir.join("ai-settings.json"))
}

fn mastra_status(app: &AppHandle, state: &MastraProcessState) -> Result<MastraStatus, String> {
    let settings = read_ai_settings(app).unwrap_or_default();
    let mut child = state
        .child
        .lock()
        .map_err(|_| "Failed to lock Mastra process state".to_string())?;

    if let Some(process) = child.as_mut() {
        if process
            .try_wait()
            .map_err(|error| error.to_string())?
            .is_some()
        {
            *child = None;
        }
    }

    let managed_pid = child.as_ref().map(|process| process.id());
    let running = managed_pid.is_some() || is_mastra_url_listening(&settings.mastra_url);

    Ok(MastraStatus {
        running,
        pid: managed_pid,
        url: settings.mastra_url,
    })
}

fn start_mastra_process(
    app: &AppHandle,
    state: &MastraProcessState,
) -> Result<MastraStatus, String> {
    let settings = read_ai_settings(app).unwrap_or_default();

    {
        let mut child = state
            .child
            .lock()
            .map_err(|_| "Failed to lock Mastra process state".to_string())?;

        if let Some(process) = child.as_mut() {
            if process
                .try_wait()
                .map_err(|error| error.to_string())?
                .is_some()
            {
                *child = None;
            }
        }

        if child.is_some() {
            return mastra_status(app, state);
        }
    }

    if is_mastra_url_listening(&settings.mastra_url) {
        return mastra_status(app, state);
    }

    let mastra_dir = find_mastra_dir(app)?;
    let npm = if cfg!(windows) { "npm.cmd" } else { "npm" };
    let mut command = Command::new(npm);
    command
        .args(["run", "dev"])
        .current_dir(&mastra_dir)
        .stdout(Stdio::null())
        .stderr(Stdio::null());

    for (name, value) in read_mastra_env_file(app, &mastra_dir)? {
        command.env(name, value);
    }

    command.env("APPRECON_AI_PROVIDER", settings.provider.trim());
    command.env("APPRECON_AI_MODEL", settings.model.trim());

    let process = command
        .spawn()
        .map_err(|error| format!("Failed to start Mastra: {}", error))?;

    {
        let mut child = state
            .child
            .lock()
            .map_err(|_| "Failed to lock Mastra process state".to_string())?;
        *child = Some(process);
    }

    mastra_status(app, state)
}

fn is_mastra_url_listening(mastra_url: &str) -> bool {
    let Ok(parsed_url) = url::Url::parse(mastra_url) else {
        return false;
    };
    let Some(host) = parsed_url.host_str() else {
        return false;
    };
    let Some(port) = parsed_url.port_or_known_default() else {
        return false;
    };

    let Ok(mut addresses) = (host, port).to_socket_addrs() else {
        return false;
    };
    addresses
        .any(|address| TcpStream::connect_timeout(&address, Duration::from_millis(250)).is_ok())
}

fn find_mastra_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let mut candidates = Vec::new();

    if let Ok(current_dir) = std::env::current_dir() {
        candidates.push(current_dir.join("mastra"));
        candidates.push(current_dir.join("..").join("mastra"));
    }

    if let Ok(resource_dir) = app.path().resource_dir() {
        candidates.push(resource_dir.join("mastra"));
    }

    candidates
        .into_iter()
        .find(|candidate| candidate.join("package.json").exists())
        .ok_or_else(|| {
            "Mastra folder not found. Expected a mastra/package.json near the app.".to_string()
        })
}

fn find_ai_engine_script(app: &AppHandle) -> Result<PathBuf, String> {
    let mut candidates = Vec::new();

    if let Ok(current_dir) = std::env::current_dir() {
        candidates.push(current_dir.join("scripts/ai-engine/index.mjs"));
        candidates.push(current_dir.join("../scripts/ai-engine/index.mjs"));
    }

    if let Ok(resource_dir) = app.path().resource_dir() {
        candidates.push(resource_dir.join("scripts/ai-engine/index.mjs"));
        candidates.push(resource_dir.join("scripts/ai-browser-sidecar/index.mjs"));
    }

    candidates
        .into_iter()
        .find(|candidate| candidate.exists())
        .ok_or_else(|| "AI engine script not found".to_string())
}

fn read_mastra_env_file(
    app: &AppHandle,
    mastra_dir: &std::path::Path,
) -> Result<Vec<(String, String)>, String> {
    let mut candidates = Vec::new();

    if let Ok(current_dir) = std::env::current_dir() {
        candidates.push(current_dir.join(".env.mastra.local"));
    }

    if let Some(workspace_dir) = mastra_dir.parent() {
        candidates.push(workspace_dir.join(".env.mastra.local"));
    }

    if let Ok(resource_dir) = app.path().resource_dir() {
        candidates.push(resource_dir.join(".env.mastra.local"));
    }

    let Some(path) = candidates.into_iter().find(|candidate| candidate.exists()) else {
        return Ok(Vec::new());
    };

    let content = std::fs::read_to_string(&path)
        .map_err(|error| format!("Failed to read {}: {}", path.display(), error))?;

    Ok(content.lines().filter_map(parse_env_line).collect())
}

fn parse_env_line(line: &str) -> Option<(String, String)> {
    let line = line.trim();
    if line.is_empty() || line.starts_with('#') {
        return None;
    }

    let (name, value) = line.split_once('=')?;
    let name = name.trim();
    if name.is_empty() {
        return None;
    }

    Some((name.to_string(), trim_env_value(value)))
}

fn trim_env_value(value: &str) -> String {
    let value = value.trim();
    if value.len() >= 2 {
        let first = value.as_bytes()[0];
        let last = value.as_bytes()[value.len() - 1];
        if (first == b'"' && last == b'"') || (first == b'\'' && last == b'\'') {
            return value[1..value.len() - 1].to_string();
        }
    }

    value.to_string()
}

pub(crate) fn api_key_env_name(provider: &str) -> Result<&'static str, String> {
    match provider {
        "openai" => Ok("OPENAI_API_KEY"),
        "deepseek" => Ok("DEEPSEEK_API_KEY"),
        _ => Err(format!("Unsupported AI provider: {}", provider)),
    }
}
