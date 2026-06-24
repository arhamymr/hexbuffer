use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SqliScanConfig {
    pub scan_id: String,
    pub url: String,
    pub method: String,
    pub headers: Vec<(String, String)>,
    pub params: Vec<SqliParam>,
    pub risk_level: SqliRiskLevel,
    pub techniques: Vec<SqliTechnique>,
    pub concurrency: usize,
    pub delay_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SqliParam {
    pub name: String,
    pub value: String,
    pub location: SqliParamLocation,
    pub inject: bool,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum SqliParamLocation {
    Url,
    Body,
    Header,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum SqliRiskLevel {
    Low,
    Medium,
    High,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum SqliTechnique {
    BooleanBlind,
    TimeBased,
    Union,
    ErrorBased,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SqliVulnerability {
    pub id: String,
    pub param_name: String,
    pub param_location: SqliParamLocation,
    pub technique: SqliTechnique,
    pub dbms: String,
    pub severity: SqliSeverity,
    pub poc_request: String,
    pub fingerprint: String,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum SqliSeverity {
    Critical,
    High,
    Medium,
    Low,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SqliExtractedDatabase {
    pub name: String,
    pub tables: Vec<SqliExtractedTable>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SqliExtractedTable {
    pub name: String,
    pub columns: Vec<SqliExtractedColumn>,
    pub rows: Vec<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SqliExtractedColumn {
    pub name: String,
    pub data_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SqliScanResult {
    pub scan_id: String,
    pub url: String,
    pub vulnerabilities: Vec<SqliVulnerability>,
    pub databases: Vec<SqliExtractedDatabase>,
    pub start_time: u64,
    pub end_time: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum SqliProgressEvent {
    Update {
        current: usize,
        total: usize,
        phase: String,
        message: String,
    },
    VulnerabilityFound {
        vulnerability: SqliVulnerability,
    },
    DataExtracted {
        database: String,
        table: String,
        row_count: usize,
    },
    Complete {
        result: SqliScanResult,
    },
    Error {
        message: String,
    },
    Cancelled,
}

impl SqliProgressEvent {
    pub fn update(current: usize, total: usize, phase: &str, message: &str) -> Self {
        Self::Update {
            current,
            total,
            phase: phase.to_string(),
            message: message.to_string(),
        }
    }

    pub fn vuln_found(vulnerability: SqliVulnerability) -> Self {
        Self::VulnerabilityFound { vulnerability }
    }

    pub fn data_extracted(database: &str, table: &str, row_count: usize) -> Self {
        Self::DataExtracted {
            database: database.to_string(),
            table: table.to_string(),
            row_count,
        }
    }

    pub fn complete(result: SqliScanResult) -> Self {
        Self::Complete { result }
    }

    pub fn error(message: &str) -> Self {
        Self::Error {
            message: message.to_string(),
        }
    }
}

#[derive(Default)]
pub struct SqliScanState {
    pub cancellations: Mutex<HashMap<String, Arc<AtomicBool>>>,
}

impl SqliScanState {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn register_scan(&self, scan_id: &str) {
        let mut cancellations = self.cancellations.lock().unwrap();
        cancellations.insert(scan_id.to_string(), Arc::new(AtomicBool::new(false)));
    }

    pub fn cancel_scan(&self, scan_id: &str) {
        let cancellations = self.cancellations.lock().unwrap();
        if let Some(flag) = cancellations.get(scan_id) {
            flag.store(true, Ordering::SeqCst);
        }
    }

    pub fn is_cancelled(&self, scan_id: &str) -> bool {
        let cancellations = self.cancellations.lock().unwrap();
        cancellations
            .get(scan_id)
            .map(|f| f.load(Ordering::SeqCst))
            .unwrap_or(false)
    }

    pub fn unregister_scan(&self, scan_id: &str) {
        let mut cancellations = self.cancellations.lock().unwrap();
        cancellations.remove(scan_id);
    }
}
