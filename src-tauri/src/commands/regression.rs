use std::{
    io::{BufRead, BufReader},
    process::{Command, Stdio},
    thread,
};

#[cfg(unix)]
use std::os::unix::process::CommandExt;

use serde_json::Value;
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_shell::ShellExt;
use uuid::Uuid;

use crate::db::repository::Database;

/// Spawn the AI engine sidecar in regression mode and relay its stdout events
/// to the Tauri frontend in real time.
#[tauri::command]
pub async fn run_regression_test(
    app: AppHandle,
    state: tauri::State<'_, Database>,
    test_case_id: String,
) -> Result<Value, String> {
    // Load test case from DB
    let record = state
        .get_regression_test_case(&test_case_id)
        .map_err(|e| format!("Failed to load test case: {}", e))?
        .ok_or_else(|| format!("Test case not found: {}", test_case_id))?;

    let run_id = Uuid::new_v4().to_string();

    // Create run record
    state
        .create_regression_run(&run_id, &test_case_id, "queued")
        .map_err(|e| format!("Failed to create run record: {}", e))?;

    // Build config for the sidecar
    let test_case_value: Value = serde_json::json!({
        "id": record.id,
        "name": record.name,
        "description": record.description,
        "targetUrl": record.target_url,
        "steps": serde_json::from_str::<Value>(&record.steps_json).unwrap_or_default(),
    });
    let config_json = serde_json::to_string(&test_case_value)
        .map_err(|e| format!("Failed to serialize test case: {}", e))?;

    let artifact_dir = app
        .path()
        .app_data_dir()
        .map_err(|e: tauri::Error| e.to_string())?
        .join("regression-artifacts");
    std::fs::create_dir_all(&artifact_dir).map_err(|e| e.to_string())?;

    // Read AI settings for provider/model
    let settings = crate::ai::read_ai_settings(&app).unwrap_or_default();

    let sidecar_command = app
        .shell()
        .sidecar("ai-engine")
        .map_err(|e| format!("Failed to prepare sidecar: {}", e))?
        .env("0XBUFFER_AI_ENGINE_MODE", "regression")
        .env("0XBUFFER_REGRESSION_CONFIG_JSON", &config_json)
        .env("0XBUFFER_REGRESSION_SESSION_ID", &run_id)
        .env(
            "0XBUFFER_PROXY_PORT",
            crate::proxy::active_proxy_port()
                .unwrap_or_else(crate::proxy::default_proxy_port)
                .to_string(),
        )
        .env("XBUFFER_AI_PROVIDER", &settings.provider)
        .env("0XBUFFER_AI_MODEL", &settings.model)
        .env("0XBUFFER_AI_ARTIFACT_DIR", artifact_dir.to_string_lossy().to_string());

    let mut command: Command = sidecar_command.into();
    command
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    // Inject API key if available
    if let Ok(Some(api_key)) = crate::ai::read_optional_ai_api_key(&settings.provider) {
        if !api_key.trim().is_empty() {
            if let Ok(env_name) = crate::ai::api_key_env_name(&settings.provider) {
                command.env(env_name, api_key.trim());
            }
        }
    }

    #[cfg(unix)]
    command.process_group(0);

    let mut child = command
        .spawn()
        .map_err(|e| format!("Failed to start regression sidecar: {}", e))?;

    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| "Failed to capture sidecar stdout".to_string())?;

    let app_clone = app.clone();
    let run_id_clone = run_id.clone();

    // Spawn a thread to read stdout events
    thread::spawn(move || {
        let reader = BufReader::new(stdout);
        for line in reader.lines() {
            let line: String = match line {
                Ok(l) => l,
                Err(_) => break,
            };

            let trimmed = line.trim();
            if trimmed.is_empty() {
                continue;
            }

            let message: Value = match serde_json::from_str(trimmed) {
                Ok(m) => m,
                Err(_) => continue,
            };

            let event_type = message
                .get("type")
                .and_then(Value::as_str)
                .unwrap_or("");

            match event_type {
                "regression:test_started" => {
                    if let Some(db) = app_clone.try_state::<Database>() {
                        let _ = db.create_regression_run(
                            &run_id_clone,
                            message
                                .get("testCaseId")
                                .and_then(Value::as_str)
                                .unwrap_or(""),
                            "running",
                        );
                    }
                    let _ = app_clone.emit("regression:test-started", &message);
                }
                "regression:step_started"
                | "regression:step_completed"
                | "regression:step_failed"
                | "regression:assertion_passed"
                | "regression:assertion_failed" => {
                    let tauri_event = event_type.replace(':', "-");
                    let _ = app_clone.emit(&tauri_event, &message);
                }
                "regression:test_finished" => {
                    let status = message
                        .get("status")
                        .and_then(Value::as_str)
                        .unwrap_or("failed");

                    let step_results = serde_json::json!([]);
                    let ai_verdict = message
                        .get("aiVerdict")
                        .map(|v| serde_json::to_string(v).unwrap_or_default());

                    if let Some(db) = app_clone.try_state::<Database>() {
                        let _ = db.finish_regression_run(
                            &run_id_clone,
                            status,
                            &serde_json::to_string(&step_results).unwrap_or_default(),
                            ai_verdict.as_deref(),
                            if status == "failed" {
                                Some("Some steps failed")
                            } else {
                                None
                            },
                        );
                    }

                    let _ = app_clone.emit("regression:test-finished", &message);
                }
                "regression:test_failed" => {
                    let error = message
                        .get("error")
                        .and_then(Value::as_str)
                        .unwrap_or("Unknown error");

                    if let Some(db) = app_clone.try_state::<Database>() {
                        let _ = db.finish_regression_run(
                            &run_id_clone,
                            "failed",
                            "[]",
                            None,
                            Some(error),
                        );
                    }

                    let _ = app_clone.emit("regression:test-failed", &message);
                }
                _ => {
                    let tauri_event = event_type.replace(':', "-");
                    let _ = app_clone.emit(&tauri_event, &message);
                }
            }
        }
    });

    Ok(serde_json::json!({
        "runId": run_id,
        "testCaseId": test_case_id,
        "status": "queued",
    }))
}

