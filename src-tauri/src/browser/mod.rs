use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use tauri::{AppHandle, State};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BrowserSnapshot {
    pub url: String,
    pub title: String,
    pub elements: Vec<AccessibilityElement>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AccessibilityElement {
    pub ref_id: String,
    pub role: String,
    pub name: String,
    pub value: Option<String>,
    pub interactive: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BrowserStatus {
    pub running: bool,
    pub url: Option<String>,
    pub pid: Option<u32>,
}

#[derive(Default)]
pub struct BrowserProcessState {
    child: Mutex<Option<Child>>,
    session_name: Mutex<String>,
}

fn find_agent_browser(_app: &AppHandle) -> Result<String, String> {
    let candidates = vec![
        PathBuf::from("agent-browser"),
        PathBuf::from("/usr/local/bin/agent-browser"),
        PathBuf::from("/opt/homebrew/bin/agent-browser"),
    ];

    for candidate in &candidates {
        if candidate.exists() {
            return Ok(candidate.to_string_lossy().to_string());
        }
    }

    let output = Command::new("which").arg("agent-browser").output().ok();
    if let Some(out) = output {
        if out.status.success() {
            return Ok(String::from_utf8_lossy(&out.stdout).trim().to_string());
        }
    }

    Err("agent-browser not found. Please install it with: npm install -g agent-browser".to_string())
}

#[tauri::command]
pub fn get_browser_status(
    _app: AppHandle,
    state: State<'_, BrowserProcessState>,
) -> Result<BrowserStatus, String> {
    let mut child = state
        .child
        .lock()
        .map_err(|_| "Failed to lock browser process state".to_string())?;

    if let Some(ref mut process) = *child {
        if process.try_wait().map_err(|e| e.to_string())?.is_some() {
            *child = None;
        }
    }

    let running = child.is_some();
    let pid = child.as_ref().map(|p| p.id());

    let session = state
        .session_name
        .lock()
        .map_err(|_| "Failed to lock session name".to_string())?;
    let session_name = session.clone();
    drop(session);

    let url = if running {
        Some(get_current_url_from_session(&session_name))
    } else {
        None
    };

    Ok(BrowserStatus {
        running,
        url,
        pid,
    })
}

fn get_current_url_from_session(_session: &str) -> String {
    String::new()
}

#[tauri::command]
pub fn browser_open(
    app: AppHandle,
    state: State<'_, BrowserProcessState>,
    url: String,
) -> Result<BrowserStatus, String> {
    let browser_path = find_agent_browser(&app)?;

    {
        let mut child = state
            .child
            .lock()
            .map_err(|_| "Failed to lock browser process state".to_string())?;

        if let Some(mut process) = child.take() {
            let _ = process.kill();
            let _ = process.wait();
        }

        let proxy_port = 8888;
        let mut command = Command::new(&browser_path);
        command
            .args(["open", &url])
            .arg("--args")
            .arg(format!("--proxy-server=http://localhost:{}", proxy_port))
            .arg("--session")
            .arg("apprecon-browser")
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());

        let spawned = command
            .spawn()
            .map_err(|e| format!("Failed to start browser: {}", e))?;

        *child = Some(spawned);
    }

    {
        let mut session = state
            .session_name
            .lock()
            .map_err(|_| "Failed to lock session name".to_string())?;
        *session = "apprecon-browser".to_string();
    }

    get_browser_status(app, state)
}

#[tauri::command]
pub fn browser_close(
    app: AppHandle,
    state: State<'_, BrowserProcessState>,
) -> Result<BrowserStatus, String> {
    {
        let mut child = state
            .child
            .lock()
            .map_err(|_| "Failed to lock browser process state".to_string())?;

        if let Some(mut process) = child.take() {
            let _ = process.kill();
            let _ = process.wait();
        }
    }

    get_browser_status(app, state)
}

#[tauri::command]
pub fn browser_snapshot(app: AppHandle, state: State<'_, BrowserProcessState>) -> Result<BrowserSnapshot, String> {
    let browser_path = find_agent_browser(&app)?;

    let session = {
        let s = state
            .session_name
            .lock()
            .map_err(|_| "Failed to lock session name".to_string())?;
        s.clone()
    };

    let output = Command::new(&browser_path)
        .args(["--session", &session, "snapshot", "-i"])
        .output()
        .map_err(|e| format!("Failed to run snapshot: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Snapshot failed: {}", stderr));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    parse_snapshot(&stdout)
}

#[tauri::command]
pub fn browser_click(
    app: AppHandle,
    state: State<'_, BrowserProcessState>,
    ref_id: String,
) -> Result<(), String> {
    let browser_path = find_agent_browser(&app)?;

    let session = {
        let s = state
            .session_name
            .lock()
            .map_err(|_| "Failed to lock session name".to_string())?;
        s.clone()
    };

    let output = Command::new(&browser_path)
        .args(["--session", &session, "click", &format!("@{}", ref_id)])
        .output()
        .map_err(|e| format!("Failed to click: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Click failed: {}", stderr));
    }

    Ok(())
}

