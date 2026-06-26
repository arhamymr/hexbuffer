use std::collections::BTreeMap;
use tauri::AppHandle;

use super::keyring::{clear_ai_api_key as keyring_clear, set_ai_api_key as keyring_set};
use super::providers::normalize_ai_provider;
use super::settings::{read_ai_settings, write_ai_key_status, write_ai_settings};
use super::types::AiSettings;

pub(crate) fn get_ai_settings_impl(app: AppHandle) -> Result<AiSettings, String> {
    read_ai_settings(&app)
}

pub(crate) fn get_ai_key_status_impl(app: AppHandle) -> Result<BTreeMap<String, bool>, String> {
    Ok(read_ai_settings(&app)?.provider_key_status)
}

pub(crate) fn set_ai_api_key_impl(
    app: AppHandle,
    provider: String,
    api_key: String,
) -> Result<BTreeMap<String, bool>, String> {
    let provider = normalize_ai_provider(&provider)?;
    let api_key = api_key.trim();
    if api_key.is_empty() {
        return Err(format!("No {} API key provided", provider));
    }

    keyring_set(provider, api_key)?;
    write_ai_key_status(&app, provider, true)
}

pub(crate) fn clear_ai_api_key_impl(
    app: AppHandle,
    provider: String,
) -> Result<BTreeMap<String, bool>, String> {
    let provider = normalize_ai_provider(&provider)?;
    keyring_clear(provider)?;
    write_ai_key_status(&app, provider, false)
}

pub(crate) fn save_ai_settings_impl(
    app: AppHandle,
    settings: AiSettings,
) -> Result<AiSettings, String> {
    let mut settings = settings;
    // API keys are managed by the OS credential store.
    settings.api_key.clear();
    settings.provider_key_status = read_ai_settings(&app)?.provider_key_status;
    write_ai_settings(&app, &settings)?;
    read_ai_settings(&app)
}
