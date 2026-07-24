use tauri::{AppHandle, Emitter, State};

use super::keyring::read_required_ai_api_key;
use super::settings::read_ai_settings;
use super::types::{
    AiChatContext, AiChatCrawlContext, AiChatRequest, AiChatResponse, AiSettings,
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
    let context_json = serde_json::to_string(&context).ok();

    let config = if settings.provider.to_lowercase() == "deepseek" {
        hexbuffer_ai::AiConfig::deepseek(&settings.model, &api_key)
    } else {
        hexbuffer_ai::AiConfig::new(&settings.provider, &settings.model, &api_key)
    };

    let engine = hexbuffer_ai::AiEngine::new(config);

    let last_user_prompt = request
        .messages
        .iter()
        .rev()
        .find(|m| m.role == "user")
        .map(|m| m.content.clone())
        .unwrap_or_default();

    let engine_history = request
        .messages
        .iter()
        .map(|m| hexbuffer_ai::ChatMessage {
            role: m.role.clone(),
            content: m.content.clone(),
        })
        .collect();

    let engine_req = hexbuffer_ai::AiChatRequest {
        prompt: last_user_prompt,
        session_id: request.active_workspace_id.clone(),
        history: engine_history,
        context_summary: context_json,
    };

    let _ = app.emit(
        "ai-chat:started",
        serde_json::json!({
            "provider": &settings.provider,
            "model": &settings.model,
            "createdAt": chrono::Utc::now().to_rfc3339(),
        }),
    );

    let mut rx = engine
        .chat_stream(engine_req)
        .await
        .map_err(|e| e.to_string())?;

    let mut full_content = String::new();
    while let Some(chunk) = rx.recv().await {
        if !chunk.chunk.is_empty() {
            full_content.push_str(&chunk.chunk);
            let _ = app.emit("ai-chat:delta", serde_json::json!({ "delta": chunk.chunk }));
        }
        if chunk.done {
            break;
        }
    }

    let _ = app.emit(
        "ai-chat:finished",
        serde_json::json!({
            "provider": &settings.provider,
            "model": &settings.model,
            "contentLength": full_content.len(),
            "createdAt": chrono::Utc::now().to_rfc3339(),
        }),
    );

    Ok(AiChatResponse {
        provider: settings.provider,
        model: settings.model,
        content: full_content,
        actions: vec![],
    })
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

    let stashes = history.get_stashes().unwrap_or_default();

    Ok(AiChatContext {
        crawl_sessions,
        latest_crawl,
        proxy_summary,
        proxy_tree,
        stashes,
    })
}
