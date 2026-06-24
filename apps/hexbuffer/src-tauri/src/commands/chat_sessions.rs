use crate::ai::types::{ChatMessageRecord, ChatSessionRecord};
use crate::HistoryBridge;
use tauri::State;

#[tauri::command]
pub async fn create_chat_session(
    history: State<'_, HistoryBridge>,
) -> Result<ChatSessionRecord, String> {
    history.create_chat_session("New Chat")
}

#[tauri::command]
pub async fn list_chat_sessions(
    history: State<'_, HistoryBridge>,
) -> Result<Vec<ChatSessionRecord>, String> {
    history.list_chat_sessions()
}

#[tauri::command]
pub async fn rename_chat_session(
    history: State<'_, HistoryBridge>,
    id: String,
    title: String,
) -> Result<(), String> {
    history.rename_chat_session(&id, &title)
}

#[tauri::command]
pub async fn delete_chat_session(
    history: State<'_, HistoryBridge>,
    id: String,
) -> Result<(), String> {
    history.delete_chat_session(&id)
}

#[tauri::command]
pub async fn get_chat_messages(
    history: State<'_, HistoryBridge>,
    session_id: String,
) -> Result<Vec<ChatMessageRecord>, String> {
    history.get_chat_messages(&session_id)
}

#[tauri::command]
pub async fn save_chat_messages(
    history: State<'_, HistoryBridge>,
    session_id: String,
    messages: Vec<ChatMessageRecord>,
) -> Result<(), String> {
    history.save_chat_messages(&session_id, &messages)
}
