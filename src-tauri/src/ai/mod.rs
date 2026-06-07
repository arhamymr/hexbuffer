use keyring::{Entry, Error as KeyringError};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::BTreeMap;
use std::io::{BufRead, BufReader};
use std::net::{TcpStream, ToSocketAddrs};
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::{Mutex, OnceLock};
use std::time::Duration;
use tauri::{AppHandle, Manager, State};
use tauri_plugin_shell::ShellExt;

const AI_KEYRING_SERVICE: &str = "0xbuffer.ai";
const AI_PROVIDERS: [&str; 2] = ["openai", "deepseek"];
static AI_API_KEY_CACHE: OnceLock<Mutex<BTreeMap<String, String>>> = OnceLock::new();

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiSettings {
    pub provider: String,
    pub model: String,
    #[serde(default)]
    pub api_key: String,
    #[serde(default)]
    pub has_api_key: bool,
    #[serde(default)]
    pub provider_key_status: BTreeMap<String, bool>,
    #[serde(default)]
    pub allow_third_party_ai_sharing: bool,
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
            provider_key_status: default_ai_key_status(),
            allow_third_party_ai_sharing: false,
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
pub fn get_ai_key_status(app: AppHandle) -> Result<BTreeMap<String, bool>, String> {
    Ok(read_ai_settings(&app)?.provider_key_status)
}

#[tauri::command]
pub fn set_ai_api_key(
    app: AppHandle,
    provider: String,
    api_key: String,
) -> Result<BTreeMap<String, bool>, String> {
    let provider = normalize_ai_provider(&provider)?;
    let api_key = api_key.trim();
    if api_key.is_empty() {
        return Err(format!("No {} API key provided", provider));
    }

    keyring_entry(provider)?
        .set_password(api_key)
        .map_err(keyring_error)?;
    let saved_key = keyring_entry(provider)?
        .get_password()
        .map_err(|error| {
            format!(
                "{} The key was written, but the app could not read it back. Unlock Keychain Access, delete the stale 0xbuffer.ai {} item if needed, then save the key again.",
                keyring_error(error),
                provider
            )
        })?;
    cache_ai_api_key(provider, Some(saved_key))?;
    write_ai_key_status(&app, provider, true)
}

#[tauri::command]
pub fn clear_ai_api_key(
    app: AppHandle,
    provider: String,
) -> Result<BTreeMap<String, bool>, String> {
    let provider = normalize_ai_provider(&provider)?;
    match keyring_entry(provider)?.delete_credential() {
        Ok(()) | Err(KeyringError::NoEntry) => {
            cache_ai_api_key(provider, None)?;
            write_ai_key_status(&app, provider, false)
        }
        Err(error) => Err(keyring_error(error)),
    }
}

#[tauri::command]
pub fn save_ai_settings(app: AppHandle, settings: AiSettings) -> Result<AiSettings, String> {
    let mut settings = settings;
    // API keys are managed by the OS credential store.
    settings.api_key.clear();
    settings.provider_key_status = read_ai_settings(&app)?.provider_key_status;
    write_ai_settings(&app, &settings)?;
    read_ai_settings(&app)
}

#[tauri::command]
pub async fn send_ai_chat_message(
    app: AppHandle,
    history: State<'_, crate::HistoryBridge>,
    request: AiChatRequest,
) -> Result<AiChatResponse, String> {
    let settings = read_ai_settings(&app)?;
    ensure_third_party_ai_sharing_allowed(&settings)?;
    let api_key = read_required_ai_api_key(&settings.provider)?;

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

pub(crate) fn ensure_third_party_ai_sharing_allowed(settings: &AiSettings) -> Result<(), String> {
    if settings.allow_third_party_ai_sharing {
        return Ok(());
    }

    Err(
        "Third-party AI sharing is disabled. Enable it in Settings before sending prompts, chat messages, crawl context, page summaries, logs, insights, URLs, or analysis context to OpenAI or DeepSeek."
            .to_string(),
    )
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
    let output = tauri::async_runtime::block_on(
        app.shell()
            .sidecar("ai-engine")
            .map_err(|error| format!("Failed to prepare AI engine sidecar: {}", error))?
            .env("0XBUFFER_AI_ENGINE_MODE", "chat")
            .env(
                "0XBUFFER_AI_CHAT_REQUEST_JSON",
                serde_json::to_string(request).map_err(|error| error.to_string())?,
            )
            .env(
                "0XBUFFER_AI_CONTEXT_JSON",
                serde_json::to_string(context).map_err(|error| error.to_string())?,
            )
            .env("XBUFFER_AI_PROVIDER", settings.provider.trim())
            .env("0XBUFFER_AI_MODEL", settings.model.trim())
            .env(api_key_env_name(&settings.provider)?, api_key.trim())
            .output(),
    )
    .map_err(|error| format!("Failed to run AI engine sidecar: {}", error))?;
    let stdout = String::from_utf8(output.stdout)
        .map_err(|error| format!("Invalid AI engine stdout: {}", error))?;
    let reader = BufReader::new(stdout.as_bytes());
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

    if let Some(error) = failed {
        return Err(error);
    }
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!(
            "AI engine sidecar exited with code {:?}: {}",
            output.status.code(),
            stderr.trim()
        ));
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
    let legacy_has_api_key = settings.has_api_key;
    let had_provider_status = !settings.provider_key_status.is_empty();
    settings.provider_key_status = normalized_ai_key_status(settings.provider_key_status);
    if !had_provider_status && legacy_has_api_key {
        settings
            .provider_key_status
            .insert(settings.provider.trim().to_string(), true);
    }
    settings.has_api_key = settings
        .provider_key_status
        .get(settings.provider.trim())
        .copied()
        .unwrap_or(false);
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

    command.env("XBUFFER_AI_PROVIDER", settings.provider.trim());
    command.env("0XBUFFER_AI_MODEL", settings.model.trim());

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

pub(crate) fn read_optional_ai_api_key(provider: &str) -> Result<Option<String>, String> {
    let provider = normalize_ai_provider(provider)?;
    if let Some(key) = cached_ai_api_key(provider)? {
        return Ok(Some(key));
    }

    match keyring_entry(provider)?.get_password() {
        Ok(key) if key.trim().is_empty() => Ok(None),
        Ok(key) => {
            cache_ai_api_key(provider, Some(key.clone()))?;
            Ok(Some(key))
        }
        Err(KeyringError::NoEntry) => Ok(None),
        Err(error) => Err(keyring_error(error)),
    }
}

pub(crate) fn read_required_ai_api_key(provider: &str) -> Result<String, String> {
    read_optional_ai_api_key(provider)?
        .ok_or_else(|| format!("No {} API key saved in OS credential store", provider))
}

fn write_ai_key_status(
    app: &AppHandle,
    provider: &str,
    has_key: bool,
) -> Result<BTreeMap<String, bool>, String> {
    let mut settings = read_ai_settings(app)?;
    settings
        .provider_key_status
        .insert(provider.to_string(), has_key);
    settings.has_api_key = settings
        .provider_key_status
        .get(settings.provider.trim())
        .copied()
        .unwrap_or(false);
    write_ai_settings(app, &settings)?;
    Ok(settings.provider_key_status)
}

fn default_ai_key_status() -> BTreeMap<String, bool> {
    let mut status = BTreeMap::new();
    for provider in AI_PROVIDERS {
        status.insert(provider.to_string(), false);
    }
    status
}

fn normalized_ai_key_status(mut status: BTreeMap<String, bool>) -> BTreeMap<String, bool> {
    for provider in AI_PROVIDERS {
        status.entry(provider.to_string()).or_insert(false);
    }
    status
}

fn keyring_entry(provider: &str) -> Result<Entry, String> {
    Entry::new(AI_KEYRING_SERVICE, provider).map_err(keyring_error)
}

fn ai_api_key_cache() -> &'static Mutex<BTreeMap<String, String>> {
    AI_API_KEY_CACHE.get_or_init(|| Mutex::new(BTreeMap::new()))
}

fn cached_ai_api_key(provider: &str) -> Result<Option<String>, String> {
    Ok(ai_api_key_cache()
        .lock()
        .map_err(|_| "Failed to lock AI API key cache".to_string())?
        .get(provider)
        .cloned()
        .filter(|key| !key.trim().is_empty()))
}

fn cache_ai_api_key(provider: &str, api_key: Option<String>) -> Result<(), String> {
    let mut cache = ai_api_key_cache()
        .lock()
        .map_err(|_| "Failed to lock AI API key cache".to_string())?;

    if let Some(api_key) = api_key.filter(|key| !key.trim().is_empty()) {
        cache.insert(provider.to_string(), api_key);
    } else {
        cache.remove(provider);
    }

    Ok(())
}

fn normalize_ai_provider(provider: &str) -> Result<&str, String> {
    let provider = provider.trim();
    match provider {
        "openai" | "deepseek" => Ok(provider),
        _ => Err(format!("Unsupported AI provider: {}", provider)),
    }
}

fn keyring_error(error: KeyringError) -> String {
    let message = error.to_string();
    if message.contains("Platform secure storage failure") {
        return format!(
            "OS credential store error: {}. Unlock Keychain Access and re-save the API key. If it keeps failing, delete the stale 0xbuffer.ai item for this provider from Keychain Access, then save the key again.",
            message
        );
    }

    format!("OS credential store error: {}", message)
}
