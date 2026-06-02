use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, State};
use tokio::time::{sleep, Duration};
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
    pub capture_screenshots: bool,
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
    pub screenshot_path: Option<String>,
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

fn now() -> String {
    Utc::now().to_rfc3339()
}

fn normalize_strategy(strategy: Option<String>) -> String {
    match strategy.as_deref() {
        Some("dfs") => "dfs".to_string(),
        _ => "bfs".to_string(),
    }
}

fn join_url(base: &str, path: &str) -> String {
    if path.starts_with("http://") || path.starts_with("https://") {
        return path.to_string();
    }

    format!("{}{}", base.trim_end_matches('/'), path)
}

fn page_id() -> String {
    format!("page-{}", Uuid::new_v4())
}

fn add_log(app: &AppHandle, state: &AiBrowserState, log: ActivityLog) {
    if let Ok(mut logs) = state.logs.lock() {
        logs.entry(log.session_id.clone()).or_default().push(log.clone());
    }
    let _ = app.emit("ai-browser:log-created", log);
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

    let _ = app.emit("ai-browser:session-updated", &updated);
    Ok(updated)
}

fn get_session_status(state: &AiBrowserState, session_id: &str) -> Option<String> {
    state
        .sessions
        .lock()
        .ok()
        .and_then(|sessions| sessions.get(session_id).map(|session| session.status.clone()))
}

async fn wait_if_paused(state: &AiBrowserState, session_id: &str) -> bool {
    loop {
        match get_session_status(state, session_id).as_deref() {
            Some("paused") => sleep(Duration::from_millis(250)).await,
            Some("running") => return true,
            _ => return false,
        }
    }
}

