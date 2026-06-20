use regex::Regex;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::Emitter;

use super::types::Finding;

/// Directories to skip during scanning.
const SKIP_DIRS: &[&str] = &[
    "node_modules", ".git", "target", "dist", "build", "__pycache__",
    ".next", ".nuxt", "vendor", ".cache", ".pnpm-store",
];

/// File extensions to skip (binary / lock / generated).
const SKIP_EXTENSIONS: &[&str] = &[
    "lock", "min.js", "min.css", "map", "png", "jpg", "jpeg", "gif", "ico",
    "svg", "woff", "woff2", "ttf", "eot", "exe", "dll", "so", "dylib",
    "wasm", "bin", "dat", "db", "sqlite", "sqlite3", "zip", "tar", "gz",
    "bz2", "xz", "7z", "rar", "pdf", "doc", "docx", "xls", "xlsx", "ppt",
    "pptx", "mp3", "mp4", "avi", "mov", "webm", "ogg",
];

/// A single secret-detection rule.
struct SecretRule {
    id: &'static str,
    title: &'static str,
    severity: &'static str,
    pattern: Regex,
    /// If true, redact the matched text in the snippet.
    redact_match: bool,
}

/// Build the list of secret detection rules.
fn secret_rules() -> Vec<SecretRule> {
    vec![
        // AWS Access Key ID
        SecretRule {
            id: "aws-access-key",
            title: "AWS Access Key ID exposed",
            severity: "high",
            pattern: Regex::new(r"(?i)(?:AKIA|ASIA)[0-9A-Z]{16}").unwrap(),
            redact_match: true,
        },
        // Generic secret/API key assignments
        SecretRule {
            id: "generic-secret-assignment",
            title: "Hardcoded secret or API key",
            severity: "high",
            pattern: Regex::new(
                r#"(?i)(?:secret[_-]?key|api[_-]?key|access[_-]?key|app[_-]?secret|client[_-]?secret|private[_-]?key|auth[_-]?token)\s*[:=]\s*["'][^"'\n]{8,}["']"#
            ).unwrap(),
            redact_match: true,
        },
        // Password assignments
        SecretRule {
            id: "hardcoded-password",
            title: "Hardcoded password",
            severity: "high",
            pattern: Regex::new(
                r#"(?i)(?:password|passwd|pwd)\s*[:=]\s*["'][^"'\n]{3,}["']"#
            ).unwrap(),
            redact_match: true,
        },
        // Token assignments
        SecretRule {
            id: "hardcoded-token",
            title: "Hardcoded token",
            severity: "medium",
            pattern: Regex::new(
                r#"(?i)(?:token|jwt|bearer)\s*[:=]\s*["'][^"'\n]{8,}["']"#
            ).unwrap(),
            redact_match: true,
        },
        // Private key headers
        SecretRule {
            id: "private-key-header",
            title: "Private key found in source",
            severity: "critical",
            pattern: Regex::new(
                r"-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----"
            ).unwrap(),
            redact_match: false,
        },
        // Generic high-entropy base64-like strings (>30 chars)
        SecretRule {
            id: "high-entropy-string",
            title: "Suspicious high-entropy string (possible secret)",
            severity: "low",
            pattern: Regex::new(
                r#""[A-Za-z0-9+/=]{40,}""#
            ).unwrap(),
            redact_match: true,
        },
        // .env file variable assignments with suspicious values
        SecretRule {
            id: "env-secret",
            title: "Environment variable with secret-like value",
            severity: "medium",
            pattern: Regex::new(
                r"(?i)^\s*(?:SECRET|KEY|TOKEN|PASSWORD|PASS|AUTH)\w*\s*=\s*.+"
            ).unwrap(),
            redact_match: true,
        },
        // Database connection strings
        SecretRule {
            id: "db-connection-string",
            title: "Database connection string exposed",
            severity: "medium",
            pattern: Regex::new(
                r#"(?i)(?:mysql|postgres(?:ql)?|mongodb|redis|sqlite)://[^"'\s]+"#
            ).unwrap(),
            redact_match: true,
        },
        // GitHub tokens
        SecretRule {
            id: "github-token",
            title: "GitHub personal access token exposed",
            severity: "high",
            pattern: Regex::new(
                r"(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{36,}"
            ).unwrap(),
            redact_match: true,
        },
        // Stripe keys
        SecretRule {
            id: "stripe-key",
            title: "Stripe API key exposed",
            severity: "high",
            pattern: Regex::new(
                r"(?:sk|pk)_(?:live|test)_[A-Za-z0-9]{24,}"
            ).unwrap(),
            redact_match: true,
        },
    ]
}

