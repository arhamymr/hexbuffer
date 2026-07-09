use serde::Serialize;
use std::fs;
use std::path::Path;
use tauri::{AppHandle, Manager, State};

use crate::db::repository::Database;
use crate::{
    stop_all_active_crawls, stop_browser_process, AiBrowserState, BrowserProcessState, HistoryBridge,
};


#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StorageInfo {
    app_data_dir: String,
    database_path: String,
    browser_artifacts_path: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ClearBrowserArtifactsResult {
    artifact_dir: String,
    files_deleted: u64,
    bytes_deleted: u64,
    pages_updated: usize,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ResetLocalDataResult {
    artifact_dir: String,
    files_deleted: u64,
    bytes_deleted: u64,
    pages_updated: usize,
    intercept_browser_profile_removed: bool,
    ca_file_removed: bool,
}

#[tauri::command]
pub async fn get_storage_info(app: AppHandle) -> Result<StorageInfo, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?;
    let database_path = app_data_dir.join("hexbuffer.db");
    let browser_artifacts_path = app_data_dir.join("ai-browser-artifacts");

    Ok(StorageInfo {
        app_data_dir: app_data_dir.display().to_string(),
        database_path: database_path.display().to_string(),
        browser_artifacts_path: browser_artifacts_path.display().to_string(),
    })
}

fn count_files(path: &Path) -> Result<(u64, u64), String> {
    if !path.exists() {
        return Ok((0, 0));
    }

    let mut files = 0u64;
    let mut bytes = 0u64;
    for entry in fs::read_dir(path).map_err(|error| error.to_string())? {
        let entry = entry.map_err(|error| error.to_string())?;
        let metadata = entry.metadata().map_err(|error| error.to_string())?;
        if metadata.is_dir() {
            let (child_files, child_bytes) = count_files(&entry.path())?;
            files += child_files;
            bytes += child_bytes;
        } else if metadata.is_file() {
            files += 1;
            bytes += metadata.len();
        }
    }

    Ok((files, bytes))
}

#[tauri::command]
pub async fn clear_browser_automation_artifacts(
    app: AppHandle,
    history: State<'_, HistoryBridge>,
) -> Result<ClearBrowserArtifactsResult, String> {
    let artifact_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?
        .join("ai-browser-artifacts");
    let (files_deleted, bytes_deleted) = count_files(&artifact_dir)?;

    if artifact_dir.exists() {
        fs::remove_dir_all(&artifact_dir).map_err(|error| error.to_string())?;
    }
    fs::create_dir_all(&artifact_dir).map_err(|error| error.to_string())?;

    let pages_updated = history.clear_ai_browser_artifact_paths()?;

    Ok(ClearBrowserArtifactsResult {
        artifact_dir: artifact_dir.display().to_string(),
        files_deleted,
        bytes_deleted,
        pages_updated,
    })
}

