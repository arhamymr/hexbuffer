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
        "Third-party AI sharing is disabled. Enable it in Settings before sending prompts, chat messages, crawl context, page summaries, logs, insights, URLs, or analysis context to OpenAI or DeepSeek."
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
    let context_file = temp_context_file()
        .map_err(|e| format!("Failed to create context temp file: {}", e))?;
    std::fs::write(&context_file, &context_json)
        .map_err(|e| format!("Failed to write context temp file: {}", e))?;

    let sidecar_command = app
        .shell()
        .sidecar("ai-engine")
        .map_err(|error| format!("Failed to prepare AI engine sidecar: {}", error))?
        .env("0XBUFFER_AI_ENGINE_MODE", "chat")
        .env(
            "0XBUFFER_AI_CHAT_REQUEST_JSON",
            serde_json::to_string(request).map_err(|error| error.to_string())?,
        )
        .env(
            "0XBUFFER_AI_CHAT_CONTEXT_FILE",
            context_file.to_string_lossy().to_string(),
        )
        .env("XBUFFER_AI_PROVIDER", settings.provider.trim())
        .env("0XBUFFER_AI_MODEL", settings.model.trim())
        .env(api_key_env_name(&settings.provider)?, api_key.trim());
    let mut command: Command = sidecar_command.into();
    command
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

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
            }
            "chat_delta" => {
                if let Some(delta) = message.delta {
                    content.push_str(&delta);
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
            }
            "chat_failed" => {
                failed = Some(
                    message
                        .message
                        .unwrap_or_else(|| "AI chat failed".to_string()),
                );
            }
            "chat_action" => {
                if let (Some(action), Some(payload)) = (message.action.clone(), message.payload.clone()) {
                    let created_at = message.created_at.unwrap_or_default();
                    let result = execute_chat_action(app, &action, &payload);
                    actions.push(AiChatAction {
                        action,
                        payload,
                        result: Some(result),
                        created_at,
                    });
                }
            }
            _ => {}
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
    let dir = std::env::temp_dir().join("0xbuffer");
    std::fs::create_dir_all(&dir)
        .map_err(|e| format!("Failed to create 0xbuffer temp dir: {}", e))?;
    Ok(dir.join("ai-chat-context.json"))
}

fn execute_chat_action(app: &AppHandle, action: &str, payload: &Value) -> String {
    // Emit a generic catch-all event so the frontend can show EVERY tool
    // being used in real-time during the loading phase.
    let _ = app.emit("ai-chat-action", serde_json::json!({
        "action": action,
        "payload": payload,
    }));

    match action {
        "add_target" => {
            let _ = app.emit("ai-action-add-target", payload);
            let host = payload
                .get("host")
                .and_then(|v| v.as_str())
                .unwrap_or("unknown");
            format!("Added target: {}", host)
        }
        "write_document" => {
            let _ = app.emit("ai-action-write-document", payload);
            "Document content saved".to_string()
        }
        "url_extracted" => {
            let url = payload
                .get("url")
                .and_then(|v| v.as_str())
                .unwrap_or("unknown");
            format!("Extracted info from: {}", url)
        }
        "start_proxy" => {
            let port = payload
                .get("port")
                .and_then(|v| v.as_u64())
                .unwrap_or(8888) as u16;
            let tls_port = payload
                .get("tlsPort")
                .and_then(|v| v.as_u64())
                .unwrap_or(8889) as u16;

            if let Some(active_port) = crate::proxy::active_proxy_port() {
                return format!("Proxy is already running on port {}", active_port);
            }

            let _ = app.emit("ai-action-start-proxy", payload);
            format!("Starting proxy on port {} (HTTP) / {} (HTTPS MITM)...", port, tls_port)
        }
        "trigger_scan" => {
            let url = payload
                .get("url")
                .and_then(|v| v.as_str())
                .unwrap_or("unknown");

            // Always emit the scan event — the frontend will ensure the proxy is
            // running before launching the crawl (starting it first if needed).
            let _ = app.emit("ai-action-trigger-scan", payload);
            format!("Scan triggered for: {}", url)
        }
        "send_to_invoker" => {
            let _ = app.emit("ai-action-send-to-invoker", payload);
            let log_id = payload
                .get("logId")
                .and_then(|v| v.as_str())
                .unwrap_or("unknown");
            format!("Sent request {} to Invoker", log_id)
        }
        "send_to_repeater" => {
            let _ = app.emit("ai-action-send-to-repeater", payload);
            let log_id = payload
                .get("logId")
                .and_then(|v| v.as_str())
                .unwrap_or("unknown");
            format!("Sent request {} to Repeater", log_id)
        }
        "submit_crawl_input" => {
            let _ = app.emit("ai-action-submit-crawl-input", payload);
            let session_id = payload
                .get("sessionId")
                .and_then(|v| v.as_str())
                .unwrap_or("unknown");
            format!("Credentials submitted for session: {}", session_id)
        }
        "navigate_to" => {
            let _ = app.emit("ai-action-navigate-to", payload);
            let path = payload
                .get("path")
                .and_then(|v| v.as_str())
                .unwrap_or("unknown");
            format!("Navigated to {}", path)
        }
        other => format!("Unknown action: {}", other),
    }
}
