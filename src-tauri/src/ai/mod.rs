pub mod commands;
pub mod chat;
pub mod keyring;
pub mod providers;
pub mod settings;
pub mod types;

use std::collections::BTreeMap;
use tauri::{AppHandle, State};

// Type re-exports
pub use types::{AiChatRequest, AiChatResponse, AiSettings, ChatMessageRecord, ChatSessionRecord};

// Non-command function re-exports
pub use chat::ensure_third_party_ai_sharing_allowed;
pub use keyring::{read_optional_ai_api_key, read_required_ai_api_key};
pub use providers::api_key_env_name;
pub use settings::read_ai_settings;

// ── Tauri commands (must live in mod.rs so the macro-generated __tauri_command_name_*
//    and __cmd__* symbols resolve at the path main.rs references) ──

#[tauri::command]
pub fn get_ai_settings(app: AppHandle) -> Result<AiSettings, String> {
    commands::get_ai_settings_impl(app)
}

#[tauri::command]
pub fn get_ai_key_status(app: AppHandle) -> Result<BTreeMap<String, bool>, String> {
    commands::get_ai_key_status_impl(app)
}

#[tauri::command]
pub fn set_ai_api_key(
    app: AppHandle,
    provider: String,
    api_key: String,
) -> Result<BTreeMap<String, bool>, String> {
    commands::set_ai_api_key_impl(app, provider, api_key)
}

#[tauri::command]
pub fn clear_ai_api_key(
    app: AppHandle,
    provider: String,
) -> Result<BTreeMap<String, bool>, String> {
    commands::clear_ai_api_key_impl(app, provider)
}

#[tauri::command]
pub fn save_ai_settings(app: AppHandle, settings: AiSettings) -> Result<AiSettings, String> {
    commands::save_ai_settings_impl(app, settings)
}

#[tauri::command]
pub async fn send_ai_chat_message(
    app: AppHandle,
    history: State<'_, crate::HistoryBridge>,
    request: AiChatRequest,
) -> Result<AiChatResponse, String> {
    chat::send_ai_chat_message_impl(app, history, request).await
}
