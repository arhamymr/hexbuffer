use crate::browser::crawl_helpers::{
    add_log, is_terminal_status, kill_child_process_group, normalize_strategy, now,
    persist_session, session_status, signal_child_process_group, update_session,
};
use crate::browser::crawl_sidecar::run_sidecar_crawl;
pub use crate::browser::{
    AIInsight, ActivityLog, AiBrowserState, CrawlConfig, CrawlPage, CrawlSession,
};

// ── Agent browser types ──
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc, Mutex,
};
use tauri::{AppHandle, Emitter, State};
use uuid::Uuid;

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

// ── Agent browser helpers ──

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

fn get_current_url_from_session(_session: &str) -> String {
    String::new()
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

// ── Agent browser commands ──

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

    Ok(BrowserStatus { running, url, pid })
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
            .arg("0xbuffer-browser")
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
        *session = "0xbuffer-browser".to_string();
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
pub fn browser_snapshot(
    app: AppHandle,
    state: State<'_, BrowserProcessState>,
) -> Result<BrowserSnapshot, String> {
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
        .args([
            "--session",
            &session,
            "fill",
            &format!("@{}", ref_id),
            &text,
        ])
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
        .args([
            "--session",
            &session,
            "type",
            &format!("@{}", ref_id),
            &text,
        ])
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

// ── AI Automation commands ──

#[tauri::command]
pub async fn ai_browser_start_crawl(
    app: AppHandle,
    state: State<'_, AiBrowserState>,
    config: CrawlConfig,
    session_id: Option<String>,
    api_key: String,
) -> Result<CrawlSession, String> {
    let proxy_port = crate::proxy::active_proxy_port().unwrap_or(0);
    if proxy_port == 0 {
        return Err(
            "The 0xbuffer proxy is not running. Start the proxy first, then retry the crawl."
                .to_string(),
        );
    }

    let session = CrawlSession {
        id: session_id.unwrap_or_else(|| format!("crawl-{}", Uuid::new_v4())),
        target_url: config.target_url.clone(),
        status: "running".to_string(),
        strategy: normalize_strategy(config.strategy.clone()),
        max_depth: config.max_depth,
        max_pages: config.max_pages,
        started_at: Some(now()),
        finished_at: None,
    };

    {
        let mut sessions = state
            .sessions
            .lock()
            .map_err(|_| "Failed to lock AI browser sessions".to_string())?;
        sessions.insert(session.id.clone(), session.clone());
    }
    {
        state
            .pages
            .lock()
            .map_err(|_| "Failed to lock AI browser pages".to_string())?
            .insert(session.id.clone(), Vec::new());
        state
            .insights
            .lock()
            .map_err(|_| "Failed to lock AI browser insights".to_string())?
            .insert(session.id.clone(), Vec::new());
        state
            .logs
            .lock()
            .map_err(|_| "Failed to lock AI browser logs".to_string())?
            .insert(session.id.clone(), Vec::new());
    }
    let cancel_flag = Arc::new(AtomicBool::new(false));
    state
        .cancellations
        .lock()
        .map_err(|_| "Failed to lock AI browser cancellations".to_string())?
        .insert(session.id.clone(), cancel_flag.clone());

    persist_session(&app, &session);
    let _ = app.emit("ai-browser:session-started", &session);
    add_log(
        &app,
        &state,
        ActivityLog {
            id: Uuid::new_v4().to_string(),
            session_id: session.id.clone(),
            level: "info".to_string(),
            r#type: "session".to_string(),
            message: format!("Started for {}", session.target_url),
            url: Some(session.target_url.clone()),
            ai_used_for_analysis: None,
            created_at: now(),
        },
    );

    let app_for_task = app.clone();
    let state_for_task = state.inner().clone();
    let session_id_for_task = session.id.clone();
    let api_key_for_task = api_key.clone();
    let cancel_flag_for_task = cancel_flag.clone();
    tauri::async_runtime::spawn(async move {
        let sidecar_result = {
            let app = app_for_task.clone();
            let state = state_for_task.clone();
            let config = config.clone();
            let session_id = session_id_for_task.clone();
            let cancel_flag = cancel_flag_for_task.clone();
            tauri::async_runtime::spawn_blocking(move || {
                run_sidecar_crawl(
                    &app,
                    &state,
                    &config,
                    &session_id,
                    &api_key_for_task,
                    cancel_flag,
                )
            })
            .await
            .map_err(|error| error.to_string())
            .and_then(|result| result)
        };

        if let Ok(mut cancellations) = state_for_task.cancellations.lock() {
            cancellations.remove(&session_id_for_task);
        }
        if let Ok(mut children) = state_for_task.children.lock() {
            children.remove(&session_id_for_task);
        }

        if let Err(error) = sidecar_result {
            if session_status(&state_for_task, &session_id_for_task)
                .as_deref()
                .map(is_terminal_status)
                .unwrap_or(false)
            {
                return;
            }
            let finished_at = now();
            let _ = update_session(
                &app_for_task,
                &state_for_task,
                &session_id_for_task,
                "failed",
                Some(finished_at),
            );
            add_log(
                &app_for_task,
                &state_for_task,
                ActivityLog {
                    id: Uuid::new_v4().to_string(),
                    session_id: session_id_for_task.clone(),
                    level: "error".to_string(),
                    r#type: "error".to_string(),
                    message: format!("Sidecar crawl failed: {}", error),
                    url: None,
                    ai_used_for_analysis: None,
                    created_at: now(),
                },
            );
            let _ = app_for_task.emit(
                "ai-browser:session-failed",
                serde_json::json!({ "sessionId": session_id_for_task, "message": error }),
            );
        }
    });

    Ok(session)
}

#[tauri::command]
pub async fn ai_browser_pause_crawl(
    app: AppHandle,
    state: State<'_, AiBrowserState>,
    session_id: String,
) -> Result<(), String> {
    if session_status(&state, &session_id)
        .as_deref()
        .map(is_terminal_status)
        .unwrap_or(false)
    {
        return Ok(());
    }

    if let Some(child) = state
        .children
        .lock()
        .map_err(|_| "Failed to lock AI browser child processes".to_string())?
        .get(&session_id)
        .cloned()
    {
        signal_child_process_group(&child, "-STOP")?;
    }

    update_session(&app, &state, &session_id, "paused", None)?;
    add_log(
        &app,
        &state,
        ActivityLog {
            id: Uuid::new_v4().to_string(),
            session_id,
            level: "info".to_string(),
            r#type: "session".to_string(),
            message: "Paused crawl".to_string(),
            url: None,
            ai_used_for_analysis: None,
            created_at: now(),
        },
    );
    Ok(())
}

#[tauri::command]
pub async fn ai_browser_resume_crawl(
    app: AppHandle,
    state: State<'_, AiBrowserState>,
    session_id: String,
) -> Result<(), String> {
    if session_status(&state, &session_id)
        .as_deref()
        .map(is_terminal_status)
        .unwrap_or(false)
    {
        return Ok(());
    }

    if let Some(child) = state
        .children
        .lock()
        .map_err(|_| "Failed to lock AI browser child processes".to_string())?
        .get(&session_id)
        .cloned()
    {
        signal_child_process_group(&child, "-CONT")?;
    }

    update_session(&app, &state, &session_id, "running", None)?;
    add_log(
        &app,
        &state,
        ActivityLog {
            id: Uuid::new_v4().to_string(),
            session_id,
            level: "info".to_string(),
            r#type: "session".to_string(),
            message: "Resumed crawl".to_string(),
            url: None,
            ai_used_for_analysis: None,
            created_at: now(),
        },
    );
    Ok(())
}

#[tauri::command]
pub async fn ai_browser_stop_crawl(
    app: AppHandle,
    state: State<'_, AiBrowserState>,
    session_id: String,
) -> Result<(), String> {
    if let Some(cancel_flag) = state
        .cancellations
        .lock()
        .map_err(|_| "Failed to lock AI browser cancellations".to_string())?
        .remove(&session_id)
    {
        cancel_flag.store(true, Ordering::SeqCst);
    }

    if let Some(child) = state
        .children
        .lock()
        .map_err(|_| "Failed to lock AI browser child processes".to_string())?
        .remove(&session_id)
    {
        kill_child_process_group(&child);
    }

    update_session(&app, &state, &session_id, "stopped", Some(now()))?;
    add_log(
        &app,
        &state,
        ActivityLog {
            id: Uuid::new_v4().to_string(),
            session_id,
            level: "warning".to_string(),
            r#type: "session".to_string(),
            message: "Stopped crawl".to_string(),
            url: None,
            ai_used_for_analysis: None,
            created_at: now(),
        },
    );
    Ok(())
}

#[tauri::command]
pub async fn get_ai_browser_session(
    state: State<'_, AiBrowserState>,
    history: State<'_, crate::HistoryBridge>,
    session_id: String,
) -> Result<CrawlSession, String> {
    if let Some(session) = history.get_ai_browser_session(&session_id)? {
        return Ok(session);
    }

    state
        .sessions
        .lock()
        .map_err(|_| "Failed to lock AI browser sessions".to_string())?
        .get(&session_id)
        .cloned()
        .ok_or_else(|| "Automation session not found".to_string())
}

#[tauri::command]
pub async fn list_ai_browser_pages(
    state: State<'_, AiBrowserState>,
    history: State<'_, crate::HistoryBridge>,
    session_id: String,
) -> Result<Vec<CrawlPage>, String> {
    let persisted = history.list_ai_browser_pages(&session_id)?;
    if !persisted.is_empty() {
        return Ok(persisted);
    }

    Ok(state
        .pages
        .lock()
        .map_err(|_| "Failed to lock AI browser pages".to_string())?
        .get(&session_id)
        .cloned()
        .unwrap_or_default())
}

#[tauri::command]
pub async fn list_ai_browser_insights(
    state: State<'_, AiBrowserState>,
    history: State<'_, crate::HistoryBridge>,
    session_id: String,
) -> Result<Vec<AIInsight>, String> {
    let persisted = history.list_ai_browser_insights(&session_id)?;
    if !persisted.is_empty() {
        return Ok(persisted);
    }

    Ok(state
        .insights
        .lock()
        .map_err(|_| "Failed to lock AI browser insights".to_string())?
        .get(&session_id)
        .cloned()
        .unwrap_or_default())
}

#[tauri::command]
pub async fn list_ai_browser_logs(
    state: State<'_, AiBrowserState>,
    history: State<'_, crate::HistoryBridge>,
    session_id: String,
) -> Result<Vec<ActivityLog>, String> {
    let persisted = history.list_ai_browser_logs(&session_id)?;
    if !persisted.is_empty() {
        return Ok(persisted);
    }

    Ok(state
        .logs
        .lock()
        .map_err(|_| "Failed to lock AI browser logs".to_string())?
        .get(&session_id)
        .cloned()
        .unwrap_or_default())
}

#[tauri::command]
pub async fn list_recent_ai_browser_sessions(
    history: State<'_, crate::HistoryBridge>,
    limit: Option<u32>,
) -> Result<Vec<CrawlSession>, String> {
    history.list_recent_ai_browser_sessions(limit.unwrap_or(20))
}

pub fn init_browser_state(_app: &AppHandle) -> BrowserProcessState {
    BrowserProcessState::default()
}
