use serde::{Deserialize, Serialize};

/// A single security finding produced by the Rust scanner.
/// This struct is serialized to JSON and sent to the sidecar for AI analysis.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Finding {
    /// Unique ID for this finding, e.g. "SEC-001", "DEP-003"
    pub id: String,
    /// Category: "hardcoded_secret", "vulnerable_dependency", "risky_pattern"
    pub category: String,
    /// Severity: "critical", "high", "medium", "low", "info"
    pub severity: String,
    /// Human-readable title
    pub title: String,
    /// Path to the file containing the finding (relative to scan root)
    pub file_path: String,
    /// 1-based line number where the match was found
    pub line: Option<u32>,
    /// 1-based column number where the match was found
    pub column: Option<u32>,
    /// Surrounding code context (~2 lines around the match)
    pub snippet: String,
    /// The exact text that matched the rule
    pub match_text: String,
    /// Which rule triggered this finding (rule identifier)
    pub rule_id: String,
}

/// Result of a full directory scan.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanResult {
    /// Absolute path that was scanned
    pub scan_root: String,
    /// Total files examined
    pub files_scanned: usize,
    /// All findings produced
    pub findings: Vec<Finding>,
    /// Duration of the scan in milliseconds
    pub duration_ms: u64,
}

/// Result returned to the frontend after AI analysis.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AuditResult {
    pub scan_result: ScanResult,
    /// AI-generated explanations keyed by finding ID
    pub explanations: std::collections::HashMap<String, AiExplanation>,
    pub provider: String,
    pub model: String,
}

/// AI-generated explanation for a single finding.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiExplanation {
    pub finding_id: String,
    /// Markdown explanation of the vulnerability
    pub explanation: String,
    /// Suggested fix with code example
    pub fix_suggestion: String,
    /// AI-reassessed severity (may differ from heuristic)
    pub ai_severity: Option<String>,
    /// CVSS-like rationale
    pub severity_rationale: Option<String>,
}
