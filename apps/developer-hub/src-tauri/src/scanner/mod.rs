pub mod dependencies;
pub mod report;
pub mod secrets;
pub mod static_analysis;
pub mod types;

use std::path::Path;
use std::sync::atomic::AtomicBool;
use std::time::Instant;
use tauri::Emitter;

pub use types::{AiExplanation, AuditResult, Finding, ScanResult};

/// Scan a directory for security issues.
/// If `app_handle` is provided, emits per-file progress events.
pub fn scan_directory(path: &Path) -> ScanResult {
    scan_directory_inner(path, None, None)
}

/// Scan with progress events emitted to the frontend.
pub fn scan_directory_with_events(
    app: &tauri::AppHandle,
    path: &Path,
    cancelled: &AtomicBool,
) -> ScanResult {
    scan_directory_inner(path, Some(app), Some(cancelled))
}

fn scan_directory_inner(
    path: &Path,
    app_handle: Option<&tauri::AppHandle>,
    cancelled: Option<&AtomicBool>,
) -> ScanResult {
    let start = Instant::now();
    let scan_root = path.to_string_lossy().to_string();

    // Emit scan phase events
    if let Some(app) = app_handle {
        let _ = app.emit("audit:scan-phase", serde_json::json!({"phase": "secrets", "message": "Scanning for secrets and credentials..."}));
    }

    // Run secret detection
    let (mut secret_findings, files_scanned) =
        secrets::scan_secrets_with_events(path, app_handle, cancelled);

    if let Some(app) = app_handle {
        let _ = app.emit("audit:scan-phase", serde_json::json!({"phase": "dependencies", "message": "Auditing dependencies..."}));
    }

    // Run dependency audit
    let dep_findings = dependencies::scan_dependencies(path);

    if let Some(app) = app_handle {
        let _ = app.emit("audit:scan-phase", serde_json::json!({"phase": "static_analysis", "message": "Running static analysis rules..."}));
    }

    // Run static analysis
    let sa_findings = static_analysis::scan_static_analysis(path);

    // Merge findings and re-ID with category prefix
    let mut findings = Vec::with_capacity(secret_findings.len() + dep_findings.len() + sa_findings.len());

    // Re-ID secrets
    for (i, f) in secret_findings.iter_mut().enumerate() {
        f.id = format!("SEC-{:04}", i + 1);
    }
    findings.append(&mut secret_findings);

    // Re-ID deps
    let mut dep_final: Vec<Finding> = dep_findings;
    for (i, f) in dep_final.iter_mut().enumerate() {
        f.id = format!("DEP-{:04}", i + 1);
    }
    findings.append(&mut dep_final);

    // Re-ID static analysis
    let mut sa_final: Vec<Finding> = sa_findings;
    for (i, f) in sa_final.iter_mut().enumerate() {
        f.id = format!("SA-{:04}", i + 1);
    }
    findings.append(&mut sa_final);

    let duration_ms = start.elapsed().as_millis() as u64;

    ScanResult {
        scan_root,
        files_scanned,
        findings,
        duration_ms,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::io::Write;

    #[test]
    fn test_scan_empty_directory() {
        let dir = tempfile::tempdir().unwrap();
        let result = scan_directory(dir.path());
        assert_eq!(result.findings.len(), 0);
        assert!(result.files_scanned == 0);
        assert!(result.duration_ms < 1000);
    }

    #[test]
    fn test_scan_detects_multiple_categories() {
        let dir = tempfile::tempdir().unwrap();

        // Add a file with a secret
        let config_path = dir.path().join("config.js");
        let mut f = fs::File::create(&config_path).unwrap();
        f.write_all(b"const SECRET_KEY = 'my-secret-12345';\n")
            .unwrap();

        // Add a package.json with a known vulnerable dep
        let pkg_path = dir.path().join("package.json");
        let mut f = fs::File::create(&pkg_path).unwrap();
        f.write_all(br#"{"dependencies": {"lodash": "4.17.19"}}"#)
            .unwrap();

        let result = scan_directory(dir.path());
        assert!(result.findings.len() >= 2, "Should have at least 2 findings");
        assert!(result.files_scanned >= 1);

        let has_secret = result
            .findings
            .iter()
            .any(|f| f.id.starts_with("SEC-"));
        let has_dep = result
            .findings
            .iter()
            .any(|f| f.id.starts_with("DEP-"));

        assert!(has_secret, "Should have at least one secret finding");
        assert!(has_dep, "Should have at least one dependency finding");
    }
}
