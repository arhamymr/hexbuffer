use keyring::{Entry, Error as KeyringError};
use std::collections::BTreeMap;
use std::sync::{Mutex, OnceLock};

use super::providers::normalize_ai_provider;

const AI_KEYRING_SERVICE: &str = "0xbuffer.ai";
static AI_API_KEY_CACHE: OnceLock<Mutex<BTreeMap<String, String>>> = OnceLock::new();

pub fn read_optional_ai_api_key(provider: &str) -> Result<Option<String>, String> {
    let provider = normalize_ai_provider(provider)?;
    if let Some(key) = cached_ai_api_key(provider)? {
        return Ok(Some(key));
    }

    match keyring_entry(provider)?.get_password() {
        Ok(key) if key.trim().is_empty() => Ok(None),
        Ok(key) => {
            cache_ai_api_key(provider, Some(key.clone()))?;
            Ok(Some(key))
        }
        Err(KeyringError::NoEntry) => Ok(None),
        Err(error) => Err(keyring_error(error)),
    }
}

pub fn read_required_ai_api_key(provider: &str) -> Result<String, String> {
    read_optional_ai_api_key(provider)?
        .ok_or_else(|| format!("No {} API key saved in OS credential store", provider))
}

pub(crate) fn set_ai_api_key(provider: &str, api_key: &str) -> Result<String, String> {
    keyring_entry(provider)?
        .set_password(api_key)
        .map_err(keyring_error)?;
    let saved_key = keyring_entry(provider)?
        .get_password()
        .map_err(|error| {
            format!(
                "{} The key was written, but the app could not read it back. Unlock Keychain Access, delete the stale 0xbuffer.ai {} item if needed, then save the key again.",
                keyring_error(error),
                provider
            )
        })?;
    cache_ai_api_key(provider, Some(saved_key.clone()))?;
    Ok(saved_key)
}

pub(crate) fn clear_ai_api_key(provider: &str) -> Result<(), String> {
    match keyring_entry(provider)?.delete_credential() {
        Ok(()) | Err(KeyringError::NoEntry) => {
            cache_ai_api_key(provider, None)?;
            Ok(())
        }
        Err(error) => Err(keyring_error(error)),
    }
}

fn keyring_entry(provider: &str) -> Result<Entry, String> {
    Entry::new(AI_KEYRING_SERVICE, provider).map_err(keyring_error)
}

fn ai_api_key_cache() -> &'static Mutex<BTreeMap<String, String>> {
    AI_API_KEY_CACHE.get_or_init(|| Mutex::new(BTreeMap::new()))
}

fn cached_ai_api_key(provider: &str) -> Result<Option<String>, String> {
    Ok(ai_api_key_cache()
        .lock()
        .map_err(|_| "Failed to lock AI API key cache".to_string())?
        .get(provider)
        .cloned()
        .filter(|key| !key.trim().is_empty()))
}

fn cache_ai_api_key(provider: &str, api_key: Option<String>) -> Result<(), String> {
    let mut cache = ai_api_key_cache()
        .lock()
        .map_err(|_| "Failed to lock AI API key cache".to_string())?;

    if let Some(api_key) = api_key.filter(|key| !key.trim().is_empty()) {
        cache.insert(provider.to_string(), api_key);
    } else {
        cache.remove(provider);
    }

    Ok(())
}

pub(crate) fn keyring_error(error: KeyringError) -> String {
    let message = error.to_string();
    if message.contains("Platform secure storage failure") {
        return format!(
            "OS credential store error: {}. Unlock Keychain Access and re-save the API key. If it keeps failing, delete the stale 0xbuffer.ai item for this provider from Keychain Access, then save the key again.",
            message
        );
    }

    format!("OS credential store error: {}", message)
}
