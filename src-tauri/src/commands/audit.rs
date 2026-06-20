use serde_json::Value;
use std::collections::HashMap;
use std::io::{BufRead, BufReader};
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::{AppHandle, Emitter, Manager, State};
use tauri_plugin_shell::ShellExt;

use crate::ai::keyring::read_required_ai_api_key;
use crate::ai::providers::api_key_env_name;
use crate::ai::settings::read_ai_settings;
use crate::db::repository::DocumentRecord;
use crate::scanner::report::generate_markdown_report;
use crate::scanner::{scan_directory_with_events, AiExplanation, AuditResult, Finding};

/// Shared state for controlling in-flight audits.
#[derive(Default, Clone)]
pub struct AuditState {
    pub cancelled: Arc<AtomicBool>,
}

impl AuditState {
    pub fn new() -> Self {
        Self {
            cancelled: Arc::new(AtomicBool::new(false)),
        }
    }
}

/// Cancel a running audit.
#[tauri::command]
pub async fn stop_audit(state: State<'_, AuditState>) -> Result<(), String> {
    state.cancelled.store(true, Ordering::SeqCst);
    Ok(())
}

/// Start a code audit. The scan runs in the background and streams results
/// via events. Returns immediately with a basic acknowledgment.
#[tauri::command]
pub async fn audit_directory(
    app: AppHandle,
    path: String,
    audit_state: State<'_, AuditState>,
) -> Result<serde_json::Value, String> {
    // Reset cancellation flag
    audit_state.cancelled.store(false, Ordering::SeqCst);

    let scan_root = PathBuf::from(&path);
    if !scan_root.exists() || !scan_root.is_dir() {
        return Err(format!("Path does not exist or is not a directory: {}", path));
    }

    // Read settings early so we fail fast if AI is misconfigured
    let settings = read_ai_settings(&app)?;
    let has_ai = settings.allow_third_party_ai_sharing
        && read_required_ai_api_key(&settings.provider).map(|k| !k.trim().is_empty()).unwrap_or(false);

    // Fire-and-forget: spawn the scan + AI pipeline in the background
    let bg_app = app.clone();
    let bg_cancelled = audit_state.cancelled.clone();
    let bg_path = path.clone();
    let bg_provider = settings.provider.clone();
    let bg_model = settings.model.clone();
    let bg_has_ai = has_ai;

    tauri::async_runtime::spawn(async move {
        run_audit_pipeline(bg_app, bg_path, bg_cancelled, bg_provider, bg_model, bg_has_ai).await;
    });

    // Return immediately so events flow to the frontend
    Ok(serde_json::json!({
        "status": "started",
        "path": path,
    }))
}

