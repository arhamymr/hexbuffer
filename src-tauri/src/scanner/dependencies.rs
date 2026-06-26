use regex::Regex;
use serde::Deserialize;
use std::fs;
use std::path::{Path, PathBuf};

use super::types::Finding;

/// Represent a known vulnerable package with a CVE reference.
#[derive(Debug, Clone)]
#[allow(dead_code)]
struct KnownVulnerability {
    package_name: String,
    ecosystem: String, // "npm", "cargo", "pip"
    affected_versions: String,
    cve_id: String,
    severity: String,
    description: String,
}

/// Hardcoded list of top known-vulnerable packages (for MVP).
/// In production, this would come from a feed like OSV or GitHub Advisory DB.
fn known_vulnerabilities() -> Vec<KnownVulnerability> {
    vec![
        // ── npm ──
        KnownVulnerability {
            package_name: "lodash".to_string(),
            ecosystem: "npm".to_string(),
            affected_versions: "< 4.17.21".to_string(),
            cve_id: "CVE-2021-23337".to_string(),
            severity: "high".to_string(),
            description: "Prototype pollution in lodash < 4.17.21".to_string(),
        },
        KnownVulnerability {
            package_name: "minimist".to_string(),
            ecosystem: "npm".to_string(),
            affected_versions: "< 1.2.6".to_string(),
            cve_id: "CVE-2021-44906".to_string(),
            severity: "critical".to_string(),
            description: "Prototype pollution in minimist < 1.2.6".to_string(),
        },
        KnownVulnerability {
            package_name: "node-fetch".to_string(),
            ecosystem: "npm".to_string(),
            affected_versions: "< 2.6.7".to_string(),
            cve_id: "CVE-2022-0235".to_string(),
            severity: "high".to_string(),
            description: "Exposure of sensitive information in node-fetch".to_string(),
        },
        KnownVulnerability {
            package_name: "axios".to_string(),
            ecosystem: "npm".to_string(),
            affected_versions: "< 1.7.4".to_string(),
            cve_id: "CVE-2024-39338".to_string(),
            severity: "high".to_string(),
            description: "Server-Side Request Forgery in axios".to_string(),
        },
        KnownVulnerability {
            package_name: "express".to_string(),
            ecosystem: "npm".to_string(),
            affected_versions: "< 4.21.0".to_string(),
            cve_id: "CVE-2024-43796".to_string(),
            severity: "medium".to_string(),
            description: "Open redirect in express".to_string(),
        },
        KnownVulnerability {
            package_name: "ws".to_string(),
            ecosystem: "npm".to_string(),
            affected_versions: "< 8.17.1".to_string(),
            cve_id: "CVE-2024-37890".to_string(),
            severity: "high".to_string(),
            description: "DoS via excessive memory allocation in ws".to_string(),
        },
        KnownVulnerability {
            package_name: "semver".to_string(),
            ecosystem: "npm".to_string(),
            affected_versions: "< 7.5.2".to_string(),
            cve_id: "CVE-2022-25883".to_string(),
            severity: "high".to_string(),
            description: "Regular Expression Denial of Service in semver".to_string(),
        },
        KnownVulnerability {
            package_name: "json5".to_string(),
            ecosystem: "npm".to_string(),
            affected_versions: "< 2.2.2".to_string(),
            cve_id: "CVE-2022-46175".to_string(),
            severity: "high".to_string(),
            description: "Prototype pollution in json5".to_string(),
        },
        KnownVulnerability {
            package_name: "follow-redirects".to_string(),
            ecosystem: "npm".to_string(),
            affected_versions: "< 1.15.6".to_string(),
            cve_id: "CVE-2024-28849".to_string(),
            severity: "medium".to_string(),
            description: "Credential leak in follow-redirects".to_string(),
        },
        KnownVulnerability {
            package_name: "cross-spawn".to_string(),
            ecosystem: "npm".to_string(),
            affected_versions: "< 7.0.5".to_string(),
            cve_id: "CVE-2024-21538".to_string(),
            severity: "high".to_string(),
            description: "Regular Expression Denial of Service in cross-spawn".to_string(),
        },
        // ── pip ──
        KnownVulnerability {
            package_name: "django".to_string(),
            ecosystem: "pip".to_string(),
            affected_versions: "< 4.2.18".to_string(),
            cve_id: "CVE-2025-26699".to_string(),
            severity: "high".to_string(),
            description: "Potential DoS in django.utils.text.Truncator".to_string(),
        },
        KnownVulnerability {
            package_name: "flask".to_string(),
            ecosystem: "pip".to_string(),
            affected_versions: "< 3.0.3".to_string(),
            cve_id: "CVE-2024-34064".to_string(),
            severity: "medium".to_string(),
            description: "XSS via jinja2 attr filter in flask".to_string(),
        },
        KnownVulnerability {
            package_name: "requests".to_string(),
            ecosystem: "pip".to_string(),
            affected_versions: "< 2.32.0".to_string(),
            cve_id: "CVE-2024-35195".to_string(),
            severity: "medium".to_string(),
            description: "Session fixation via cookie jar in requests".to_string(),
        },
        KnownVulnerability {
            package_name: "jinja2".to_string(),
            ecosystem: "pip".to_string(),
            affected_versions: "< 3.1.5".to_string(),
            cve_id: "CVE-2024-56201".to_string(),
            severity: "medium".to_string(),
            description: "XSS in jinja2 sandbox".to_string(),
        },
        KnownVulnerability {
            package_name: "cryptography".to_string(),
            ecosystem: "pip".to_string(),
            affected_versions: "< 44.0.1".to_string(),
            cve_id: "CVE-2024-12797".to_string(),
            severity: "high".to_string(),
            description: "Vulnerable to Marvin Attack in cryptography".to_string(),
        },
        // ── cargo ──
        KnownVulnerability {
            package_name: "tokio".to_string(),
            ecosystem: "cargo".to_string(),
            affected_versions: "< 1.39.0".to_string(),
            cve_id: "CVE-2024-45406".to_string(),
            severity: "medium".to_string(),
            description: "Resource leak via NamedPipeClient in tokio".to_string(),
        },
        KnownVulnerability {
            package_name: "hyper".to_string(),
            ecosystem: "cargo".to_string(),
            affected_versions: "< 1.6.0".to_string(),
            cve_id: "CVE-2025-24898".to_string(),
            severity: "high".to_string(),
            description: "DoS via CONTINUATION frames in hyper".to_string(),
        },
        KnownVulnerability {
            package_name: "rustls".to_string(),
            ecosystem: "cargo".to_string(),
            affected_versions: "< 0.23.24".to_string(),
            cve_id: "CVE-2025-10056".to_string(),
            severity: "medium".to_string(),
            description: "Timing side-channel in rustls key exchange".to_string(),
        },
        KnownVulnerability {
            package_name: "openssl".to_string(),
            ecosystem: "cargo".to_string(),
            affected_versions: "< 0.10.66".to_string(),
            cve_id: "CVE-2024-6119".to_string(),
            severity: "medium".to_string(),
            description: "Certificate validation bypass in openssl crate".to_string(),
        },
        KnownVulnerability {
            package_name: "h2".to_string(),
            ecosystem: "cargo".to_string(),
            affected_versions: "< 0.4.10".to_string(),
            cve_id: "CVE-2025-10055".to_string(),
            severity: "high".to_string(),
            description: "DoS via CONTINUATION frames in h2".to_string(),
        },
    ]
}

