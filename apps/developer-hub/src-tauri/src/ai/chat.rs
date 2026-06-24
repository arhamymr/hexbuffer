use serde_json::Value;
use std::io::{BufRead, BufReader};
use std::path::PathBuf;
use std::process::{Command, Stdio};
use tauri::{AppHandle, Emitter, State};
use tauri_plugin_shell::ShellExt;

use super::keyring::read_required_ai_api_key;
use super::providers::api_key_env_name;
use super::settings::read_ai_settings;
use super::types::{
    AiChatAction, AiChatContext, AiChatCrawlContext, AiChatRequest, AiChatResponse,
    AiEngineChatMessage, AiSettings,
};

pub async fn send_ai_chat_message_impl(
    app: AppHandle,
    history: State<'_, crate::HistoryBridge>,
    request: AiChatRequest,
) -> Result<AiChatResponse, String> {
    let settings = read_ai_settings(&app)?;
    ensure_third_party_ai_sharing_allowed(&settings)?;
    let api_key = read_required_ai_api_key(&settings.provider)?;

    if api_key.trim().is_empty() {
        return Err(format!("No {} API key provided", settings.provider));
    }

    let context = build_ai_chat_context(&history)?;
    let response = tauri::async_runtime::spawn_blocking(move || {
        run_ai_chat_engine(&app, &settings, &api_key, &request, &context)
    })
    .await
    .map_err(|error| error.to_string())??;

    Ok(response)
}

pub fn ensure_third_party_ai_sharing_allowed(settings: &AiSettings) -> Result<(), String> {
    if settings.allow_third_party_ai_sharing {
        return Ok(());
    }

    Err(
        "Third-party AI sharing is disabled. Enable it in Settings before sending prompts, chat messages, crawl context, page summaries, logs, insights, URLs, or analysis context to DeepSeek."
            .to_string(),
    )
}

fn build_ai_chat_context(history: &crate::HistoryBridge) -> Result<AiChatContext, String> {
    let crawl_sessions = history.list_recent_ai_browser_sessions(5)?;
    let latest_crawl = if let Some(session) = crawl_sessions.first() {
        Some(AiChatCrawlContext {
            session: session.clone(),
            pages: history.list_ai_browser_pages(&session.id)?,
            insights: history.list_ai_browser_insights(&session.id)?,
            logs: history.list_ai_browser_logs(&session.id)?,
        })
    } else {
        None
    };

    let proxy_tree = history.get_tree(None).unwrap_or_default();
    let proxy_summary = history
        .get_paginated(1, 30, None, Some("DESC".to_string()))
        .map(|r| r.data)
        .unwrap_or_default();

    Ok(AiChatContext {
        crawl_sessions,
        latest_crawl,
        proxy_summary,
        proxy_tree,
    })
}

