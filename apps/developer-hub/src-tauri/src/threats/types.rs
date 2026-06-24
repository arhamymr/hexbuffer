use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ThreatSettings {
    pub ghidra_headless_path: Option<String>,
    #[serde(default)]
    pub yara_rule_packs: Vec<YaraRulePack>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct YaraRulePack {
    pub id: String,
    pub name: String,
    pub path: String,
    pub enabled: bool,
    pub imported_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GhidraValidationResult {
    pub valid: bool,
    pub message: String,
    pub path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ThreatSample {
    pub id: String,
    pub file_name: String,
    pub original_path: String,
    pub stored_path: String,
    pub size: u64,
    pub sha256: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ThreatAnalysisOptions {
    pub run_ghidra: bool,
    pub yara_rules_path: Option<String>,
    #[serde(default)]
    pub enabled_yara_rule_paths: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ThreatAnalysisRun {
    pub id: String,
    pub sample_id: String,
    pub status: ThreatAnalysisStatus,
    pub started_at: String,
    pub finished_at: Option<String>,
    pub error: Option<String>,
    pub logs: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum ThreatAnalysisStatus {
    Running,
    Completed,
    Failed,
    Cancelled,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ThreatAnalysisResult {
    pub sample: ThreatSample,
    pub latest_run: Option<ThreatAnalysisRun>,
    pub artifacts: ThreatArtifacts,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ThreatArtifacts {
    pub metadata: Option<BinaryMetadata>,
    pub hashes: Option<FileHashes>,
    pub strings: Vec<ExtractedString>,
    pub imports: Vec<BinarySymbol>,
    pub exports: Vec<BinarySymbol>,
    pub entropy: Option<EntropyReport>,
    pub yara: Vec<YaraMatch>,
    pub functions: Vec<GhidraFunction>,
    pub decompiled: Vec<GhidraDecompiledFunction>,
    pub call_graph: Option<GhidraCallGraph>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileHashes {
    pub md5: String,
    pub sha1: String,
    pub sha256: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BinaryMetadata {
    pub file_type: String,
    pub architecture: Option<String>,
    pub endian: Option<String>,
    pub entry_point: Option<String>,
    pub compiler: Option<String>,
    pub sections: Vec<BinarySection>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BinarySection {
    pub name: String,
    pub address: String,
    pub size: u64,
    pub entropy: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BinarySymbol {
    pub name: String,
    pub library: Option<String>,
    pub address: Option<String>,
    pub ordinal: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExtractedString {
    pub value: String,
    pub offset: u64,
    pub length: usize,
    pub encoding: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EntropyReport {
    pub file_entropy: f64,
    pub sections: Vec<BinarySection>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct YaraMatch {
    pub rule: String,
    pub namespace: Option<String>,
    pub rule_pack: Option<String>,
    pub tags: Vec<String>,
    pub meta: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GhidraFunction {
    pub id: String,
    pub address: String,
    pub name: String,
    pub signature: Option<String>,
    pub size: Option<u64>,
    pub namespace: Option<String>,
    pub references: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GhidraDecompiledFunction {
    pub function_id: String,
    pub address: String,
    pub name: String,
    pub code: String,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct GhidraCallGraph {
    pub nodes: Vec<GhidraCallGraphNode>,
    pub edges: Vec<GhidraCallGraphEdge>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GhidraCallGraphNode {
    pub id: String,
    pub address: String,
    pub label: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GhidraCallGraphEdge {
    pub id: String,
    pub source: String,
    pub target: String,
}
