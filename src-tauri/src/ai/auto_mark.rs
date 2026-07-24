use tauri::AppHandle;

use super::chat::ensure_third_party_ai_sharing_allowed;
use super::keyring::read_required_ai_api_key;
use super::settings::read_ai_settings;
use super::types::{
    InvokerMarkerSuggestion, InvokerMarkerSuggestionRequest, InvokerMarkerSuggestionResponse,
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

    let config = if settings.provider.to_lowercase() == "deepseek" {
        hexbuffer_ai::AiConfig::deepseek(&settings.model, &api_key)
    } else {
        hexbuffer_ai::AiConfig::new(&settings.provider, &settings.model, &api_key)
    };

    let engine = hexbuffer_ai::AiEngine::new(config);

    let engine_req = hexbuffer_ai::InvokerMarkerSuggestionRequest {
        raw_request: request.raw_request.clone(),
        target_parameter: None,
    };

    let result = engine
        .suggest_invoker_markers(engine_req)
        .await
        .map_err(|error| error.to_string())?;

    let mut suggestions = Vec::new();
    let mut candidate_count = 0;

    for (idx, param) in result.parameters.iter().enumerate() {
        candidate_count += 1;
        if let Some(pos) = request.raw_request.find(param) {
            suggestions.push(InvokerMarkerSuggestion {
                id: format!("marker-{}", idx + 1),
                start: pos,
                end: pos + param.len(),
                value: param.clone(),
                category: "parameter".to_string(),
                location: "body/query".to_string(),
                confidence: 0.9,
                reason: result.explanation.clone(),
            });
        }
    }

    Ok(InvokerMarkerSuggestionResponse {
        provider: settings.provider,
        model: settings.model,
        suggestions,
        candidate_count,
    })
}