fn run_ai_chat_engine(
    app: &AppHandle,
    settings: &AiSettings,
    api_key: &str,
    request: &AiChatRequest,
    context: &AiChatContext,
) -> Result<AiChatResponse, String> {
    let context_json = serde_json::to_string(context).map_err(|e| e.to_string())?;

    // Write context to a temp file so the sidecar reads it via env var
    // instead of stdin, avoiding broken-pipe races when the sidecar
    // crashes during startup.
    let context_file =
        temp_context_file().map_err(|e| format!("Failed to create context temp file: {}", e))?;
    std::fs::write(&context_file, &context_json)
        .map_err(|e| format!("Failed to write context temp file: {}", e))?;

    let request_json =
        serde_json::to_string(request).map_err(|error| error.to_string())?;
    let context_path = context_file.to_string_lossy().to_string();
    let api_key_env = api_key_env_name(&settings.provider)?;

    let sidecar_command = app
        .shell()
        .sidecar("ai-engine")
        .map_err(|error| format!("Failed to prepare AI engine sidecar: {}", error))?
        .env("HEXBUFFER_AI_ENGINE_MODE", "chat")
        .env("HEXBUFFER_AI_CHAT_REQUEST_JSON", request_json)
        .env("HEXBUFFER_AI_CHAT_CONTEXT_FILE", context_path)
        .env("XBUFFER_AI_PROVIDER", settings.provider.trim())
        .env("HEXBUFFER_AI_MODEL", settings.model.trim())
        .env("AI_SDK_LOG_WARNINGS", "false")
        .env(&api_key_env, api_key.trim());
    let mut command: Command = sidecar_command.into();
    command.stdout(Stdio::piped()).stderr(Stdio::piped());

    let output = command
        .spawn()
        .map_err(|error| format!("Failed to start AI engine sidecar: {}", error))?
        .wait_with_output()
        .map_err(|error| format!("Failed to wait for AI engine sidecar: {}", error))?;

    // Clean up the temp file regardless of outcome.
    let _ = std::fs::remove_file(&context_file);
    let stdout = String::from_utf8(output.stdout)
        .map_err(|error| format!("Invalid AI engine stdout: {}", error))?;
    let reader = BufReader::new(stdout.as_bytes());
    let mut provider = settings.provider.clone();
    let mut model = settings.model.clone();
    let mut content = String::new();
    let mut failed = None;
    let mut actions: Vec<AiChatAction> = Vec::new();

    for line in reader.lines() {
        let line = line.map_err(|error| error.to_string())?;
        if line.trim().is_empty() {
            continue;
        }

        let message: AiEngineChatMessage = serde_json::from_str(&line)
            .map_err(|error| format!("Invalid AI engine message: {} ({})", line, error))?;
        match message.message_type.as_str() {
            "chat_started" => {
                if let Some(value) = message.provider {
                    provider = value;
                }
                if let Some(value) = message.model {
                    model = value;
                }
                let _ = app.emit(
                    "ai-chat:started",
                    serde_json::json!({
                        "provider": &provider,
                        "model": &model,
                        "createdAt": message.created_at.unwrap_or_default(),
                    }),
                );
            }
            "chat_delta" => {
                if let Some(delta) = &message.delta {
                    content.push_str(delta);
                    let _ = app.emit("ai-chat:delta", serde_json::json!({"delta": delta}));
                }
            }
            "chat_finished" => {
                if let Some(value) = message.provider {
                    provider = value;
                }
                if let Some(value) = message.model {
                    model = value;
                }
                if let Some(value) = message.content {
                    content = value;
                }
                let _ = app.emit(
                    "ai-chat:finished",
                    serde_json::json!({
                        "provider": &provider,
                        "model": &model,
                        "contentLength": content.len(),
                        "createdAt": message.created_at.unwrap_or_default(),
                    }),
                );
            }
            "chat_failed" => {
                failed = Some(
                    message
                        .message
                        .clone()
                        .unwrap_or_else(|| "AI chat failed".to_string()),
                );
                let _ = app.emit(
                    "ai-chat:failed",
                    serde_json::json!({
                        "error": failed.as_ref().unwrap(),
                        "createdAt": message.created_at.unwrap_or_default(),
                    }),
                );
            }
            "chat_action" => {
                if let (Some(action), Some(payload)) =
                    (message.action.clone(), message.payload.clone())
                {
                    let created_at = message.created_at.unwrap_or_default();
                    // Emit a single generic event so the frontend tracks this tool call.
                    let _ = app.emit(
                        "ai-chat-action",
                        serde_json::json!({
                            "action": &action,
                            "payload": &payload,
                        }),
                    );
                    // For human selection requests, also emit a dedicated event so the
                    // chat UI can show an interactive selection card.
                    if action == "request_human_selection" {
                        let selection = serde_json::json!({
                            "id": format!("sel-{}", uuid::Uuid::new_v4()),
                            "question": payload.get("question").cloned().unwrap_or_default(),
                            "options": payload.get("options").cloned().unwrap_or(serde_json::json!([])),
                            "multiSelect": payload.get("multiSelect").cloned().unwrap_or(serde_json::json!(false)),
                            "createdAt": &created_at,
                        });
                        let _ = app.emit("ai-chat:human-selection-required", &selection);
                    }
                    let result = execute_chat_action(app, &action, &payload);
                    actions.push(AiChatAction {
                        action,
                        payload,
                        result: Some(result),
                        created_at,
                    });
                }
            }
            other => {
                // Passthrough workflow events from the sidecar — emit as ai-workflow:*
                if let Some(workflow_suffix) = other.strip_prefix("workflow_") {
                    let event_name = format!("ai-workflow:{}", workflow_suffix);
                    let payload = serde_json::json!({
                        "workflowId": message.workflow_id,
                        "stepId": message.step_id,
                        "name": message.name,
                        "sessionId": message.session_id,
                        "durationMs": message.duration_ms,
                        "error": message.error,
                        "stepIndex": message.step_index,
                        "startedAt": message.started_at,
                        "completedAt": message.completed_at,
                        "failedAt": message.failed_at,
                        "finishedAt": message.finished_at,
                        "contentLength": message.content_length,
                        "payload": message.payload,
                        "extra": message.extra,
                    });
                    let _ = app.emit(&event_name, &payload);
                }
            }
        }
    }

    if let Some(error) = failed {
        return Err(error);
    }
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!(
            "AI engine sidecar exited with code {:?}: {}",
            output.status.code(),
            stderr.trim()
        ));
    }
    if content.trim().is_empty() {
        return Err("AI engine did not return chat content".to_string());
    }

    Ok(AiChatResponse {
        provider,
        model,
        content,
        actions,
    })
}

