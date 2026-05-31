use serde::Serialize;
use tauri::{AppHandle, Manager};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StorageInfo {
    app_data_dir: String,
    database_path: String,
}

#[tauri::command]
pub async fn get_storage_info(app: AppHandle) -> Result<StorageInfo, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?;
    let database_path = app_data_dir.join("0xbuffer.db");

    Ok(StorageInfo {
        app_data_dir: app_data_dir.display().to_string(),
        database_path: database_path.display().to_string(),
    })
}