/// Check if a file path should be skipped.
fn should_skip_file(path: &Path) -> bool {
    // Check extension
    if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
        let lower = ext.to_lowercase();
        if SKIP_EXTENSIONS.iter().any(|skip| lower == *skip) {
            return true;
        }
    }
    // Check full filename for patterns like *.min.js
    if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
        let lower = name.to_lowercase();
        for skip in SKIP_EXTENSIONS {
            if lower.ends_with(&format!(".{}", skip)) {
                return true;
            }
        }
        // Skip lock files
        if lower == "package-lock.json"
            || lower == "yarn.lock"
            || lower == "pnpm-lock.yaml"
            || lower == "cargo.lock"
            || lower == "gemfile.lock"
            || lower == "composer.lock"
            || lower == "poetry.lock"
        {
            return true;
        }
    }
    // Check if any parent directory is in SKIP_DIRS
    for ancestor in path.ancestors() {
        if let Some(name) = ancestor.file_name().and_then(|n| n.to_str()) {
            if SKIP_DIRS.contains(&name) {
                return true;
            }
        }
    }
    false
}

/// Collect all scannable files under `root`.
fn collect_files(root: &Path) -> Vec<PathBuf> {
    let mut files = Vec::new();
    let mut dirs_to_visit = vec![root.to_path_buf()];

    while let Some(dir) = dirs_to_visit.pop() {
        if let Ok(entries) = fs::read_dir(&dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_dir() {
                    // Check skip before recursing
                    if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                        if !SKIP_DIRS.contains(&name) {
                            dirs_to_visit.push(path);
                        }
                    }
                } else if path.is_file() && !should_skip_file(&path) {
                    files.push(path);
                }
            }
        }
    }

    files
}

/// Extract a snippet of context around a match position in file content.
fn extract_snippet(content: &str, line_num: usize, match_text: &str, redact: bool) -> String {
    let lines: Vec<&str> = content.lines().collect();
    let start = line_num.saturating_sub(1); // 0-based
    let context_start = start.saturating_sub(1);
    let context_end = (start + 1).min(lines.len());

    let snippet_lines: Vec<&str> = lines[context_start..=context_end.min(lines.len().saturating_sub(1))]
        .iter()
        .copied()
        .collect();

    let mut snippet = snippet_lines.join("\n");

    // Redact the matched text in the snippet
    if redact {
        snippet = snippet.replace(match_text, "[REDACTED]");
    }

    snippet
}

/// Scan a single file for secrets.
fn scan_file(file_path: &Path, root: &Path, rules: &[SecretRule], counter: &mut usize) -> Vec<Finding> {
    let content = match fs::read_to_string(file_path) {
        Ok(c) => c,
        Err(_) => return Vec::new(), // Skip binary / unreadable files
    };

    *counter += 1;

    let relative_path = file_path
        .strip_prefix(root)
        .unwrap_or(file_path)
        .to_string_lossy()
        .to_string();

    let mut findings = Vec::new();

    for (line_idx, line) in content.lines().enumerate() {
        let line_number = (line_idx + 1) as u32;

        for rule in rules {
            for mat in rule.pattern.find_iter(line) {
                let match_text = mat.as_str().to_string();
                let column = (mat.start() + 1) as u32;
                let snippet = extract_snippet(&content, line_idx, &match_text, rule.redact_match);

                let id = format!("SEC-{:04}", findings.len() + 1);

                findings.push(Finding {
                    id,
                    category: "hardcoded_secret".to_string(),
                    severity: rule.severity.to_string(),
                    title: rule.title.to_string(),
                    file_path: relative_path.clone(),
                    line: Some(line_number),
                    column: Some(column),
                    snippet,
                    match_text: if rule.redact_match {
                        "[REDACTED]".to_string()
                    } else {
                        match_text
                    },
                    rule_id: rule.id.to_string(),
                });
            }
        }
    }

    findings
}

