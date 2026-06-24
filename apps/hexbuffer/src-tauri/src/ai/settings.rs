use std::collections::BTreeMap;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

use super::providers::AI_PROVIDERS;
use super::types::AiSettings;

pub fn read_ai_settings(app: &AppHandle) -> Result<AiSettings, String> {
    let path = ai_settings_path(app)?;
    let mut settings = if path.exists() {
        let content = std::fs::read_to_string(path).map_err(|error| error.to_string())?;
        serde_json::from_str(&content).map_err(|error| error.to_string())?
    } else {
        AiSettings::default()
    };

    settings.api_key.clear();
    let legacy_has_api_key = settings.has_api_key;
    let had_provider_status = !settings.provider_key_status.is_empty();
    settings.provider_key_status = normalized_ai_key_status(settings.provider_key_status);
    if !had_provider_status && legacy_has_api_key {
        settings
            .provider_key_status
            .insert(settings.provider.trim().to_string(), true);
    }
    settings.has_api_key = settings
        .provider_key_status
        .get(settings.provider.trim())
        .copied()
        .unwrap_or(false);
    Ok(settings)
}

pub(crate) fn write_ai_settings(app: &AppHandle, settings: &AiSettings) -> Result<(), String> {
    let path = ai_settings_path(app)?;
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }

    let mut settings_to_write = settings.clone();
    settings_to_write.api_key.clear();
    let content =
        serde_json::to_string_pretty(&settings_to_write).map_err(|error| error.to_string())?;
    std::fs::write(path, content).map_err(|error| error.to_string())
}

fn ai_settings_path(app: &AppHandle) -> Result<PathBuf, String> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?;
    Ok(app_dir.join("ai-settings.json"))
}

pub(crate) fn write_ai_key_status(
    app: &AppHandle,
    provider: &str,
    has_key: bool,
) -> Result<BTreeMap<String, bool>, String> {
    let mut settings = read_ai_settings(app)?;
    settings
        .provider_key_status
        .insert(provider.to_string(), has_key);
    settings.has_api_key = settings
        .provider_key_status
        .get(settings.provider.trim())
        .copied()
        .unwrap_or(false);
    write_ai_settings(app, &settings)?;
    Ok(settings.provider_key_status)
}

pub(crate) fn normalized_ai_key_status(
    mut status: BTreeMap<String, bool>,
) -> BTreeMap<String, bool> {
    for provider in AI_PROVIDERS {
        status.entry(provider.to_string()).or_insert(false);
    }
    status
}