fn temp_context_file() -> Result<PathBuf, String> {
    let dir = std::env::temp_dir().join("hexbuffer");
    std::fs::create_dir_all(&dir)
        .map_err(|e| format!("Failed to create hexbuffer temp dir: {}", e))?;
    Ok(dir.join("ai-chat-context.json"))
}

fn execute_chat_action(_app: &AppHandle, action: &str, payload: &Value) -> String {
    match action {
        "add_target" | "add_targets" => {
            let hosts = payload
                .get("hosts")
                .and_then(|v| v.as_array())
                .map(|a| a.len())
                .unwrap_or(1);
            let target_id = payload
                .get("targetId")
                .and_then(|v| v.as_str())
                .filter(|s| !s.is_empty());
            match target_id {
                Some(name) => format!("Added {} host(s) to existing target \"{}\"", hosts, name),
                None => format!("Added {} host(s) to scope", hosts),
            }
        }
        "write_document" => "Document content saved".to_string(),
        "url_extracted" => {
            let url = payload
                .get("url")
                .and_then(|v| v.as_str())
                .unwrap_or("unknown");
            format!("Extracted info from: {}", url)
        }
        "start_proxy" => {
            let port = payload.get("port").and_then(|v| v.as_u64()).unwrap_or(8888) as u16;
            let tls_port = payload
                .get("tlsPort")
                .and_then(|v| v.as_u64())
                .unwrap_or(8889) as u16;

            if let Some(active_port) = crate::proxy::active_proxy_port() {
                return format!("Proxy is already running on port {}", active_port);
            }

            format!(
                "Starting proxy on port {} (HTTP) / {} (HTTPS MITM)...",
                port, tls_port
            )
        }
        "trigger_scan" => {
            let url = payload
                .get("url")
                .and_then(|v| v.as_str())
                .unwrap_or("unknown");

            format!("Scan triggered for: {}", url)
        }
        "send_to_invoker" => {
            let log_id = payload
                .get("logId")
                .and_then(|v| v.as_str())
                .unwrap_or("unknown");
            format!("Sent request {} to Invoker", log_id)
        }
        "send_to_repeater" => {
            let log_id = payload
                .get("logId")
                .and_then(|v| v.as_str())
                .unwrap_or("unknown");
            format!("Sent request {} to Repeater", log_id)
        }
        "submit_crawl_input" => {
            let session_id = payload
                .get("sessionId")
                .and_then(|v| v.as_str())
                .unwrap_or("unknown");
            format!("Credentials submitted for session: {}", session_id)
        }
        "navigate_to" => {
            let path = payload
                .get("path")
                .and_then(|v| v.as_str())
                .unwrap_or("unknown");
            format!("Navigated to {}", path)
        }
        "request_human_selection" => {
            let question = payload
                .get("question")
                .and_then(|v| v.as_str())
                .unwrap_or("unknown");
            let count = payload
                .get("options")
                .and_then(|v| v.as_array())
                .map(|a| a.len())
                .unwrap_or(0);
            format!(
                "Presented selection \"{}\" with {} options",
                question, count
            )
        }
        other => format!("Unknown action: {}", other),
    }
}