/// Scan a directory for secrets. Returns all findings.
pub fn scan_secrets(root: &Path) -> (Vec<Finding>, usize) {
    let rules = secret_rules();
    let files = collect_files(root);
    let mut findings = Vec::new();
    let mut files_scanned = 0;

    for file in &files {
        let file_findings = scan_file(file, root, &rules, &mut files_scanned);
        findings.extend(file_findings);
    }

    // Re-assign sequential IDs
    for (i, finding) in findings.iter_mut().enumerate() {
        finding.id = format!("SEC-{:04}", i + 1);
    }

    (findings, files_scanned)
}

/// Scan with per-file progress events emitted to the frontend.
pub fn scan_secrets_with_events(
    root: &Path,
    app_handle: Option<&tauri::AppHandle>,
    cancelled: Option<&AtomicBool>,
) -> (Vec<Finding>, usize) {
    let rules = secret_rules();
    let files = collect_files(root);
    let total = files.len();
    let mut findings = Vec::new();
    let mut files_scanned = 0;

    // Emit total count for progress bar
    if let Some(app) = app_handle {
        let _ = app.emit("audit:scan-total", serde_json::json!({
            "total": total,
            "phase": "secrets",
        }));
    }

    for file in &files {
        // Check cancellation flag
        if let Some(c) = cancelled {
            if c.load(Ordering::SeqCst) {
                break;
            }
        }
        let relative = file.strip_prefix(root).unwrap_or(file).to_string_lossy().to_string();

        // Emit progress with total for percentage calculation
        if let Some(app) = app_handle {
            let _ = app.emit(
                "audit:scanning-file",
                serde_json::json!({
                    "file": relative,
                    "phase": "secrets",
                    "filesScanned": files_scanned + 1,
                    "totalFiles": total,
                }),
            );
        }

        let file_findings = scan_file(file, root, &rules, &mut files_scanned);
        findings.extend(file_findings);
    }

    // Re-assign sequential IDs
    for (i, finding) in findings.iter_mut().enumerate() {
        finding.id = format!("SEC-{:04}", i + 1);
    }

    (findings, files_scanned)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    fn write_temp_file(dir: &Path, name: &str, content: &str) -> PathBuf {
        let path = dir.join(name);
        let mut f = fs::File::create(&path).unwrap();
        f.write_all(content.as_bytes()).unwrap();
        path
    }

    #[test]
    fn test_detect_hardcoded_secret() {
        let dir = tempfile::tempdir().unwrap();
        write_temp_file(
            dir.path(),
            "config.js",
            r#"
const SECRET_KEY = "sk-1234567890abcdef";
const API_KEY = "my-api-key-here";
console.log("hello");
"#,
        );

        let (findings, scanned) = scan_secrets(dir.path());
        assert!(scanned > 0);
        assert!(!findings.is_empty(), "Should detect at least one secret");

        let secret_finding = findings
            .iter()
            .find(|f| f.rule_id == "generic-secret-assignment");
        assert!(
            secret_finding.is_some(),
            "Should find generic-secret-assignment"
        );
    }

    #[test]
    fn test_detect_private_key() {
        let dir = tempfile::tempdir().unwrap();
        write_temp_file(
            dir.path(),
            "key.pem",
            "-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA...\n-----END RSA PRIVATE KEY-----",
        );

        let (findings, _) = scan_secrets(dir.path());
        let pk = findings.iter().find(|f| f.rule_id == "private-key-header");
        assert!(pk.is_some(), "Should detect private key header");
        assert_eq!(pk.unwrap().severity, "critical");
    }

    #[test]
    fn test_skips_node_modules() {
        let dir = tempfile::tempdir().unwrap();
        let nm = dir.path().join("node_modules");
        fs::create_dir_all(&nm).unwrap();
        write_temp_file(
            &nm,
            "secret.js",
            "const SECRET_KEY = 'abc123';",
        );

        let (findings, _) = scan_secrets(dir.path());
        assert!(
            findings.is_empty(),
            "Should skip files in node_modules"
        );
    }

    #[test]
    fn test_detect_aws_key() {
        let dir = tempfile::tempdir().unwrap();
        write_temp_file(
            dir.path(),
            "aws-config.sh",
            "export AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE",
        );

        let (findings, _) = scan_secrets(dir.path());
        let aws = findings.iter().find(|f| f.rule_id == "aws-access-key");
        assert!(aws.is_some(), "Should detect AWS access key");
    }
}