#[tauri::command]
pub async fn list_regression_test_cases(
    state: tauri::State<'_, Database>,
) -> Result<Vec<Value>, String> {
    let records = state
        .list_regression_test_cases()
        .map_err(|e| format!("Failed to list test cases: {}", e))?;

    let cases: Vec<Value> = records
        .into_iter()
        .map(|r| {
            serde_json::json!({
                "id": r.id,
                "name": r.name,
                "description": r.description,
                "targetUrl": r.target_url,
                "steps": serde_json::from_str::<Value>(&r.steps_json).unwrap_or_default(),
                "enabled": r.enabled,
                "createdAt": r.created_at,
                "updatedAt": r.updated_at,
            })
        })
        .collect();

    Ok(cases)
}

#[tauri::command]
pub async fn save_regression_test_case(
    state: tauri::State<'_, Database>,
    test_case: Value,
) -> Result<Value, String> {
    let id = test_case
        .get("id")
        .and_then(Value::as_str)
        .unwrap_or("")
        .to_string();
    let name = test_case
        .get("name")
        .and_then(Value::as_str)
        .unwrap_or("New Test Case")
        .to_string();
    let description = test_case
        .get("description")
        .and_then(Value::as_str)
        .unwrap_or("")
        .to_string();
    let target_url = test_case
        .get("targetUrl")
        .and_then(Value::as_str)
        .unwrap_or("")
        .to_string();
    let steps = test_case
        .get("steps")
        .cloned()
        .unwrap_or(serde_json::json!([]));
    let steps_json = serde_json::to_string(&steps)
        .map_err(|e| format!("Failed to serialize steps: {}", e))?;
    let enabled = test_case
        .get("enabled")
        .and_then(Value::as_bool)
        .unwrap_or(true);

    let actual_id = if id.is_empty() {
        Uuid::new_v4().to_string()
    } else {
        id
    };

    let record = state
        .save_regression_test_case(
            &actual_id,
            &name,
            &description,
            &target_url,
            &steps_json,
            enabled,
        )
        .map_err(|e| format!("Failed to save test case: {}", e))?;

    Ok(serde_json::json!({
        "id": record.id,
        "name": record.name,
        "description": record.description,
        "targetUrl": record.target_url,
        "steps": steps,
        "enabled": record.enabled,
        "createdAt": record.created_at,
        "updatedAt": record.updated_at,
    }))
}

#[tauri::command]
pub async fn delete_regression_test_case(
    state: tauri::State<'_, Database>,
    id: String,
) -> Result<(), String> {
    state
        .delete_regression_test_case(&id)
        .map_err(|e| format!("Failed to delete test case: {}", e))
}

#[tauri::command]
pub async fn list_regression_runs(
    state: tauri::State<'_, Database>,
    test_case_id: String,
) -> Result<Vec<Value>, String> {
    let records = state
        .list_regression_runs(&test_case_id)
        .map_err(|e| format!("Failed to list runs: {}", e))?;

    let runs: Vec<Value> = records
        .into_iter()
        .map(|r| {
            serde_json::json!({
                "id": r.id,
                "testCaseId": r.test_case_id,
                "status": r.status,
                "stepResults": serde_json::from_str::<Value>(&r.step_results_json).unwrap_or_default(),
                "aiVerdict": r.ai_verdict.and_then(|v| serde_json::from_str::<Value>(&v).ok()),
                "startedAt": r.started_at,
                "finishedAt": r.finished_at,
                "error": r.error,
                "createdAt": r.created_at,
            })
        })
        .collect();

    Ok(runs)
}