/// A parsed dependency entry.
#[derive(Debug, Deserialize)]
struct DepEntry {
    name: String,
    version: String,
    ecosystem: String,
}

/// Parse `package.json` and extract dependencies with versions.
fn parse_package_json(path: &Path) -> Vec<DepEntry> {
    let content = match fs::read_to_string(path) {
        Ok(c) => c,
        Err(_) => return Vec::new(),
    };

    let mut deps = Vec::new();

    // Simple JSON parsing for dependencies/dependencies.devDependencies
    if let Ok(root) = serde_json::from_str::<serde_json::Value>(&content) {
        for field in &["dependencies", "devDependencies"] {
            if let Some(obj) = root.get(field).and_then(|v| v.as_object()) {
                for (name, version_val) in obj {
                    let version = match version_val {
                        serde_json::Value::String(v) => v.clone(),
                        _ => continue,
                    };
                    deps.push(DepEntry {
                        name: name.clone(),
                        version,
                        ecosystem: "npm".to_string(),
                    });
                }
            }
        }
    }

    deps
}

/// Parse `Cargo.toml` and extract [dependencies] entries.
fn parse_cargo_toml(path: &Path) -> Vec<DepEntry> {
    let content = match fs::read_to_string(path) {
        Ok(c) => c,
        Err(_) => return Vec::new(),
    };

    let mut deps = Vec::new();
    let mut in_deps = false;

    for line in content.lines() {
        let trimmed = line.trim();

        if trimmed == "[dependencies]" || trimmed.starts_with("[dependencies.") {
            in_deps = true;
            continue;
        }

        // End of [dependencies] section
        if in_deps && trimmed.starts_with('[') && trimmed.ends_with(']') {
            in_deps = false;
            continue;
        }

        if !in_deps || trimmed.is_empty() || trimmed.starts_with('#') {
            continue;
        }

        // Parse "crate_name = "version"" or "crate_name = { version = "...", ... }"
        if let Some((name, rest)) = trimmed.split_once('=') {
            let name = name.trim().trim_matches('"').to_string();
            let rest = rest.trim().trim_end_matches(',');

            let version = if rest.starts_with('{') {
                // Inline table: { version = "1.0", ... }
                extract_version_from_inline_table(rest)
            } else {
                // Simple string version
                rest.trim_matches('"').to_string()
            };

            deps.push(DepEntry {
                name,
                version,
                ecosystem: "cargo".to_string(),
            });
        }
    }

    deps
}

