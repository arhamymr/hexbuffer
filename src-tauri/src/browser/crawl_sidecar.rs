use super::crawl_helpers::{
    add_log, existing_page, is_terminal_status, kill_child_process_group, now, persist_insight,
    persist_page, session_status, signal_child_process_group, update_session, upsert_page_memory,
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
use tauri_plugin_notification::NotificationExt;
use tauri_plugin_shell::ShellExt;
use uuid::Uuid;

fn page_id() -> String {
    format!("page-{}", Uuid::new_v4())
}

fn notify_human_intervention(app: &AppHandle, target: Option<&str>, reason: &str) {
    let target = target
        .and_then(|value| {
            url::Url::parse(value)
                .ok()
                .and_then(|url| url.host_str().map(str::to_string))
                .or_else(|| Some(value.to_string()))
        })
        .unwrap_or_else(|| "browser automation".to_string());
    let body = format!("{}: {}", target, reason);

    if let Err(error) = app
        .notification()
        .builder()
        .title("Human intervention needed")
        .body(body)
        .show()
    {
        eprintln!(
            "[ai-browser] failed to send human intervention notification: {}",
            error
        );
    }
}

pub(crate) fn apply_sidecar_message(
    app: &AppHandle,
    state: &AiBrowserState,
    session_id: &str,
    message: SidecarMessage,
) -> Result<(), String> {
    match message.message_type.as_str() {
        "session_started" => {
            if let (Some(id), Some(sid), Some(url)) = (&message.id, &message.session_id, &message.url) {
                let session_info = serde_json::json!({
                    "id": id,
                    "sessionId": sid,
                    "url": url,
                    "startedAt": message.started_at.clone().unwrap_or_else(now),
                });
                let _ = app.emit("ai-browser:session-started", &session_info);
            }
        }
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
                ai_used_for_analysis: message.ai_used_for_analysis,
                analysis_source: message.analysis_source,
                analysis_tool_id: message.analysis_tool_id,
                analysis_tool_name: message.analysis_tool_name,
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
            let human_input_request = message.human_input_request_id.as_ref().map(|request_id| {
                serde_json::json!({
                    "id": request_id,
                    "sessionId": message.session_id.clone().unwrap_or_else(|| session_id.to_string()),
                    "url": message.url.clone(),
                    "reason": message.message.clone().unwrap_or_else(|| "Human input is required before the agent can continue.".to_string()),
                    "requestedFields": message.requested_fields.clone().unwrap_or_default(),
                    "safeActions": [
                        "continue",
                        "skip-branch",
                        "stop-crawl",
                    ],
                    "aiUsedForAnalysis": message.ai_used_for_analysis,
                    "createdAt": message.created_at.clone().unwrap_or_else(now),
                })
            });
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
                    extra: message.extra,
                    human_input_request,
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
                    extra: message.extra,
                    human_input_request: None,
                },
            );
        }
        "human_input_requested" => {
            let request_id = message.id.unwrap_or_else(|| Uuid::new_v4().to_string());
            let request_session_id = message
                .session_id
                .clone()
                .unwrap_or_else(|| session_id.to_string());
            let request_url = message.url.clone();
            let reason = message.reason.or(message.message).unwrap_or_else(|| {
                "Human input is required before the agent can continue.".to_string()
            });
            let request = serde_json::json!({
                "id": request_id,
                "sessionId": request_session_id,
                "pageId": message.page_id,
                "url": request_url,
                "reason": reason,
                "requestedFields": message.requested_fields.unwrap_or_default(),
                "safeActions": message.safe_actions.unwrap_or_else(|| vec![
                    "continue".to_string(),
                    "skip-branch".to_string(),
                    "stop-crawl".to_string(),
                ]),
                "aiUsedForAnalysis": message.ai_used_for_analysis,
                "createdAt": message.created_at.unwrap_or_else(now),
            });
            notify_human_intervention(
                app,
                request.get("url").and_then(|value| value.as_str()),
                request
                    .get("reason")
                    .and_then(|value| value.as_str())
                    .unwrap_or("Human input requested"),
            );
            add_log(
                app,
                state,
                ActivityLog {
                    id: Uuid::new_v4().to_string(),
                    session_id: session_id.to_string(),
                    level: "warning".to_string(),
                    r#type: "human".to_string(),
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
                    extra: message.extra,
                    human_input_request: Some(request.clone()),
                },
            );
            let _ = app.emit("ai-browser:human-input-requested", &request);
            let _ = app.emit("ai-chat:crawl-human-input-required", &request);
        }
        "session_finished" => {
            let finished_at = message.finished_at.unwrap_or_else(now);
            let _ = app.emit(
                "ai-browser:session-finished",
                serde_json::json!({
                    "sessionId": session_id,
                    "finishedAt": finished_at,
                    "message": message.message,
                }),
            );
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
                    extra: message.extra,
                    human_input_request: None,
                },
            );
            let _ = app.emit(
                "ai-browser:session-failed",
                serde_json::json!({ "message": error }),
            );
        }
        other => {
            // Passthrough workflow events from the sidecar — emit as ai-workflow:*
            if let Some(workflow_suffix) = other.strip_prefix("workflow_") {
                let event_name = format!("ai-workflow:{}", workflow_suffix);
                let payload = serde_json::json!({
                    "workflowId": message.workflow_id,
                    "stepId": message.step_id,
                    "name": message.name,
                    "sessionId": message.session_id.or(Some(session_id.to_string())),
                    "durationMs": message.duration_ms,
                    "error": message.error,
                    "stepIndex": message.step_index,
                    "startedAt": message.started_at,
                    "completedAt": message.completed_at,
                    "failedAt": message.failed_at,
                    "finishedAt": message.finished_at,
                    "contentLength": message.content_length,
                });
                let _ = app.emit(&event_name, &payload);
            }
        }
    }

    Ok(())
}

