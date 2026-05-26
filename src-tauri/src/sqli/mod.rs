pub mod detector;
pub mod payloads;
pub mod types;

use tauri::{AppHandle, Emitter, State};

use crate::sqli::detector::SqliDetector;
use crate::sqli::types::{SqliScanConfig, SqliProgressEvent};

pub use types::{
    SqliExtractedColumn, SqliExtractedDatabase, SqliExtractedTable, SqliParam, SqliParamLocation,
    SqliRiskLevel, SqliScanResult, SqliSeverity, SqliTechnique, SqliVulnerability,
    SqliProgressEvent as SqliProgressEventType,
};

#[tauri::command]
pub async fn start_sqli_scan(
    app: AppHandle,
    state: State<'_, types::SqliScanState>,
    config: SqliScanConfig,
) -> Result<SqliScanResult, String> {
    let scan_id = config.scan_id.clone();
    let app_clone = app.clone();

    state.register_scan(&scan_id);

    let detector = SqliDetector::new();

    let scan_id_clone = scan_id.clone();
    let progress_callback = move |event: SqliProgressEvent| {
        let _ = app_clone.emit(&format!("sqli-progress-{}", scan_id_clone), event);
    };

    let result = detector.scan(&config, progress_callback).await;

    state.unregister_scan(&scan_id);

    Ok(result)
}

#[tauri::command]
pub fn stop_sqli_scan(state: State<'_, types::SqliScanState>, scan_id: String) -> Result<(), String> {
    state.cancel_scan(&scan_id);
    Ok(())
}

#[tauri::command]
pub fn get_sqli_scan_state(state: State<'_, types::SqliScanState>, scan_id: String) -> bool {
    state.is_cancelled(&scan_id)
}