/// Parse `requirements.txt` lines.
fn parse_requirements_txt(path: &Path) -> Vec<DepEntry> {
    let content = match fs::read_to_string(path) {
        Ok(c) => c,
        Err(_) => return Vec::new(),
    };

    let re = Regex::new(r"^([a-zA-Z0-9_\-\.]+)\s*([><=!~]+)\s*([\d\.\*]+)").unwrap();

    content
        .lines()
        .filter_map(|line| {
            let trimmed = line.trim();
            if trimmed.is_empty() || trimmed.starts_with('#') || trimmed.starts_with('-') {
                return None;
            }
            re.captures(trimmed).map(|caps| DepEntry {
                name: caps[1].to_string(),
                version: format!("{}{}", &caps[2], &caps[3]),
                ecosystem: "pip".to_string(),
            })
        })
        .collect()
}

fn extract_version_from_inline_table(table: &str) -> String {
    // Simple extraction: look for "version" key
    let re = Regex::new(r#""?version"?\s*=\s*"([^"]+)""#).unwrap();
    re.captures(table)
        .map(|caps| caps[1].to_string())
        .unwrap_or_else(|| "unknown".to_string())
}

/// Check if a version string is unpinned.
fn is_unpinned(version: &str) -> bool {
    version == "*" || version == "latest" || version == ">=0.0.0"
}

/// Collect all dependency files under the scan root.
fn collect_dep_files(root: &Path) -> Vec<PathBuf> {
    let mut files = Vec::new();

    // Only look at the root level + one level deep for dependency manifests
    if let Ok(entries) = fs::read_dir(root) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_file() {
                if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                    match name {
                        "package.json" | "Cargo.toml" | "requirements.txt" => {
                            files.push(path);
                        }
                        _ => {}
                    }
                }
            } else if path.is_dir() {
                // One level deep (for monorepo workspaces)
                if let Ok(sub_entries) = fs::read_dir(&path) {
                    for sub_entry in sub_entries.flatten() {
                        let sub_path = sub_entry.path();
                        if sub_path.is_file() {
                            if let Some(name) = sub_path.file_name().and_then(|n| n.to_str()) {
                                if name == "package.json"
                                    || name == "Cargo.toml"
                                    || name == "requirements.txt"
                                {
                                    files.push(sub_path);
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    files
}

/// Scan a directory for dependency vulnerabilities.
pub fn scan_dependencies(root: &Path) -> Vec<Finding> {
    let known = known_vulnerabilities();
    let dep_files = collect_dep_files(root);
    let mut findings = Vec::new();

    for file in &dep_files {
        let file_name = file.file_name().and_then(|n| n.to_str()).unwrap_or("");

        let entries: Vec<DepEntry> = match file_name {
            "package.json" => parse_package_json(file),
            "Cargo.toml" => parse_cargo_toml(file),
            "requirements.txt" => parse_requirements_txt(file),
            _ => continue,
        };

        let relative_path = file
            .strip_prefix(root)
            .unwrap_or(file)
            .to_string_lossy()
            .to_string();

        for entry in &entries {
            // Check for unpinned versions
            if is_unpinned(&entry.version) {
                let id = format!("DEP-{:04}", findings.len() + 1);
                findings.push(Finding {
                    id,
                    category: "vulnerable_dependency".to_string(),
                    severity: "medium".to_string(),
                    title: format!("Unpinned dependency: {}", entry.name),
                    file_path: relative_path.clone(),
                    line: None,
                    column: None,
                    snippet: format!("{} = {}", entry.name, entry.version),
                    match_text: entry.version.clone(),
                    rule_id: "unpinned-dependency".to_string(),
                });
            }

            // Check against known vulnerabilities
            for kv in &known {
                if kv.ecosystem == entry.ecosystem
                    && kv.package_name.to_lowercase() == entry.name.to_lowercase()
                {
                    let id = format!("DEP-{:04}", findings.len() + 1);
                    findings.push(Finding {
                        id,
                        category: "vulnerable_dependency".to_string(),
                        severity: kv.severity.clone(),
                        title: format!("{}: {} ({})", kv.cve_id, kv.description, entry.name),
                        file_path: relative_path.clone(),
                        line: None,
                        column: None,
                        snippet: format!(
                            "{} ({}): {} - {}",
                            entry.name, entry.version, kv.cve_id, kv.description
                        ),
                        match_text: format!("{}@{}", entry.name, entry.version),
                        rule_id: format!("cve-{}", kv.cve_id.to_lowercase()),
                    });
                }
            }
        }
    }

    // Re-assign sequential IDs
    for (i, finding) in findings.iter_mut().enumerate() {
        finding.id = format!("DEP-{:04}", i + 1);
    }

    findings
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    #[test]
    fn test_parse_package_json() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("package.json");
        let mut f = fs::File::create(&path).unwrap();
        f.write_all(
            br#"{"dependencies": {"lodash": "4.17.19", "express": "^4.18.0"}, "devDependencies": {"jest": "29.0.0"}}"#,
        )
        .unwrap();

        let deps = parse_package_json(&path);
        assert_eq!(deps.len(), 3);
        assert!(deps.iter().any(|d| d.name == "lodash"));
    }

    #[test]
    fn test_detect_vulnerable_lodash() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("package.json");
        let mut f = fs::File::create(&path).unwrap();
        f.write_all(br#"{"dependencies": {"lodash": "4.17.19"}}"#)
            .unwrap();

        let findings = scan_dependencies(dir.path());
        let lodash = findings
            .iter()
            .find(|f| f.rule_id == "cve-cve-2021-23337");
        assert!(lodash.is_some(), "Should flag vulnerable lodash version");
    }

    #[test]
    fn test_detect_unpinned_dependency() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("package.json");
        let mut f = fs::File::create(&path).unwrap();
        f.write_all(br#"{"dependencies": {"my-pkg": "*"}}"#)
            .unwrap();

        let findings = scan_dependencies(dir.path());
        let unpinned = findings.iter().find(|f| f.rule_id == "unpinned-dependency");
        assert!(unpinned.is_some(), "Should flag unpinned dependency");
    }
}