pub(crate) fn run_sidecar_crawl(
    app: &AppHandle,
    state: &AiBrowserState,
    config: &CrawlConfig,
    session_id: &str,
    worker_id: &str,
    api_key: Option<&str>,
    cancel_flag: Arc<AtomicBool>,
) -> Result<(), String> {
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
    let sidecar_command = app
        .shell()
        .sidecar("ai-engine")
        .map_err(|error| format!("Failed to prepare AI browser sidecar: {}", error))?
        .env("0XBUFFER_CRAWL_SESSION_ID", session_id)
        .env("0XBUFFER_CRAWL_WORKER_ID", worker_id)
        .env("0XBUFFER_CRAWL_CONFIG_JSON", config_json)
        .env(
            "0XBUFFER_PROXY_PORT",
            crate::proxy::active_proxy_port()
                .unwrap_or_else(crate::proxy::default_proxy_port)
                .to_string(),
        )
        .env("XBUFFER_AI_PROVIDER", &settings.provider)
        .env("0XBUFFER_AI_MODEL", &settings.model);
    let mut command: Command = sidecar_command.into();

    command
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    if let Some(dir) = artifact_dir {
        command.env("0XBUFFER_AI_ARTIFACT_DIR", dir);
    }

    #[cfg(unix)]
    command.process_group(0);

    // API key is read from the OS credential store by the backend.
    if let Some(api_key) = api_key.filter(|key| !key.trim().is_empty()) {
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
            .entry(session_id.to_string())
            .or_default()
            .insert(worker_id.to_string(), child.clone());
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
                                extra: None,
                                human_input_request: None,
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
        if let Some(session_children) = children.get_mut(session_id) {
            session_children.remove(worker_id);
            if session_children.is_empty() {
                children.remove(session_id);
            }
        }
    }
    if status.success() {
        Ok(())
    } else if cancel_flag.load(Ordering::SeqCst) {
        Ok(())
    } else {
        Err(format!("AI browser sidecar exited with {}", status))
    }
}
