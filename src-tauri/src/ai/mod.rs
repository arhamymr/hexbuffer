use serde::{Deserialize, Serialize};
use std::net::{TcpStream, ToSocketAddrs};
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::time::Duration;
use tauri::{AppHandle, Manager, State};

const KEYRING_SERVICE: &str = "seven_project";
const KEYRING_OPENAI_ACCOUNT: &str = "openai-api-key";
const KEYRING_DEEPSEEK_ACCOUNT: &str = "deepseek-api-key";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiSettings {
    pub provider: String,
    pub model: String,
    #[serde(default, skip_serializing)]
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
    if !settings.api_key.trim().is_empty() {
        write_api_key(&settings.provider, settings.api_key.trim())?;
        settings.has_api_key = true;
    } else {
        settings.has_api_key = read_api_key(&settings.provider).is_ok_and(|key| !key.is_empty());
    }

    settings.api_key.clear();
    write_ai_settings(&app, &settings)?;
    read_ai_settings(&app)
}

#[tauri::command]
pub fn has_ai_api_key(provider: String) -> Result<bool, String> {
    Ok(read_api_key(&provider).is_ok_and(|key| !key.is_empty()))
}

#[tauri::command]
pub fn clear_ai_api_key(app: AppHandle) -> Result<AiSettings, String> {
    let mut settings = read_ai_settings(&app)?;
    delete_api_key(&settings.provider)?;
    settings.api_key.clear();
    settings.has_api_key = false;
    write_ai_settings(&app, &settings)?;
    Ok(settings)
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

fn read_ai_settings(app: &AppHandle) -> Result<AiSettings, String> {
    let path = ai_settings_path(app)?;
    let mut settings = if path.exists() {
        let content = std::fs::read_to_string(path).map_err(|error| error.to_string())?;
        serde_json::from_str(&content).map_err(|error| error.to_string())?
    } else {
        AiSettings::default()
    };

    settings.api_key.clear();
    settings.has_api_key = read_api_key(&settings.provider).is_ok_and(|key| !key.is_empty());
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

    if let Ok(api_key) = read_api_key(&settings.provider) {
        if !api_key.trim().is_empty() {
            command.env(api_key_env_name(&settings.provider)?, api_key.trim());
        }
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

fn provider_keyring_account(provider: &str) -> Result<&'static str, String> {
    match provider {
        "openai" => Ok(KEYRING_OPENAI_ACCOUNT),
        "deepseek" => Ok(KEYRING_DEEPSEEK_ACCOUNT),
        _ => Err(format!("Unsupported AI provider: {}", provider)),
    }
}

fn api_key_env_name(provider: &str) -> Result<&'static str, String> {
    match provider {
        "openai" => Ok("OPENAI_API_KEY"),
        "deepseek" => Ok("DEEPSEEK_API_KEY"),
        _ => Err(format!("Unsupported AI provider: {}", provider)),
    }
}

fn keyring_entry(provider: &str) -> Result<keyring::Entry, String> {
    keyring::Entry::new(KEYRING_SERVICE, provider_keyring_account(provider)?)
        .map_err(|error| error.to_string())
}

fn read_api_key(provider: &str) -> Result<String, String> {
    keyring_entry(provider)?
        .get_password()
        .map_err(|error| error.to_string())
}

fn write_api_key(provider: &str, api_key: &str) -> Result<(), String> {
    keyring_entry(provider)?
        .set_password(api_key)
        .map_err(|error| error.to_string())
}

fn delete_api_key(provider: &str) -> Result<(), String> {
    match keyring_entry(provider)?.delete_credential() {
        Ok(()) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()),
        Err(error) => Err(error.to_string()),
    }
}
