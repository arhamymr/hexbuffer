use super::crawl_types::{ActivityLog, AIInsight, AiBrowserState, CrawlPage, CrawlSession};
use chrono::Utc;
use std::path::PathBuf;
use std::process::{Child, Command};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, Manager};

pub(crate) fn now() -> String {
    Utc::now().to_rfc3339()
}

pub(crate) fn normalize_strategy(_strategy: Option<String>) -> String {
    "bfs".to_string()
}

pub(crate) fn add_log(app: &AppHandle, state: &AiBrowserState, log: ActivityLog) {
    if let Ok(mut logs) = state.logs.lock() {
        logs.entry(log.session_id.clone())
            .or_default()
            .push(log.clone());
    }
    if let Err(error) = app
        .state::<crate::HistoryBridge>()
        .insert_ai_browser_log(&log)
    {
        eprintln!("[ai-browser] failed to persist log: {}", error);
    }
    let _ = app.emit("ai-browser:log-created", log);
}

pub(crate) fn persist_session(app: &AppHandle, session: &CrawlSession) {
    if let Err(error) = app
        .state::<crate::HistoryBridge>()
        .upsert_ai_browser_session(session)
    {
        eprintln!("[ai-browser] failed to persist session: {}", error);
    }
}

pub(crate) fn persist_page(app: &AppHandle, page: &CrawlPage) {
    if let Err(error) = app
        .state::<crate::HistoryBridge>()
        .upsert_ai_browser_page(page)
    {
        eprintln!("[ai-browser] failed to persist page: {}", error);
    }
}

pub(crate) fn persist_insight(app: &AppHandle, insight: &AIInsight) {
    if let Err(error) = app
        .state::<crate::HistoryBridge>()
        .insert_ai_browser_insight(insight)
    {
        eprintln!("[ai-browser] failed to persist insight: {}", error);
    }
}

pub(crate) fn update_session(
    app: &AppHandle,
    state: &AiBrowserState,
    session_id: &str,
    status: &str,
    finished_at: Option<String>,
) -> Result<CrawlSession, String> {
    let mut sessions = state
        .sessions
        .lock()
        .map_err(|_| "Failed to lock AI browser sessions".to_string())?;
    let session = sessions
        .get_mut(session_id)
        .ok_or_else(|| "Crawl session not found".to_string())?;

    session.status = status.to_string();
    if finished_at.is_some() {
        session.finished_at = finished_at;
    }

    let updated = session.clone();
    drop(sessions);

    persist_session(app, &updated);
    let _ = app.emit("ai-browser:session-updated", &updated);
    Ok(updated)
}

pub(crate) fn session_status(state: &AiBrowserState, session_id: &str) -> Option<String> {
    state.sessions.lock().ok().and_then(|sessions| {
        sessions
            .get(session_id)
            .map(|session| session.status.clone())
    })
}

pub(crate) fn is_terminal_status(status: &str) -> bool {
    matches!(status, "completed" | "failed" | "stopped")
}

#[cfg(unix)]
pub(crate) fn signal_child_process_group(child: &Arc<Mutex<Child>>, signal: &str) -> Result<(), String> {
    let pid = child
        .lock()
        .map_err(|_| "Failed to lock AI browser child process".to_string())?
        .id();
    let target = format!("-{}", pid);
    let status = Command::new("kill")
        .arg(signal)
        .arg(target)
        .status()
        .map_err(|error| format!("Failed to signal AI browser sidecar: {}", error))?;

    if status.success() {
        Ok(())
    } else {
        Err(format!(
            "Failed to signal AI browser sidecar with {}",
            signal
        ))
    }
}

#[cfg(not(unix))]
pub(crate) fn signal_child_process_group(_child: &Arc<Mutex<Child>>, _signal: &str) -> Result<(), String> {
    Err("Pause and resume are not supported on this platform yet".to_string())
}

pub(crate) fn kill_child_process_group(child: &Arc<Mutex<Child>>) {
    #[cfg(unix)]
    if signal_child_process_group(child, "-KILL").is_ok() {
        return;
    }

    if let Ok(mut child) = child.lock() {
        let _ = child.kill();
    }
}

pub(crate) fn find_sidecar_script(app: &AppHandle) -> Result<PathBuf, String> {
    let mut candidates = Vec::new();

    if let Ok(current_dir) = std::env::current_dir() {
        candidates.push(current_dir.join("scripts/ai-engine/index.mjs"));
        candidates.push(current_dir.join("scripts/ai-browser-sidecar/index.mjs"));
        candidates.push(current_dir.join("../scripts/ai-engine/index.mjs"));
        candidates.push(current_dir.join("../scripts/ai-browser-sidecar/index.mjs"));
    }

    if let Ok(resource_dir) = app.path().resource_dir() {
        candidates.push(resource_dir.join("scripts/ai-engine/index.mjs"));
        candidates.push(resource_dir.join("scripts/ai-browser-sidecar/index.mjs"));
    }

    candidates
        .into_iter()
        .find(|path| path.exists())
        .ok_or_else(|| "AI browser sidecar script not found".to_string())
}

pub(crate) fn upsert_page_memory(state: &AiBrowserState, page: CrawlPage) {
    if let Ok(mut pages) = state.pages.lock() {
        let session_pages = pages.entry(page.session_id.clone()).or_default();
        if let Some(existing) = session_pages.iter_mut().find(|item| item.id == page.id) {
            *existing = page;
        } else {
            session_pages.push(page);
        }
    }
}

pub(crate) fn existing_page(state: &AiBrowserState, session_id: &str, page_id: &str) -> Option<CrawlPage> {
    state.pages.lock().ok().and_then(|pages| {
        pages
            .get(session_id)
            .and_then(|items| items.iter().find(|page| page.id == page_id).cloned())
    })
}
