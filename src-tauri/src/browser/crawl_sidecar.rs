use super::crawl_helpers::{
    add_log, existing_page, find_sidecar_script, is_terminal_status, kill_child_process_group, now,
    persist_insight, persist_page, session_status, signal_child_process_group, update_session,
    upsert_page_memory,
};
use super::crawl_types::{
    AIInsight, ActivityLog, AiBrowserState, CrawlConfig, CrawlPage, SidecarMessage,
};
use std::io::{BufRead, BufReader};
#[cfg(unix)]
use std::os::unix::process::CommandExt;
use std::process::{Command, Stdio};
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc, Mutex,
};
use tauri::{AppHandle, Emitter, Manager};
use uuid::Uuid;

fn page_id() -> String {
    format!("page-{}", Uuid::new_v4())
}

pub(crate) fn apply_sidecar_message(
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
                ai_used_for_analysis: None,
                interesting: Some(false),
                screenshot_path: None,
                rendered_html_path: None,
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
                ai_used_for_analysis: message.ai_used_for_analysis,
                interesting: Some(message.interesting.unwrap_or(false)),
                screenshot_path: message
                    .screenshot_path
                    .or_else(|| base.as_ref().and_then(|page| page.screenshot_path.clone())),
                rendered_html_path: message.rendered_html_path.or_else(|| {
                    base.as_ref()
                        .and_then(|page| page.rendered_html_path.clone())
                }),
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
                    ai_used_for_analysis: message.ai_used_for_analysis,
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
                    ai_used_for_analysis: message.ai_used_for_analysis,
                    created_at: now(),
                },
            );
        }
        "human_input_requested" => {
            let request = serde_json::json!({
                "id": message.id.unwrap_or_else(|| Uuid::new_v4().to_string()),
                "sessionId": message.session_id.clone().unwrap_or_else(|| session_id.to_string()),
                "pageId": message.page_id,
                "url": message.url,
                "reason": message.reason.or(message.message).unwrap_or_else(|| "Human input is required before the agent can continue.".to_string()),
                "requestedFields": message.requested_fields.unwrap_or_default(),
                "safeActions": message.safe_actions.unwrap_or_else(|| vec![
                    "continue".to_string(),
                    "skip-branch".to_string(),
                    "stop-crawl".to_string(),
                ]),
                "aiUsedForAnalysis": message.ai_used_for_analysis,
                "createdAt": message.created_at.unwrap_or_else(now),
            });
            add_log(
                app,
                state,
                ActivityLog {
                    id: Uuid::new_v4().to_string(),
                    session_id: session_id.to_string(),
                    level: "warning".to_string(),
                    r#type: "policy".to_string(),
                    message: request
                        .get("reason")
                        .and_then(|value| value.as_str())
                        .unwrap_or("Human input requested")
                        .to_string(),
                    url: request
                        .get("url")
                        .and_then(|value| value.as_str())
                        .map(str::to_string),
                    ai_used_for_analysis: message.ai_used_for_analysis,
                    created_at: now(),
                },
            );
            let _ = app.emit("ai-browser:human-input-requested", request);
        }
        "session_finished" => {
            if session_status(state, session_id)
                .as_deref()
                .map(is_terminal_status)
                .unwrap_or(false)
            {
                return Ok(());
            }
            let finished_at = message.finished_at.unwrap_or_else(now);
            if let Ok(session) =
                update_session(app, state, session_id, "completed", Some(finished_at))
            {
                let _ = app.emit("ai-browser:session-finished", session);
            }
        }
        "session_failed" => {
            if session_status(state, session_id)
                .as_deref()
                .map(is_terminal_status)
                .unwrap_or(false)
            {
                return Ok(());
            }
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
                    ai_used_for_analysis: message.ai_used_for_analysis,
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

pub(crate) fn run_sidecar_crawl(
    app: &AppHandle,
    state: &AiBrowserState,
    config: &CrawlConfig,
    session_id: &str,
    api_key: &str,
    cancel_flag: Arc<AtomicBool>,
) -> Result<(), String> {
    let script = find_sidecar_script(app)?;
    let node = if cfg!(windows) { "node.exe" } else { "node" };
    let settings = crate::ai::read_ai_settings(app).unwrap_or_default();
    let config_json = serde_json::to_string(config).map_err(|error| error.to_string())?;
    let artifact_dir = if config.capture_screenshots || config.capture_rendered_html {
        let dir = app
            .path()
            .app_data_dir()
            .map_err(|error| error.to_string())?
            .join("ai-browser-artifacts");
        std::fs::create_dir_all(&dir).map_err(|error| error.to_string())?;
        Some(dir)
    } else {
        None
    };
    let mut command = Command::new(node);

    command
        .arg(script)
        .env("0XBUFFER_CRAWL_SESSION_ID", session_id)
        .env("0XBUFFER_CRAWL_CONFIG_JSON", config_json)
        .env(
            "0XBUFFER_PROXY_PORT",
            crate::proxy::active_proxy_port()
                .unwrap_or_else(crate::proxy::default_proxy_port)
                .to_string(),
        )
        .env("XBUFFER_AI_PROVIDER", &settings.provider)
        .env("0XBUFFER_AI_MODEL", &settings.model)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    if let Some(dir) = artifact_dir {
        command.env("0XBUFFER_AI_ARTIFACT_DIR", dir);
    }

    #[cfg(unix)]
    command.process_group(0);

    // API key passed from frontend (Zustand store)
    if !api_key.trim().is_empty() {
        command.env(
            crate::ai::api_key_env_name(&settings.provider)?,
            api_key.trim(),
        );
    }

    let mut child = command
        .spawn()
        .map_err(|error| format!("Failed to start AI browser sidecar: {}", error))?;
    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| "Failed to capture AI browser sidecar stdout".to_string())?;
    let child = Arc::new(Mutex::new(child));
    {
        state
            .children
            .lock()
            .map_err(|_| "Failed to lock AI browser child processes".to_string())?
            .insert(session_id.to_string(), child.clone());
    }
    if session_status(state, session_id).as_deref() == Some("paused") {
        signal_child_process_group(&child, "-STOP")?;
    }
    let reader = BufReader::new(stdout);

    if !cancel_flag.load(Ordering::SeqCst) {
        for line in reader.lines() {
            if cancel_flag.load(Ordering::SeqCst) {
                break;
            }
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
                                ai_used_for_analysis: None,
                                created_at: now(),
                            },
                        );
                    }
                }
                Err(error) => {
                    eprintln!("[ai-browser] invalid sidecar message: {} ({})", line, error)
                }
            }
        }
    }

    if cancel_flag.load(Ordering::SeqCst) {
        kill_child_process_group(&child);
    }

    let status = child
        .lock()
        .map_err(|_| "Failed to lock AI browser child process".to_string())?
        .wait()
        .map_err(|error| error.to_string())?;
    if let Ok(mut children) = state.children.lock() {
        children.remove(session_id);
    }
    if status.success() {
        Ok(())
    } else if cancel_flag.load(Ordering::SeqCst) {
        Ok(())
    } else {
        Err(format!("AI browser sidecar exited with {}", status))
    }
}