/// The actual audit pipeline, running in a background task.
async fn run_audit_pipeline(
    app: AppHandle,
    path: String,
    cancelled: Arc<AtomicBool>,
    provider: String,
    model: String,
    has_ai: bool,
) {
    let scan_root = PathBuf::from(&path);

    // ── Phase 1: Rust Scanner (blocking) ──
    let app_for_scan = app.clone();
    let scan_root_move = scan_root.clone();
    let cancelled_move = cancelled.clone();

    let scan_result = match tokio::task::spawn_blocking(move || {
        scan_directory_with_events(&app_for_scan, &scan_root_move, &cancelled_move)
    })
    .await
    {
        Ok(r) => r,
        Err(e) => {
            let _ = app.emit("audit:failed", serde_json::json!({"error": e.to_string()}));
            return;
        }
    };

    // Emit scan-complete so frontend can show findings immediately
    let _ = app.emit(
        "audit:scan-finished",
        serde_json::json!({
            "findings": scan_result.findings,
            "filesScanned": scan_result.files_scanned,
            "durationMs": scan_result.duration_ms,
        }),
    );

    // Check if cancelled
    if cancelled.load(Ordering::SeqCst) {
        let _ = app.emit("audit:finished", serde_json::json!({"cancelled": true}));
        return;
    }

    // ── Phase 2: AI Analysis (if configured) ──
    if !has_ai || scan_result.findings.is_empty() {
        let _ = app.emit(
            "audit:finished",
            serde_json::json!({
                "totalFindings": scan_result.findings.len(),
                "aiAnalyzed": 0,
                "durationMs": scan_result.duration_ms,
            }),
        );
        return;
    }

    let findings_json = match serde_json::to_string(&scan_result.findings) {
        Ok(j) => j,
        Err(e) => {
            let _ = app.emit("audit:failed", serde_json::json!({"error": format!("Serialization error: {}", e)}));
            return;
        }
    };

    let api_key = match read_required_ai_api_key(&provider) {
        Ok(k) => k,
        Err(e) => {
            let _ = app.emit("audit:failed", serde_json::json!({"error": e}));
            return;
        }
    };

    let api_key_env = match api_key_env_name(&provider) {
        Ok(e) => e,
        Err(e) => {
            let _ = app.emit("audit:failed", serde_json::json!({"error": e}));
            return;
        }
    };

    // Spawn the sidecar (blocking — but we're in a spawned task already)
    let app_for_sidecar = app.clone();
    let total_findings = scan_result.findings.len();
    let scan_duration = scan_result.duration_ms;
    let sidecar_provider = provider.clone();
    let sidecar_model = model.clone();

    let sidecar_result = tokio::task::spawn_blocking(move || -> Result<std::process::Output, String> {
        let sidecar_command = app_for_sidecar
            .shell()
            .sidecar("ai-engine")
            .map_err(|e| format!("Failed to prepare AI engine sidecar: {}", e))?
            .env("HEXBUFFER_AI_ENGINE_MODE", "audit")
            .env("HEXBUFFER_AUDIT_FINDINGS_JSON", &findings_json)
            .env("XBUFFER_AI_PROVIDER", sidecar_provider.trim())
            .env("HEXBUFFER_AI_MODEL", sidecar_model.trim())
            .env("AI_SDK_LOG_WARNINGS", "false")
            .env(&api_key_env, api_key.trim());

        let mut command: Command = sidecar_command.into();
        command.stdout(Stdio::piped()).stderr(Stdio::piped());
        let child = command.spawn().map_err(|e| e.to_string())?;
        child.wait_with_output().map_err(|e| e.to_string())
    })
    .await;

    let output = match sidecar_result {
        Ok(Ok(o)) => o,
        Ok(Err(e)) => {
            let _ = app.emit("audit:failed", serde_json::json!({"error": e.to_string()}));
            return;
        }
        Err(e) => {
            let _ = app.emit("audit:failed", serde_json::json!({"error": e.to_string()}));
            return;
        }
    };

    // Parse sidecar output
    let stdout = match String::from_utf8(output.stdout) {
        Ok(s) => s,
        Err(e) => {
            let _ = app.emit("audit:failed", serde_json::json!({"error": format!("Invalid sidecar stdout: {}", e)}));
            return;
        }
    };

    let reader = BufReader::new(stdout.as_bytes());
    let mut explanations: HashMap<String, AiExplanation> = HashMap::new();
    let mut ai_analyzed = 0u32;

    for line in reader.lines() {
        let line = match line {
            Ok(l) => l,
            Err(_) => continue,
        };
        if line.trim().is_empty() {
            continue;
        }

        let msg: Value = match serde_json::from_str(&line) {
            Ok(m) => m,
            Err(_) => continue,
        };

        let msg_type = msg["type"].as_str().unwrap_or("");

        match msg_type {
            "audit_started" => {
                let _ = app.emit("audit:ai-started", serde_json::json!({
                    "totalFindings": total_findings,
                    "provider": msg["provider"].as_str().unwrap_or(&provider),
                    "model": msg["model"].as_str().unwrap_or(&model),
                }));
            }
            "audit_finding_delta" => {
                let finding_id = msg["findingId"].as_str().unwrap_or("");
                let delta = msg["delta"].as_str().unwrap_or("");
                let _ = app.emit("audit:finding-delta", serde_json::json!({
                    "findingId": finding_id,
                    "delta": delta,
                }));
            }
            "audit_finding_complete" => {
                let finding_id = msg["findingId"].as_str().unwrap_or("").to_string();
                let explanation = msg["explanation"].as_str().unwrap_or("").to_string();
                let fix_suggestion = msg["fix"].as_str().unwrap_or("").to_string();
                let ai_severity = msg["severity"].as_str().map(|s| s.to_string());
                let severity_rationale = msg["severityRationale"].as_str().map(|s| s.to_string());

                let fid_for_emit = finding_id.clone();
                explanations.insert(finding_id.clone(), AiExplanation {
                    finding_id,
                    explanation,
                    fix_suggestion,
                    ai_severity,
                    severity_rationale,
                });

                ai_analyzed += 1;
                let _ = app.emit("audit:finding-explained", serde_json::json!({
                    "findingId": fid_for_emit,
                    "aiAnalyzed": ai_analyzed,
                    "totalFindings": total_findings,
                }));
            }
            "audit_finished" => {
                // Handled below
            }
            "audit_failed" => {
                let error = msg["message"].as_str().unwrap_or("AI audit failed").to_string();
                let _ = app.emit("audit:ai-failed", serde_json::json!({"error": error}));
            }
            _ => {}
        }
    }

    // Send final results
    let _ = app.emit("audit:results", serde_json::json!({
        "explanations": explanations,
        "provider": provider,
        "model": model,
        "totalFindings": total_findings,
        "aiAnalyzed": ai_analyzed,
        "durationMs": scan_duration,
        "filesScanned": scan_result.files_scanned,
    }));

    let _ = app.emit("audit:finished", serde_json::json!({
        "totalFindings": total_findings,
        "aiAnalyzed": ai_analyzed,
        "durationMs": scan_duration,
    }));
}

/// Generate a Markdown report from the last audit and save to documents.
#[tauri::command]
pub async fn generate_audit_report(
    app: AppHandle,
    history: State<'_, crate::HistoryBridge>,
    path: String,
    findings_json: String,
    explanations_json: String,
    files_scanned: usize,
    duration_ms: u64,
) -> Result<String, String> {
    let findings: Vec<Finding> = serde_json::from_str(&findings_json)
        .map_err(|e| format!("Failed to parse findings: {}", e))?;

    let explanations: std::collections::HashMap<String, AiExplanation> =
        serde_json::from_str(&explanations_json)
            .map_err(|e| format!("Failed to parse explanations: {}", e))?;

    let report = generate_markdown_report(&path, &findings, &explanations, files_scanned, duration_ms);

    // Save to documents as a single-section document
    let doc_id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    let title = format!("Audit Report — {}", chrono::Utc::now().format("%Y-%m-%d"));

    let sections = serde_json::json!({
        "report": {
            "id": "report",
            "title": "Security Audit Report",
            "content": report
        }
    });

    let doc = DocumentRecord {
        id: doc_id.clone(),
        name: title.clone(),
        title: title.clone(),
        sections,
        custom_sections: serde_json::json!([]),
        removed_built_in_sections: serde_json::json!([]),
        api_entries: serde_json::json!([]),
        created_at: now.clone(),
        updated_at: now,
    };

    history.save_document(&doc)
        .map_err(|e| format!("Failed to save report document: {}", e))?;

    let _ = app.emit(
        "audit:report-generated",
        serde_json::json!({
            "docId": doc_id,
            "title": title,
        }),
    );

    Ok(report)
}
