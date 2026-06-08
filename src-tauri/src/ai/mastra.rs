use std::net::{TcpStream, ToSocketAddrs};
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::time::Duration;
use tauri::{AppHandle, Manager, State};

use super::settings::read_ai_settings;
use super::types::{MastraProcessState, MastraStatus};

pub(crate) fn get_mastra_status_impl(
    app: AppHandle,
    state: State<'_, MastraProcessState>,
) -> Result<MastraStatus, String> {
    mastra_status(&app, &state)
}

pub(crate) fn start_mastra_impl(
    app: AppHandle,
    state: State<'_, MastraProcessState>,
) -> Result<MastraStatus, String> {
    start_mastra_process(&app, &state)
}

pub(crate) fn stop_mastra_impl(
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