async fn emit_mock_crawl(app: AppHandle, state: AiBrowserState, config: CrawlConfig, session_id: String) {
    let seed_pages = vec![
        ("/", "Home", 0, None, 200, 18, 0, "Landing page exposes primary navigation, pricing, login, and product entry points."),
        ("/about", "About", 1, Some("/"), 200, 6, 0, "Informational page with team and careers links."),
        ("/products", "Products", 1, Some("/"), 200, 11, 0, "Product hub links into web, mobile, and API surfaces."),
        ("/login", "Sign in", 1, Some("/"), 200, 4, 1, "Authentication entry point with credential fields and password reset controls."),
        ("/admin", "Admin", 1, Some("/"), 403, 0, 0, "Route responds with forbidden status and should be reviewed for authorization behavior."),
        ("/profile/avatar", "Avatar Upload", 2, Some("/login"), 200, 3, 1, "Upload form discovered behind account profile route."),
        ("/legacy/report", "Server Error", 2, Some("/"), 500, 0, 0, "Legacy report route returned a server error during crawl."),
    ];

    let mut emitted_pages: Vec<CrawlPage> = Vec::new();

    for (index, (path, title, depth, parent, http_status, links, forms, summary)) in
        seed_pages.into_iter().enumerate()
    {
        if emitted_pages.len() as u32 >= config.max_pages || depth > config.max_depth {
            break;
        }

        if !wait_if_paused(&state, &session_id).await {
            return;
        }

        let url = join_url(&config.target_url, path);
        let parent_url = parent.map(|parent_path| join_url(&config.target_url, parent_path));
        let discovered = CrawlPage {
            id: page_id(),
            session_id: session_id.clone(),
            url: url.clone(),
            title: Some(title.to_string()),
            status: if index == 0 { "current" } else { "queued" }.to_string(),
            depth,
            parent_url,
            http_status: None,
            links_found: 0,
            forms_found: 0,
            screenshot_path: None,
            discovered_at: now(),
            visited_at: None,
            ai_summary: None,
            interesting: Some(false),
        };

        if let Ok(mut pages) = state.pages.lock() {
            pages
                .entry(session_id.clone())
                .or_default()
                .push(discovered.clone());
        }
        let _ = app.emit("ai-browser:page-discovered", &discovered);
        add_log(
            &app,
            &state,
            ActivityLog {
                id: Uuid::new_v4().to_string(),
                session_id: session_id.clone(),
                level: "info".to_string(),
                r#type: "queue".to_string(),
                message: format!("Discovered {}", url),
                url: Some(url.clone()),
                created_at: now(),
            },
        );

        sleep(Duration::from_millis(config.request_delay_ms.min(1500))).await;

        if !wait_if_paused(&state, &session_id).await {
            return;
        }

        let screenshot_path = if config.capture_screenshots {
            Some(format!("screenshots/{}/{}.png", session_id, discovered.id))
        } else {
            None
        };
        let visited = CrawlPage {
            status: if http_status >= 500 {
                "error".to_string()
            } else if http_status == 403 {
                "blocked".to_string()
            } else {
                "visited".to_string()
            },
            http_status: Some(http_status),
            links_found: links,
            forms_found: forms,
            screenshot_path,
            visited_at: Some(now()),
            ai_summary: Some(summary.to_string()),
            interesting: Some(path.contains("avatar")),
            ..discovered.clone()
        };

        if let Ok(mut pages) = state.pages.lock() {
            if let Some(session_pages) = pages.get_mut(&session_id) {
                if let Some(existing) = session_pages.iter_mut().find(|page| page.id == visited.id) {
                    *existing = visited.clone();
                }
            }
        }
        let _ = app.emit("ai-browser:page-updated", &visited);
        add_log(
            &app,
            &state,
            ActivityLog {
                id: Uuid::new_v4().to_string(),
                session_id: session_id.clone(),
                level: if http_status >= 500 { "error" } else { "info" }.to_string(),
                r#type: if http_status >= 500 { "error" } else { "navigation" }.to_string(),
                message: format!("Visited {} ({})", url, http_status),
                url: Some(url.clone()),
                created_at: now(),
            },
        );

        emitted_pages.push(visited.clone());

        if config.enable_ai_insights {
            let insight = match path {
                "/login" => Some(("info", "login-form", "Login page detected", "The page contains credential fields and password reset navigation.")),
                "/admin" => Some(("medium", "admin-route", "Admin route discovered", "An admin route was discovered and returned HTTP 403.")),
                "/profile/avatar" => Some(("medium", "upload-form", "Upload form detected", "A profile avatar form accepts file input and should be reviewed.")),
                "/legacy/report" => Some(("low", "error-page", "Error page detected", "A legacy report route returned a server error.")),
                _ => None,
            };

            if let Some((severity, insight_type, title, description)) = insight {
                let insight = AIInsight {
                    id: Uuid::new_v4().to_string(),
                    session_id: session_id.clone(),
                    page_id: Some(visited.id.clone()),
                    severity: severity.to_string(),
                    r#type: insight_type.to_string(),
                    title: title.to_string(),
                    description: description.to_string(),
                    url: Some(url.clone()),
                    reviewed: false,
                    created_at: now(),
                };

                if let Ok(mut insights) = state.insights.lock() {
                    insights
                        .entry(session_id.clone())
                        .or_default()
                        .push(insight.clone());
                }
                let _ = app.emit("ai-browser:insight-created", insight);
            }
        }
    }

    if matches!(get_session_status(&state, &session_id).as_deref(), Some("running")) {
        let finished_at = now();
        if let Ok(session) = update_session(&app, &state, &session_id, "completed", Some(finished_at)) {
            let _ = app.emit("ai-browser:session-finished", session);
        }
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
        emit_mock_crawl(app_for_task, state_for_task, config, session_id_for_task).await;
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
    session_id: String,
) -> Result<CrawlSession, String> {
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
    session_id: String,
) -> Result<Vec<CrawlPage>, String> {
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
    session_id: String,
) -> Result<Vec<AIInsight>, String> {
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
    session_id: String,
) -> Result<Vec<ActivityLog>, String> {
    Ok(state
        .logs
        .lock()
        .map_err(|_| "Failed to lock AI browser logs".to_string())?
        .get(&session_id)
        .cloned()
        .unwrap_or_default())
}
