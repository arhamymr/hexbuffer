use std::collections::HashSet;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager, State};
use uuid::Uuid;

use crate::threats::ghidra::validate_ghidra_headless_path;
use crate::threats::{
    create_analysis_run, finish_analysis_run, import_sample, GhidraValidationResult,
    ThreatAnalysisOptions, ThreatAnalysisResult, ThreatAnalysisRun, ThreatSample, ThreatSettings,
    YaraRulePack,
};
use crate::HistoryBridge;

#[derive(Default)]
pub struct ThreatAnalysisState {
    cancelled_samples: Arc<Mutex<HashSet<String>>>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveThreatSettingsPayload {
    pub ghidra_headless_path: Option<String>,
    #[serde(default)]
    pub yara_rule_packs: Vec<YaraRulePack>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateYaraRulePackPayload {
    pub id: String,
    pub enabled: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DeleteThreatSampleResult {
    pub sample_id: String,
    pub deleted: bool,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ThreatAnalysisFailedEvent {
    pub sample_id: String,
    pub error: String,
    pub result: Option<ThreatAnalysisResult>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ThreatAnalysisLogEvent {
    pub sample_id: String,
    pub run_id: String,
    pub message: String,
    pub timestamp: String,
}

#[tauri::command]
pub async fn get_threats_settings(app: AppHandle) -> Result<ThreatSettings, String> {
    read_settings(&settings_path(&app)?)
}

#[tauri::command]
pub async fn save_threats_settings(
    app: AppHandle,
    settings: SaveThreatSettingsPayload,
) -> Result<ThreatSettings, String> {
    let next = ThreatSettings {
        ghidra_headless_path: settings.ghidra_headless_path.and_then(|path| {
            let trimmed = path.trim().to_string();
            if trimmed.is_empty() {
                None
            } else {
                Some(trimmed)
            }
        }),
        yara_rule_packs: settings.yara_rule_packs,
    };
    let path = settings_path(&app)?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    let content = serde_json::to_string_pretty(&next).map_err(|error| error.to_string())?;
    fs::write(path, content).map_err(|error| error.to_string())?;
    Ok(next)
}

#[tauri::command]
pub async fn import_yara_rule_pack(
    app: AppHandle,
    file_path: String,
) -> Result<ThreatSettings, String> {
    let mut settings = read_settings(&settings_path(&app)?)?;
    let source = PathBuf::from(&file_path);
    let file_name = source
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("rules.yar")
        .to_string();
    let id = Uuid::new_v4().to_string();
    let rules_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?
        .join("threats")
        .join("yara-rules")
        .join(&id);
    fs::create_dir_all(&rules_dir).map_err(|error| error.to_string())?;
    let stored_path = rules_dir.join(&file_name);
    fs::copy(&source, &stored_path).map_err(|error| error.to_string())?;

    settings.yara_rule_packs.push(YaraRulePack {
        id,
        name: file_name,
        path: stored_path.display().to_string(),
        enabled: true,
        imported_at: chrono::Utc::now().to_rfc3339(),
    });
    write_settings(&settings_path(&app)?, &settings)?;
    Ok(settings)
}

#[tauri::command]
pub async fn update_yara_rule_pack(
    app: AppHandle,
    pack: UpdateYaraRulePackPayload,
) -> Result<ThreatSettings, String> {
    let mut settings = read_settings(&settings_path(&app)?)?;
    if let Some(existing) = settings
        .yara_rule_packs
        .iter_mut()
        .find(|existing| existing.id == pack.id)
    {
        existing.enabled = pack.enabled;
    }
    write_settings(&settings_path(&app)?, &settings)?;
    Ok(settings)
}

#[tauri::command]
pub async fn delete_yara_rule_pack(
    app: AppHandle,
    pack_id: String,
) -> Result<ThreatSettings, String> {
    let mut settings = read_settings(&settings_path(&app)?)?;
    let removed = settings
        .yara_rule_packs
        .iter()
        .find(|pack| pack.id == pack_id)
        .cloned();
    settings.yara_rule_packs.retain(|pack| pack.id != pack_id);
    write_settings(&settings_path(&app)?, &settings)?;

    if let Some(pack) = removed {
        let path = PathBuf::from(pack.path);
        if let Some(parent) = path.parent() {
            if parent.exists() {
                let _ = fs::remove_dir_all(parent);
            }
        }
    }

    Ok(settings)
}

#[tauri::command]
pub async fn validate_ghidra_headless(path: String) -> Result<GhidraValidationResult, String> {
    Ok(validate_ghidra_headless_path(&path))
}

#[tauri::command]
pub async fn import_threat_sample(
    app: AppHandle,
    file_path: String,
    history: State<'_, HistoryBridge>,
) -> Result<ThreatSample, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?;
    import_sample(&app_data_dir, Path::new(&file_path), &history)
}

#[tauri::command]
pub async fn list_threat_samples(
    history: State<'_, HistoryBridge>,
) -> Result<Vec<ThreatSample>, String> {
    history.list_threat_samples()
}

#[tauri::command]
pub async fn get_threat_analysis(
    sample_id: String,
    history: State<'_, HistoryBridge>,
) -> Result<Option<ThreatAnalysisResult>, String> {
    history.get_threat_analysis(&sample_id)
}

#[tauri::command]
pub async fn start_threat_analysis(
    app: AppHandle,
    sample_id: String,
    options: ThreatAnalysisOptions,
    history: State<'_, HistoryBridge>,
    state: State<'_, ThreatAnalysisState>,
) -> Result<ThreatAnalysisRun, String> {
    {
        let mut cancelled = state.cancelled_samples.lock().unwrap();
        cancelled.remove(&sample_id);
    }

    let sample = history
        .get_threat_sample(&sample_id)?
        .ok_or_else(|| format!("Threat sample {sample_id} was not found"))?;
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?;
    let db_path = app_data_dir.join("0xbuffer.db");
    let settings = read_settings(&settings_path(&app)?)?;
    let mut options = options;
    options.enabled_yara_rule_paths = settings
        .yara_rule_packs
        .iter()
        .filter(|pack| pack.enabled)
        .map(|pack| pack.path.clone())
        .collect();
    let scripts_dir = ghidra_scripts_dir(&app);
    let run = create_analysis_run(&sample);
    history.insert_threat_analysis_run(&run)?;
    let _ = app.emit("threats:analysis-started", &run);

    let worker_app = app.clone();
    let worker_run = run.clone();
    let worker_run_id = worker_run.id.clone();
    let worker_sample = sample.clone();
    let worker_sample_id = worker_sample.id.clone();
    let cancelled_samples = state.cancelled_samples.clone();

    tauri::async_runtime::spawn_blocking(move || {
        let worker_history = match HistoryBridge::new(db_path) {
            Ok(history) => history,
            Err(error) => {
                let _ = worker_app.emit(
                    "threats:analysis-failed",
                    ThreatAnalysisFailedEvent {
                        sample_id: worker_sample_id.clone(),
                        error,
                        result: None,
                    },
                );
                return;
            }
        };

        let result = finish_analysis_run(
            &app_data_dir,
            &worker_sample,
            options,
            settings.ghidra_headless_path,
            scripts_dir,
            &worker_history,
            worker_run,
            || {
                cancelled_samples
                    .lock()
                    .map(|cancelled| cancelled.contains(&worker_sample_id))
                    .unwrap_or(false)
            },
            |message| {
                let _ = worker_app.emit(
                    "threats:analysis-log",
                    ThreatAnalysisLogEvent {
                        sample_id: worker_sample_id.clone(),
                        run_id: worker_run_id.clone(),
                        message: message.to_string(),
                        timestamp: chrono::Utc::now().to_rfc3339(),
                    },
                );
            },
        );

        match result {
            Ok(result) => {
                let _ = worker_app.emit("threats:analysis-completed", &result);
            }
            Err(error) => {
                let latest = worker_history
                    .get_threat_analysis(&worker_sample_id)
                    .ok()
                    .flatten();
                let event_name = latest
                    .as_ref()
                    .and_then(|result| result.latest_run.as_ref())
                    .map(|run| match run.status {
                        crate::threats::types::ThreatAnalysisStatus::Cancelled => {
                            "threats:analysis-cancelled"
                        }
                        _ => "threats:analysis-failed",
                    })
                    .unwrap_or("threats:analysis-failed");

                let _ = worker_app.emit(
                    event_name,
                    ThreatAnalysisFailedEvent {
                        sample_id: worker_sample_id.clone(),
                        error,
                        result: latest,
                    },
                );
            }
        }

        if let Ok(mut cancelled) = cancelled_samples.lock() {
            cancelled.remove(&worker_sample_id);
        }
    });

    Ok(run)
}

#[tauri::command]
pub async fn cancel_threat_analysis(
    sample_id: String,
    state: State<'_, ThreatAnalysisState>,
) -> Result<(), String> {
    let mut cancelled = state.cancelled_samples.lock().unwrap();
    cancelled.insert(sample_id);
    Ok(())
}

#[tauri::command]
pub async fn delete_threat_sample(
    app: AppHandle,
    sample_id: String,
    history: State<'_, HistoryBridge>,
) -> Result<DeleteThreatSampleResult, String> {
    let sample = history.get_threat_sample(&sample_id)?;
    let deleted_count = history.delete_threat_sample(&sample_id)?;

    if let Some(sample) = sample {
        let stored_path = PathBuf::from(sample.stored_path);
        if let Some(sample_dir) = stored_path.parent() {
            if sample_dir.exists() {
                fs::remove_dir_all(sample_dir).map_err(|error| error.to_string())?;
            }
        }
    }

    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?;
    let artifact_dir = app_data_dir
        .join("threats")
        .join("artifacts")
        .join(&sample_id);
    if artifact_dir.exists() {
        fs::remove_dir_all(artifact_dir).map_err(|error| error.to_string())?;
    }

    Ok(DeleteThreatSampleResult {
        sample_id,
        deleted: deleted_count > 0,
    })
}

fn settings_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?
        .join("threats")
        .join("settings.json"))
}

fn read_settings(path: &Path) -> Result<ThreatSettings, String> {
    if !path.exists() {
        return Ok(ThreatSettings {
            ghidra_headless_path: None,
            yara_rule_packs: Vec::new(),
        });
    }
    let content = fs::read_to_string(path).map_err(|error| error.to_string())?;
    serde_json::from_str(&content).map_err(|error| error.to_string())
}

fn write_settings(path: &Path, settings: &ThreatSettings) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    let content = serde_json::to_string_pretty(settings).map_err(|error| error.to_string())?;
    fs::write(path, content).map_err(|error| error.to_string())
}

fn ghidra_scripts_dir(app: &AppHandle) -> PathBuf {
    if let Ok(resource_dir) = app.path().resource_dir() {
        let bundled = resource_dir.join("ghidra");
        if bundled.exists() {
            return bundled;
        }
    }
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("resources")
        .join("ghidra")
}