#[tauri::command]
pub fn browser_fill(
    app: AppHandle,
    state: State<'_, BrowserProcessState>,
    ref_id: String,
    text: String,
) -> Result<(), String> {
    let browser_path = find_agent_browser(&app)?;

    let session = {
        let s = state
            .session_name
            .lock()
            .map_err(|_| "Failed to lock session name".to_string())?;
        s.clone()
    };

    let output = Command::new(&browser_path)
        .args(["--session", &session, "fill", &format!("@{}", ref_id), &text])
        .output()
        .map_err(|e| format!("Failed to fill: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Fill failed: {}", stderr));
    }

    Ok(())
}

#[tauri::command]
pub fn browser_navigate(
    app: AppHandle,
    state: State<'_, BrowserProcessState>,
    url: String,
) -> Result<(), String> {
    let browser_path = find_agent_browser(&app)?;

    let session = {
        let s = state
            .session_name
            .lock()
            .map_err(|_| "Failed to lock session name".to_string())?;
        s.clone()
    };

    let output = Command::new(&browser_path)
        .args(["--session", &session, "goto", &url])
        .output()
        .map_err(|e| format!("Failed to navigate: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Navigate failed: {}", stderr));
    }

    Ok(())
}

#[tauri::command]
pub fn browser_type(
    app: AppHandle,
    state: State<'_, BrowserProcessState>,
    ref_id: String,
    text: String,
) -> Result<(), String> {
    let browser_path = find_agent_browser(&app)?;

    let session = {
        let s = state
            .session_name
            .lock()
            .map_err(|_| "Failed to lock session name".to_string())?;
        s.clone()
    };

    let output = Command::new(&browser_path)
        .args(["--session", &session, "type", &format!("@{}", ref_id), &text])
        .output()
        .map_err(|e| format!("Failed to type: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Type failed: {}", stderr));
    }

    Ok(())
}

#[tauri::command]
pub fn browser_press(
    app: AppHandle,
    state: State<'_, BrowserProcessState>,
    key: String,
) -> Result<(), String> {
    let browser_path = find_agent_browser(&app)?;

    let session = {
        let s = state
            .session_name
            .lock()
            .map_err(|_| "Failed to lock session name".to_string())?;
        s.clone()
    };

    let output = Command::new(&browser_path)
        .args(["--session", &session, "press", &key])
        .output()
        .map_err(|e| format!("Failed to press key: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Press failed: {}", stderr));
    }

    Ok(())
}

#[tauri::command]
pub fn browser_screenshot(
    app: AppHandle,
    state: State<'_, BrowserProcessState>,
    path: String,
) -> Result<String, String> {
    let browser_path = find_agent_browser(&app)?;

    let session = {
        let s = state
            .session_name
            .lock()
            .map_err(|_| "Failed to lock session name".to_string())?;
        s.clone()
    };

    let output = Command::new(&browser_path)
        .args(["--session", &session, "screenshot", &path])
        .output()
        .map_err(|e| format!("Failed to take screenshot: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Screenshot failed: {}", stderr));
    }

    Ok(path)
}

