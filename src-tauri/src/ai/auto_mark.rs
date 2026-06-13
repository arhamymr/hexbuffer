use std::io::{BufRead, BufReader};
use std::process::{Command, Stdio};
use tauri::AppHandle;
use tauri_plugin_shell::ShellExt;

use super::chat::ensure_third_party_ai_sharing_allowed;
use super::keyring::read_required_ai_api_key;
use super::providers::api_key_env_name;
use super::settings::read_ai_settings;
use super::types::{
    AiEngineInvokerAutoMarkMessage, InvokerMarkerSuggestionRequest,
    InvokerMarkerSuggestionResponse,
};

pub async fn suggest_invoker_markers_impl(
    app: AppHandle,
    request: InvokerMarkerSuggestionRequest,
) -> Result<InvokerMarkerSuggestionResponse, String> {
    if request.raw_request.trim().is_empty() {
        return Err("Raw request is empty".to_string());
    }

    let settings = read_ai_settings(&app)?;
    ensure_third_party_ai_sharing_allowed(&settings)?;
    let api_key = read_required_ai_api_key(&settings.provider)?;

    if api_key.trim().is_empty() {
        return Err(format!("No {} API key provided", settings.provider));
    }

    let response = tauri::async_runtime::spawn_blocking(move || {
        run_invoker_auto_mark_engine(&app, &settings.provider, &settings.model, &api_key, &request)
    })
    .await
    .map_err(|error| error.to_string())??;

    Ok(response)
}

fn run_invoker_auto_mark_engine(
    app: &AppHandle,
    provider: &str,
    model: &str,
    api_key: &str,
    request: &InvokerMarkerSuggestionRequest,
) -> Result<InvokerMarkerSuggestionResponse, String> {
    let sidecar_command = app
        .shell()
        .sidecar("ai-engine")
        .map_err(|error| format!("Failed to prepare AI engine sidecar: {}", error))?
        .env("0XBUFFER_AI_ENGINE_MODE", "invoker-auto-mark")
        .env("0XBUFFER_INVOKER_RAW_REQUEST", request.raw_request.clone())
        .env("XBUFFER_AI_PROVIDER", provider.trim())
        .env("0XBUFFER_AI_MODEL", model.trim())
        .env(api_key_env_name(provider)?, api_key.trim());

    let mut command: Command = sidecar_command.into();
    command.stdout(Stdio::piped()).stderr(Stdio::piped());

    let output = command
        .spawn()
        .map_err(|error| format!("Failed to start AI engine sidecar: {}", error))?
        .wait_with_output()
        .map_err(|error| format!("Failed to wait for AI engine sidecar: {}", error))?;

    let stdout = String::from_utf8(output.stdout)
        .map_err(|error| format!("Invalid AI engine stdout: {}", error))?;
    let reader = BufReader::new(stdout.as_bytes());
    let mut response: Option<InvokerMarkerSuggestionResponse> = None;
    let mut failed: Option<String> = None;

    for line in reader.lines() {
        let line = line.map_err(|error| error.to_string())?;
        if line.trim().is_empty() {
            continue;
        }

        let message: AiEngineInvokerAutoMarkMessage = serde_json::from_str(&line)
            .map_err(|error| format!("Invalid AI engine message: {} ({})", line, error))?;

        match message.message_type.as_str() {
            "invoker_auto_mark_finished" => {
                response = Some(InvokerMarkerSuggestionResponse {
                    provider: message.provider.unwrap_or_else(|| provider.to_string()),
                    model: message.model.unwrap_or_else(|| model.to_string()),
                    suggestions: message.suggestions,
                    candidate_count: message.candidate_count,
                });
            }
            "invoker_auto_mark_failed" => {
                failed = Some(
                    message
                        .message
                        .unwrap_or_else(|| "AI marker suggestion failed".to_string()),
                );
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

    response.ok_or_else(|| "AI engine did not return marker suggestions".to_string())
}
