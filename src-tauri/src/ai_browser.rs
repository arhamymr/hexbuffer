use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::{BufRead, BufReader};
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, Manager, State};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CrawlConfig {
    pub target_url: String,
    pub strategy: Option<String>,
    pub max_depth: u32,
    pub max_pages: u32,
    pub same_domain_only: bool,
    pub include_paths: Option<String>,
    pub exclude_paths: Option<String>,
    pub request_delay_ms: u64,
    pub timeout_ms: u64,
    pub enable_ai_insights: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CrawlSession {
    pub id: String,
    pub target_url: String,
    pub status: String,
    pub strategy: String,
    pub max_depth: u32,
    pub max_pages: u32,
    pub started_at: Option<String>,
    pub finished_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CrawlPage {
    pub id: String,
    pub session_id: String,
    pub url: String,
    pub title: Option<String>,
    pub status: String,
    pub depth: u32,
    pub parent_url: Option<String>,
    pub http_status: Option<u16>,
    pub links_found: u32,
    pub forms_found: u32,
    pub discovered_at: String,
    pub visited_at: Option<String>,
    pub ai_summary: Option<String>,
    pub interesting: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AIInsight {
    pub id: String,
    pub session_id: String,
    pub page_id: Option<String>,
    pub severity: String,
    pub r#type: String,
    pub title: String,
    pub description: String,
    pub url: Option<String>,
    pub reviewed: bool,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ActivityLog {
    pub id: String,
    pub session_id: String,
    pub level: String,
    pub r#type: String,
    pub message: String,
    pub url: Option<String>,
    pub created_at: String,
}

#[derive(Default, Clone)]
pub struct AiBrowserState {
    sessions: Arc<Mutex<HashMap<String, CrawlSession>>>,
    pages: Arc<Mutex<HashMap<String, Vec<CrawlPage>>>>,
    insights: Arc<Mutex<HashMap<String, Vec<AIInsight>>>>,
    logs: Arc<Mutex<HashMap<String, Vec<ActivityLog>>>>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SidecarMessage {
    #[serde(rename = "type")]
    message_type: String,
    id: Option<String>,
    session_id: Option<String>,
    page_id: Option<String>,
    url: Option<String>,
    parent_url: Option<String>,
    title: Option<String>,
    status: Option<String>,
    depth: Option<u32>,
    http_status: Option<u16>,
    links_found: Option<u32>,
    forms_found: Option<u32>,
    discovered_at: Option<String>,
    visited_at: Option<String>,
    ai_summary: Option<String>,
    interesting: Option<bool>,
    level: Option<String>,
    log_type: Option<String>,
    insight_type: Option<String>,
    severity: Option<String>,
    message: Option<String>,
    description: Option<String>,
    created_at: Option<String>,
    finished_at: Option<String>,
}

fn now() -> String {
    Utc::now().to_rfc3339()
}

fn normalize_strategy(_strategy: Option<String>) -> String {
    "bfs".to_string()
}

fn page_id() -> String {
    format!("page-{}", Uuid::new_v4())
}

fn add_log(app: &AppHandle, state: &AiBrowserState, log: ActivityLog) {
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

fn persist_session(app: &AppHandle, session: &CrawlSession) {
    if let Err(error) = app
        .state::<crate::HistoryBridge>()
        .upsert_ai_browser_session(session)
    {
        eprintln!("[ai-browser] failed to persist session: {}", error);
    }
}

fn persist_page(app: &AppHandle, page: &CrawlPage) {
    if let Err(error) = app
        .state::<crate::HistoryBridge>()
        .upsert_ai_browser_page(page)
    {
        eprintln!("[ai-browser] failed to persist page: {}", error);
    }
}

fn persist_insight(app: &AppHandle, insight: &AIInsight) {
    if let Err(error) = app
        .state::<crate::HistoryBridge>()
        .insert_ai_browser_insight(insight)
    {
        eprintln!("[ai-browser] failed to persist insight: {}", error);
    }
}

fn update_session(
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

fn find_sidecar_script(app: &AppHandle) -> Result<PathBuf, String> {
    let mut candidates = Vec::new();

    if let Ok(current_dir) = std::env::current_dir() {
        candidates.push(current_dir.join("scripts/ai-browser-sidecar/index.mjs"));
        candidates.push(current_dir.join("../scripts/ai-browser-sidecar/index.mjs"));
    }

    if let Ok(resource_dir) = app.path().resource_dir() {
        candidates.push(resource_dir.join("scripts/ai-browser-sidecar/index.mjs"));
    }

    candidates
        .into_iter()
        .find(|path| path.exists())
        .ok_or_else(|| "AI browser sidecar script not found".to_string())
}

fn upsert_page_memory(state: &AiBrowserState, page: CrawlPage) {
    if let Ok(mut pages) = state.pages.lock() {
        let session_pages = pages.entry(page.session_id.clone()).or_default();
        if let Some(existing) = session_pages.iter_mut().find(|item| item.id == page.id) {
            *existing = page;
        } else {
            session_pages.push(page);
        }
    }
}

fn existing_page(state: &AiBrowserState, session_id: &str, page_id: &str) -> Option<CrawlPage> {
    state.pages.lock().ok().and_then(|pages| {
        pages
            .get(session_id)
            .and_then(|items| items.iter().find(|page| page.id == page_id).cloned())
    })
}

fn apply_sidecar_message(
    app: &AppHandle,
    state: &AiBrowserState,
    session_id: &str,
    message: SidecarMessage,
) -> Result<(), String> {
    match message.message_type.as_str() {
        "page_discovered" => {
            let page = CrawlPage {
                id: message.id.unwrap_or_else(page_id),
                session_id: message.session_id.unwrap_or_else(|| session_id.to_string()),
                url: message
                    .url
                    .ok_or_else(|| "page_discovered missing url".to_string())?,
                title: message.title,
                status: "queued".to_string(),
                depth: message.depth.unwrap_or(0),
                parent_url: message.parent_url,
                http_status: None,
                links_found: 0,
                forms_found: 0,
                discovered_at: message.discovered_at.unwrap_or_else(now),
                visited_at: None,
                ai_summary: None,
                interesting: Some(false),
            };
            upsert_page_memory(state, page.clone());
            persist_page(app, &page);
            let _ = app.emit("ai-browser:page-discovered", &page);
        }
        "page_visited" => {
            let page_id = message.id.clone().unwrap_or_else(page_id);
            let base = existing_page(state, session_id, &page_id);
            let http_status = message.http_status;
            let page = CrawlPage {
                id: page_id,
                session_id: message.session_id.unwrap_or_else(|| session_id.to_string()),
                url: message
                    .url
                    .or_else(|| base.as_ref().map(|page| page.url.clone()))
                    .ok_or_else(|| "page_visited missing url".to_string())?,
                title: message
                    .title
                    .or_else(|| base.as_ref().and_then(|page| page.title.clone())),
                status: message.status.unwrap_or_else(|| {
                    if http_status.unwrap_or_default() >= 500 {
                        "error".to_string()
                    } else if http_status.unwrap_or_default() >= 400 {
                        "blocked".to_string()
                    } else {
                        "visited".to_string()
                    }
                }),
                depth: message
                    .depth
                    .or_else(|| base.as_ref().map(|page| page.depth))
                    .unwrap_or(0),
                parent_url: message
                    .parent_url
                    .or_else(|| base.as_ref().and_then(|page| page.parent_url.clone())),
                http_status,
                links_found: message.links_found.unwrap_or(0),
                forms_found: message.forms_found.unwrap_or(0),
                discovered_at: message
                    .discovered_at
                    .or_else(|| base.as_ref().map(|page| page.discovered_at.clone()))
                    .unwrap_or_else(now),
                visited_at: Some(message.visited_at.unwrap_or_else(now)),
                ai_summary: message.ai_summary,
                interesting: Some(message.interesting.unwrap_or(false)),
            };
            upsert_page_memory(state, page.clone());
            persist_page(app, &page);
            let _ = app.emit("ai-browser:page-updated", &page);
        }
        "insight_created" => {
            let insight = AIInsight {
                id: message.id.unwrap_or_else(|| Uuid::new_v4().to_string()),
                session_id: message.session_id.unwrap_or_else(|| session_id.to_string()),
                page_id: message.page_id,
                severity: message.severity.unwrap_or_else(|| "info".to_string()),
                r#type: message
                    .insight_type
                    .unwrap_or_else(|| "interesting-page".to_string()),
                title: message.title.unwrap_or_else(|| "Insight".to_string()),
                description: message.description.unwrap_or_default(),
                url: message.url,
                reviewed: false,
                created_at: message.created_at.unwrap_or_else(now),
            };
            if let Ok(mut insights) = state.insights.lock() {
                insights
                    .entry(insight.session_id.clone())
                    .or_default()
                    .push(insight.clone());
            }
            persist_insight(app, &insight);
            let _ = app.emit("ai-browser:insight-created", insight);
        }
        "log_created" => {
            add_log(
                app,
                state,
                ActivityLog {
                    id: message.id.unwrap_or_else(|| Uuid::new_v4().to_string()),
                    session_id: message.session_id.unwrap_or_else(|| session_id.to_string()),
                    level: message.level.unwrap_or_else(|| "info".to_string()),
                    r#type: message.log_type.unwrap_or_else(|| "session".to_string()),
                    message: message.message.unwrap_or_default(),
                    url: message.url,
                    created_at: message.created_at.unwrap_or_else(now),
                },
            );
        }
        "diagnostic" => {
            add_log(
                app,
                state,
                ActivityLog {
                    id: Uuid::new_v4().to_string(),
                    session_id: session_id.to_string(),
                    level: message.level.unwrap_or_else(|| "warning".to_string()),
                    r#type: "ai".to_string(),
                    message: message.message.unwrap_or_default(),
                    url: None,
                    created_at: now(),
                },
            );
        }
        "session_finished" => {
            let finished_at = message.finished_at.unwrap_or_else(now);
            if let Ok(session) =
                update_session(app, state, session_id, "completed", Some(finished_at))
            {
                let _ = app.emit("ai-browser:session-finished", session);
            }
        }
        "session_failed" => {
            let finished_at = now();
            let _ = update_session(app, state, session_id, "failed", Some(finished_at));
            let error = message
                .message
                .unwrap_or_else(|| "Sidecar crawl failed".to_string());
            add_log(
                app,
                state,
                ActivityLog {
                    id: Uuid::new_v4().to_string(),
                    session_id: session_id.to_string(),
                    level: "error".to_string(),
                    r#type: "error".to_string(),
                    message: error.clone(),
                    url: None,
                    created_at: now(),
                },
            );
            let _ = app.emit(
                "ai-browser:session-failed",
                serde_json::json!({ "message": error }),
            );
        }
        _ => {}
    }

    Ok(())
}

fn run_sidecar_crawl(
    app: &AppHandle,
    state: &AiBrowserState,
    config: &CrawlConfig,
    session_id: &str,
) -> Result<(), String> {
    let script = find_sidecar_script(app)?;
    let node = if cfg!(windows) { "node.exe" } else { "node" };
    let settings = crate::ai::read_ai_settings(app).unwrap_or_default();
    let config_json = serde_json::to_string(config).map_err(|error| error.to_string())?;
    let mut command = Command::new(node);

    command
        .arg(script)
        .env("APPRECON_CRAWL_SESSION_ID", session_id)
        .env("APPRECON_CRAWL_CONFIG_JSON", config_json)
        .env(
            "APPRECON_PROXY_PORT",
            crate::proxy::active_proxy_port()
                .unwrap_or_else(crate::proxy::default_proxy_port)
                .to_string(),
        )
        .env("APPRECON_AI_PROVIDER", &settings.provider)
        .env("APPRECON_AI_MODEL", &settings.model)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    if let Ok(api_key) = crate::ai::read_api_key(&settings.provider) {
        if !api_key.trim().is_empty() {
            command.env(
                crate::ai::api_key_env_name(&settings.provider)?,
                api_key.trim(),
            );
        }
    }

    let mut child = command
        .spawn()
        .map_err(|error| format!("Failed to start AI browser sidecar: {}", error))?;
    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| "Failed to capture AI browser sidecar stdout".to_string())?;
    let reader = BufReader::new(stdout);

    for line in reader.lines() {
        let line = line.map_err(|error| error.to_string())?;
        if line.trim().is_empty() {
            continue;
        }
        match serde_json::from_str::<SidecarMessage>(&line) {
            Ok(message) => {
                if let Err(error) = apply_sidecar_message(app, state, session_id, message) {
                    add_log(
                        app,
                        state,
                        ActivityLog {
                            id: Uuid::new_v4().to_string(),
                            session_id: session_id.to_string(),
                            level: "warning".to_string(),
                            r#type: "error".to_string(),
                            message: format!("Ignored sidecar message: {}", error),
                            url: None,
                            created_at: now(),
                        },
                    );
                }
            }
            Err(error) => eprintln!("[ai-browser] invalid sidecar message: {} ({})", line, error),
        }
    }

    let status = child.wait().map_err(|error| error.to_string())?;
    if status.success() {
        Ok(())
    } else {
        Err(format!("AI browser sidecar exited with {}", status))
    }
}

#[tauri::command]
pub async fn ai_browser_start_crawl(
    app: AppHandle,
    state: State<'_, AiBrowserState>,
    config: CrawlConfig,
    session_id: Option<String>,
) -> Result<CrawlSession, String> {
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
            message: format!("Started crawl for {}", session.target_url),
            url: Some(session.target_url.clone()),
            created_at: now(),
        },
    );

    let app_for_task = app.clone();
    let state_for_task = state.inner().clone();
    let session_id_for_task = session.id.clone();
    tauri::async_runtime::spawn(async move {
        let sidecar_result = {
            let app = app_for_task.clone();
            let state = state_for_task.clone();
            let config = config.clone();
            let session_id = session_id_for_task.clone();
            tauri::async_runtime::spawn_blocking(move || {
                run_sidecar_crawl(&app, &state, &config, &session_id)
            })
            .await
            .map_err(|error| error.to_string())
            .and_then(|result| result)
        };

        if let Err(error) = sidecar_result {
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
        .ok_or_else(|| "Crawl session not found".to_string())
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