#[tauri::command]
pub fn browser_batch(
    app: AppHandle,
    state: State<'_, BrowserProcessState>,
    commands: Vec<String>,
) -> Result<String, String> {
    let browser_path = find_agent_browser(&app)?;

    let session = {
        let s = state
            .session_name
            .lock()
            .map_err(|_| "Failed to lock session name".to_string())?;
        s.clone()
    };

    let mut args = vec!["--session".to_string(), session, "batch".to_string()];
    for cmd in &commands {
        args.push(cmd.clone());
    }

    let output = Command::new(&browser_path)
        .args(&args)
        .output()
        .map_err(|e| format!("Failed to run batch: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Batch failed: {}", stderr));
    }

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

fn parse_snapshot(output: &str) -> Result<BrowserSnapshot, String> {
    let mut elements = Vec::new();
    let mut url = String::new();
    let mut title = String::new();

    for line in output.lines() {
        let line = line.trim();

        if line.starts_with("URL:") {
            url = line.replace("URL:", "").trim().to_string();
        } else if line.starts_with("Title:") {
            title = line.replace("Title:", "").trim().to_string();
        } else if line.starts_with("@e") || line.starts_with("[e") {
            if let Some(parsed) = parse_element_line(line) {
                elements.push(parsed);
            }
        }
    }

    if elements.is_empty() {
        for line in output.lines() {
            let line = line.trim();
            if line.starts_with('[') || line.starts_with('@') {
                if let Some(parsed) = parse_element_line(line) {
                    elements.push(parsed);
                }
            }
        }
    }

    Ok(BrowserSnapshot {
        url,
        title,
        elements,
    })
}

fn parse_element_line(line: &str) -> Option<AccessibilityElement> {
    let re = regex::Regex::new(r"[@\[]e?(\d+)\s+(\w+)\s+(.+?)(\s+=\s+(.*))?\]?$").ok()?;
    let caps = re.captures(line)?;

    let ref_id = caps.get(1)?.as_str().to_string();
    let role = caps.get(2)?.as_str().to_string();
    let name = caps.get(3)?.as_str().trim().to_string();
    let value = caps.get(5).map(|m| m.as_str().to_string());

    let interactive = matches!(
        role.as_str(),
        "button" | "link" | "textbox" | "checkbox" | "radio" | "select" | "combobox"
    );

    Some(AccessibilityElement {
        ref_id,
        role,
        name,
        value,
        interactive,
    })
}

#[tauri::command]
pub fn browser_execute(
    app: AppHandle,
    state: State<'_, BrowserProcessState>,
    instruction: String,
) -> Result<String, String> {
    let snapshot = browser_snapshot(app, state)?;

    let mut elements_str = String::new();
    for el in &snapshot.elements {
        elements_str.push_str(&format!(
            "@e{}: {} ({}) - {}\n",
            el.ref_id,
            el.role,
            el.name,
            el.value.as_deref().unwrap_or("")
        ));
    }

    let prompt = format!(
        "You are a browser automation AI. Given the current page and an instruction, return the commands to execute.\n\nCurrent page URL: {}\nTitle: {}\n\nInteractive elements:\n{}\n\nInstruction: {}\n\nRespond ONLY with a JSON array of commands to execute. Each command should be one of:\n- {{\"cmd\": \"click\", \"ref\": \"e1\"}}\n- {{\"cmd\": \"fill\", \"ref\": \"e2\", \"text\": \"value\"}}\n- {{\"cmd\": \"type\", \"ref\": \"e2\", \"text\": \"value\"}}\n- {{\"cmd\": \"navigate\", \"url\": \"https://...\"}}\n- {{\"cmd\": \"press\", \"key\": \"Enter\"}}\n\nDo not include any other text. Return empty array [] if the instruction is already complete.",
        snapshot.url, snapshot.title, elements_str, instruction
    );

    Ok(prompt)
}

pub fn init_browser_state(_app: &AppHandle) -> BrowserProcessState {
    BrowserProcessState::default()
}