#[tauri::command]
pub async fn reset_local_data(
    app: AppHandle,
    history: State<'_, HistoryBridge>,
) -> Result<ResetLocalDataResult, String> {
    // ponytail: stop proxy and terminate running browsers/crawls cleanly before attempting deletion
    let _ = crate::proxy::stop();
    if let Some(browser_state) = app.try_state::<BrowserProcessState>() {
        let _ = stop_browser_process(&browser_state);
    }
    if let Some(ai_browser_state) = app.try_state::<AiBrowserState>() {
        stop_all_active_crawls(&app, &ai_browser_state);
    }

    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?;
    let artifact_dir = app_data_dir.join("ai-browser-artifacts");
    let intercept_browser_profile_dir = app_data_dir.join("intercept-browser-profile");
    let ca_path = app_data_dir.join("hexbuffer-ca.pem");
    let (files_deleted, bytes_deleted) = count_files(&artifact_dir)?;

    if artifact_dir.exists() {
        fs::remove_dir_all(&artifact_dir).map_err(|error| error.to_string())?;
    }
    fs::create_dir_all(&artifact_dir).map_err(|error| error.to_string())?;

    let intercept_browser_profile_removed = intercept_browser_profile_dir.exists();
    if intercept_browser_profile_removed {
        fs::remove_dir_all(&intercept_browser_profile_dir).map_err(|error| error.to_string())?;
    }

    let ca_file_removed = ca_path.exists();
    if ca_file_removed {
        fs::remove_file(&ca_path).map_err(|error| error.to_string())?;
    }

    let pages_updated = history.clear_ai_browser_artifact_paths()?;

    Ok(ResetLocalDataResult {
        artifact_dir: artifact_dir.display().to_string(),
        files_deleted,
        bytes_deleted,
        pages_updated,
        intercept_browser_profile_removed,
        ca_file_removed,
    })
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ResetDatabaseResult {
    database_path: String,
    success: bool,
}

#[tauri::command]
pub async fn reset_database(
    app: AppHandle,
    database: State<'_, Database>,
    history: State<'_, HistoryBridge>,
) -> Result<ResetDatabaseResult, String> {
    // ponytail: stop proxy and terminate running browsers/crawls cleanly
    let _ = crate::proxy::stop();
    if let Some(browser_state) = app.try_state::<BrowserProcessState>() {
        let _ = stop_browser_process(&browser_state);
    }
    if let Some(ai_browser_state) = app.try_state::<AiBrowserState>() {
        stop_all_active_crawls(&app, &ai_browser_state);
    }

    // Close connections to unlock files
    database.close_connection().map_err(|e| e.to_string())?;
    history.close_connection().map_err(|e| e.to_string())?;

    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?;
    let db_path = app_data_dir.join("hexbuffer.db");

    if db_path.exists() {
        fs::remove_file(&db_path).map_err(|error| error.to_string())?;
    }
    let wal_path = db_path.with_extension("db-wal");
    if wal_path.exists() {
        let _ = fs::remove_file(&wal_path);
    }
    let shm_path = db_path.with_extension("db-shm");
    if shm_path.exists() {
        let _ = fs::remove_file(&shm_path);
    }

    // Reopen and reinitialize database schema
    database.reopen_and_init().map_err(|e| e.to_string())?;
    history.reopen_and_init().map_err(|e| e.to_string())?;

    // Reload mock configurations if any state relies on DB loaded data
    let mock_forge_state = app.try_state::<crate::commands::mock_forge::MockForgeState>();
    if let Some(mock_state) = mock_forge_state {
        let _ = crate::commands::mock_forge::load_mock_forge_from_db(&mock_state, &database);
    }

    Ok(ResetDatabaseResult {
        database_path: db_path.display().to_string(),
        success: true,
    })
}

#[tauri::command]
pub async fn reset_all_app_data(
    app: AppHandle,
    database: State<'_, Database>,
    history: State<'_, HistoryBridge>,
) -> Result<ResetLocalDataResult, String> {
    // ponytail: stop proxy and terminate running browsers/crawls cleanly
    let _ = crate::proxy::stop();
    if let Some(browser_state) = app.try_state::<BrowserProcessState>() {
        let _ = stop_browser_process(&browser_state);
    }
    if let Some(ai_browser_state) = app.try_state::<AiBrowserState>() {
        stop_all_active_crawls(&app, &ai_browser_state);
    }

    // Close connections to unlock database files
    database.close_connection().map_err(|e| e.to_string())?;
    history.close_connection().map_err(|e| e.to_string())?;

    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?;
    
    // DB files
    let db_path = app_data_dir.join("hexbuffer.db");
    if db_path.exists() {
        fs::remove_file(&db_path).map_err(|error| error.to_string())?;
    }
    let wal_path = db_path.with_extension("db-wal");
    if wal_path.exists() {
        let _ = fs::remove_file(&wal_path);
    }
    let shm_path = db_path.with_extension("db-shm");
    if shm_path.exists() {
        let _ = fs::remove_file(&shm_path);
    }

    // Local data directories
    let artifact_dir = app_data_dir.join("ai-browser-artifacts");
    let intercept_browser_profile_dir = app_data_dir.join("intercept-browser-profile");
    let ca_path = app_data_dir.join("hexbuffer-ca.pem");

    let (files_deleted, bytes_deleted) = count_files(&artifact_dir)?;
    if artifact_dir.exists() {
        fs::remove_dir_all(&artifact_dir).map_err(|error| error.to_string())?;
    }
    fs::create_dir_all(&artifact_dir).map_err(|error| error.to_string())?;

    let intercept_browser_profile_removed = intercept_browser_profile_dir.exists();
    if intercept_browser_profile_removed {
        fs::remove_dir_all(&intercept_browser_profile_dir).map_err(|error| error.to_string())?;
    }

    let ca_file_removed = ca_path.exists();
    if ca_file_removed {
        fs::remove_file(&ca_path).map_err(|error| error.to_string())?;
    }

    // Reopen and reinitialize database schema
    database.reopen_and_init().map_err(|e| e.to_string())?;
    history.reopen_and_init().map_err(|e| e.to_string())?;

    // Reload mock configurations if any state relies on DB loaded data
    let mock_forge_state = app.try_state::<crate::commands::mock_forge::MockForgeState>();
    if let Some(mock_state) = mock_forge_state {
        let _ = crate::commands::mock_forge::load_mock_forge_from_db(&mock_state, &database);
    }

    let pages_updated = history.clear_ai_browser_artifact_paths()?;

    Ok(ResetLocalDataResult {
        artifact_dir: artifact_dir.display().to_string(),
        files_deleted,
        bytes_deleted,
        pages_updated,
        intercept_browser_profile_removed,
        ca_file_removed,
    })
}

