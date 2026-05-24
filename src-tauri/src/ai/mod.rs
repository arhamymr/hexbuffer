use serde::{Deserialize, Serialize};
use std::net::{TcpStream, ToSocketAddrs};
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::time::Duration;
use tauri::{AppHandle, Manager, State};

const KEYRING_SERVICE: &str = "seven_project";
const KEYRING_OPENAI_ACCOUNT: &str = "openai-api-key";

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
        write_api_key(settings.api_key.trim())?;
        settings.has_api_key = true;
    } else {
        settings.has_api_key = read_api_key().is_ok_and(|key| !key.is_empty());
    }

    settings.api_key.clear();
    write_ai_settings(&app, &settings)?;
    read_ai_settings(&app)
}

#[tauri::command]
pub fn clear_ai_api_key(app: AppHandle) -> Result<AiSettings, String> {
    delete_api_key()?;
    let mut settings = read_ai_settings(&app)?;
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
    settings.has_api_key = read_api_key().is_ok_and(|key| !key.is_empty());
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
        .current_dir(mastra_dir)
        .stdout(Stdio::null())
        .stderr(Stdio::null());

    if let Ok(api_key) = read_api_key() {
        if !api_key.trim().is_empty() {
            command.env("OPENAI_API_KEY", api_key.trim());
        }
    }

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

fn keyring_entry() -> Result<keyring::Entry, String> {
    keyring::Entry::new(KEYRING_SERVICE, KEYRING_OPENAI_ACCOUNT).map_err(|error| error.to_string())
}

fn read_api_key() -> Result<String, String> {
    keyring_entry()?
        .get_password()
        .map_err(|error| error.to_string())
}

fn write_api_key(api_key: &str) -> Result<(), String> {
    keyring_entry()?
        .set_password(api_key)
        .map_err(|error| error.to_string())
}

fn delete_api_key() -> Result<(), String> {
    match keyring_entry()?.delete_credential() {
        Ok(()) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()),
        Err(error) => Err(error.to_string()),
    }
}
