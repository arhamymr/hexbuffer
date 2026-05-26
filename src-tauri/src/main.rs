// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use base64::{engine::general_purpose, Engine};
use regex::Regex;
use serde::{Deserialize, Serialize};
use zeroxlily::DocumentRecord;
use zeroxlily::{
    export_ca_cert_pem, run, start_mastra_if_enabled, AiSettings, BrowserProcessState, HistoryBridge, InterceptMode,
    InterceptStatus, MastraProcessState, MastraStatus, PaginatedResponse, PausedRequest,
    PortScanState, ProxyConfig, ProxyFilter, ProxyLogSummary, ProxyRecord, ProxyRequest,
    ProxyState, SqliScanState, TreeNode, WebSocketConnectionDetail,
    WebSocketConnectionSummary, WebSocketFilter,
};
use sha1::Sha1;
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::path::PathBuf;
use std::process::Command;
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc, Mutex,
};
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter, Manager, State};
use tokio::sync::Semaphore;
use uuid::Uuid;

#[derive(Debug, Deserialize)]
struct RepeaterRequest {
    method: String,
    url: String,
    headers: HashMap<String, String>,
    body: String,
}

#[derive(Debug, Serialize)]
struct RepeaterResponse {
    status: u16,
    status_text: String,
    headers: HashMap<String, String>,
    body: String,
    time_ms: u128,
    final_url: String,
}

#[derive(Debug, Deserialize)]
struct InterceptForwardRequest {
    method: String,
    url: String,
    headers: HashMap<String, String>,
    body: String,
}

#[derive(Debug, Clone, Deserialize)]
struct IntruderHttpRequest {
    method: String,
    url: String,
    headers: HashMap<String, String>,
    body: String,
    follow_redirects: bool,
    max_hops: usize,
}

#[derive(Debug, Clone, Deserialize)]
enum IntruderAttackMode {
    Sniper,
    BatteringRam,
    Pitchfork,
    ClusterBomb,
}

#[derive(Debug, Clone, Deserialize)]
enum IntruderPayloadType {
    SimpleList,
    RuntimeFile,
    NumberRange,
}

#[derive(Debug, Clone, Deserialize)]
enum IntruderPayloadProcessingStep {
    UrlEncode,
    UrlDecode,
    Base64Encode,
    Base64Decode,
    Md5Hash,
    Sha1Hash,
    Sha256Hash,
}

#[derive(Debug, Clone, Deserialize)]
struct IntruderPayloadPosition {
    name: String,
    start: usize,
    end: usize,
}

#[derive(Debug, Clone, Deserialize)]
struct IntruderPayloadConfig {
    payload_type: IntruderPayloadType,
    values: Vec<String>,
    file_path: Option<String>,
    number_start: Option<i64>,
    number_end: Option<i64>,
    number_step: Option<i64>,
    number_format: Option<String>,
    processing: Vec<IntruderPayloadProcessingStep>,
}

#[derive(Debug, Clone, Deserialize)]
struct IntruderGrepMatchConfig {
    enabled: bool,
    keyword: String,
    case_sensitive: bool,
}

#[derive(Debug, Clone, Deserialize)]
struct IntruderGrepExtractConfig {
    enabled: bool,
    regex: String,
    replacement: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
struct IntruderSessionHandlingConfig {
    enabled: bool,
    extract_token_name: Option<String>,
    extract_from_response: Option<String>,
    update_header_name: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
struct IntruderAttackConfig {
    name: String,
    mode: IntruderAttackMode,
    base_request: IntruderHttpRequest,
    positions: Vec<IntruderPayloadPosition>,
    payload_config: IntruderPayloadConfig,
    concurrency: usize,
    delay_ms: u64,
    delay_max_ms: Option<u64>,
    retries: usize,
    grep_match: IntruderGrepMatchConfig,
    grep_extract: IntruderGrepExtractConfig,
    session_handling: IntruderSessionHandlingConfig,
}

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "type")]
enum IntruderProgress {
    Update { current: usize, total: usize },
    Complete,
}

#[derive(Debug, Clone, Serialize)]
struct IntruderResponse {
    status: u16,
    status_text: String,
    headers: HashMap<String, String>,
    body: String,
    time_ms: u128,
    final_url: String,
}

#[derive(Debug, Clone, Serialize)]
struct IntruderAttackResult {
    id: String,
    payload_values: HashMap<String, String>,
    status: Option<u16>,
    response_length: Option<usize>,
    response_time_ms: Option<u128>,
    error: Option<String>,
    comment: Option<String>,
    response: Option<IntruderResponse>,
    grep_match: bool,
    grep_extracted: Option<String>,
}

#[derive(Default)]
struct IntruderState {
    cancellations: Arc<Mutex<HashMap<String, Arc<AtomicBool>>>>,
}

#[tauri::command]
async fn send_repeater_request(request: RepeaterRequest) -> Result<RepeaterResponse, String> {
    let method = reqwest::Method::from_bytes(request.method.as_bytes())
        .map_err(|error| format!("Invalid HTTP method: {}", error))?;

    let client = reqwest::Client::builder()
        .redirect(reqwest::redirect::Policy::limited(10))
        .build()
        .map_err(|error| format!("Failed to build HTTP client: {}", error))?;

    let mut builder = client.request(method, &request.url);
    for (name, value) in request.headers {
        builder = builder.header(name, value);
    }

    if !request.body.is_empty() {
        builder = builder.body(request.body);
    }

    let started_at = Instant::now();
    let response = builder
        .send()
        .await
        .map_err(|error| format!("Failed to send request: {}", error))?;
    let status = response.status();
    let final_url = response.url().to_string();
    let headers = response
        .headers()
        .iter()
        .map(|(name, value)| {
            (
                name.to_string(),
                value.to_str().unwrap_or_default().to_string(),
            )
        })
        .collect();
    let body = response
        .text()
        .await
        .map_err(|error| format!("Failed to read response body: {}", error))?;

    Ok(RepeaterResponse {
        status: status.as_u16(),
        status_text: status.canonical_reason().unwrap_or_default().to_string(),
        headers,
        body,
        time_ms: started_at.elapsed().as_millis(),
        final_url,
    })
}

#[tauri::command]
async fn start_intruder_attack(
    app: AppHandle,
    state: State<'_, IntruderState>,
    config: IntruderAttackConfig,
) -> Result<String, String> {
    validate_intruder_config(&config)?;

    let attack_id = Uuid::new_v4().to_string();
    let cancel_flag = Arc::new(AtomicBool::new(false));
    state
        .cancellations
        .lock()
        .map_err(|_| "Failed to lock intruder state".to_string())?
        .insert(attack_id.clone(), cancel_flag.clone());

    let event_id = attack_id.clone();
    let cancellations = state.cancellations.clone();
    tokio::spawn(async move {
        run_intruder_attack(app, event_id.clone(), config, cancel_flag).await;
        if let Ok(mut cancellations) = cancellations.lock() {
            cancellations.remove(&event_id);
        }
    });

    Ok(attack_id)
}

#[tauri::command]
async fn stop_intruder_attack(
    state: State<'_, IntruderState>,
    attack_id: String,
) -> Result<(), String> {
    if let Some(cancel_flag) = state
        .cancellations
        .lock()
        .map_err(|_| "Failed to lock intruder state".to_string())?
        .remove(&attack_id)
    {
        cancel_flag.store(true, Ordering::Relaxed);
    }

    Ok(())
}

fn validate_intruder_config(config: &IntruderAttackConfig) -> Result<(), String> {
    if config.base_request.url.trim().is_empty() {
        return Err("Base request URL is required".to_string());
    }

    if count_markers(&config.base_request) == 0 {
        return Err("Add at least one payload position with § markers".to_string());
    }

    if config
        .positions
        .iter()
        .any(|position| position.end < position.start)
    {
        return Err("Payload position ranges are invalid".to_string());
    }

    if build_payload_source(&config.payload_config)?.is_empty() {
        return Err("Add at least one payload".to_string());
    }

    Ok(())
}

async fn run_intruder_attack(
    app: AppHandle,
    attack_id: String,
    config: IntruderAttackConfig,
    cancel_flag: Arc<AtomicBool>,
) {
    let payload_source = match build_payload_source(&config.payload_config) {
        Ok(values) => values,
        Err(error) => {
            let _ = app.emit(
                &format!("intruder-result-{}", attack_id),
                IntruderAttackResult::error(error),
            );
            let _ = app.emit(
                &format!("intruder-progress-{}", attack_id),
                IntruderProgress::Complete,
            );
            return;
        }
    };

    let defaults = marker_defaults(&config.base_request);
    let position_count = defaults.len();
    let payloads = generate_intruder_payloads(&config, &payload_source, position_count);
    let total = payloads.len();
    let completed = Arc::new(std::sync::atomic::AtomicUsize::new(0));
    let semaphore = Arc::new(Semaphore::new(config.concurrency.clamp(1, 200)));
    let client = match reqwest::Client::builder()
        .redirect(if config.base_request.follow_redirects {
            reqwest::redirect::Policy::limited(config.base_request.max_hops.max(1))
        } else {
            reqwest::redirect::Policy::none()
        })
        .build()
    {
        Ok(client) => client,
        Err(error) => {
            let _ = app.emit(
                &format!("intruder-result-{}", attack_id),
                IntruderAttackResult::error(format!("Failed to build HTTP client: {}", error)),
            );
            let _ = app.emit(
                &format!("intruder-progress-{}", attack_id),
                IntruderProgress::Complete,
            );
            return;
        }
    };

    let session_value = Arc::new(Mutex::new(None::<String>));
    let mut handles = Vec::with_capacity(total);

    for (index, payload_values) in payloads.into_iter().enumerate() {
        if cancel_flag.load(Ordering::Relaxed) {
            break;
        }

        let permit = match semaphore.clone().acquire_owned().await {
            Ok(permit) => permit,
            Err(_) => break,
        };
        let app = app.clone();
        let attack_id = attack_id.clone();
        let config = config.clone();
        let defaults = defaults.clone();
        let client = client.clone();
        let completed = completed.clone();
        let cancel_flag = cancel_flag.clone();
        let session_value = session_value.clone();

        handles.push(tokio::spawn(async move {
            let _permit = permit;
            if cancel_flag.load(Ordering::Relaxed) {
                return;
            }

            apply_intruder_delay(&config, index).await;
            let result = send_intruder_request(
                &client,
                &config,
                &defaults,
                payload_values,
                session_value,
                cancel_flag.clone(),
            )
            .await;

            let current = completed.fetch_add(1, Ordering::Relaxed) + 1;
            let _ = app.emit(&format!("intruder-result-{}", attack_id), result);
            let _ = app.emit(
                &format!("intruder-progress-{}", attack_id),
                IntruderProgress::Update { current, total },
            );
        }));
    }

    for handle in handles {
        let _ = handle.await;
    }

    let _ = app.emit(
        &format!("intruder-progress-{}", attack_id),
        IntruderProgress::Complete,
    );
}

impl IntruderAttackResult {
    fn error(error: String) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            payload_values: HashMap::new(),
            status: None,
            response_length: None,
            response_time_ms: None,
            error: Some(error),
            comment: None,
            response: None,
            grep_match: false,
            grep_extracted: None,
        }
    }
}

async fn apply_intruder_delay(config: &IntruderAttackConfig, index: usize) {
    let base_delay = match config.delay_max_ms {
        Some(max_delay) if max_delay > config.delay_ms => {
            let span = max_delay - config.delay_ms;
            config.delay_ms + ((index as u64 * 1_103_515_245 + 12_345) % (span + 1))
        }
        _ => config.delay_ms,
    };

    if base_delay > 0 {
        tokio::time::sleep(Duration::from_millis(base_delay)).await;
    }
}

async fn send_intruder_request(
    client: &reqwest::Client,
    config: &IntruderAttackConfig,
    defaults: &[String],
    payload_values: HashMap<String, String>,
    session_value: Arc<Mutex<Option<String>>>,
    cancel_flag: Arc<AtomicBool>,
) -> IntruderAttackResult {
    let mut last_error = None;

    for attempt in 0..=config.retries {
        if cancel_flag.load(Ordering::Relaxed) {
            last_error = Some("Attack stopped".to_string());
            break;
        }

        match send_intruder_request_once(client, config, defaults, &payload_values, &session_value)
            .await
        {
            Ok(result) => return result,
            Err(error) => {
                last_error = Some(error);
                if attempt < config.retries {
                    tokio::time::sleep(Duration::from_millis(150)).await;
                }
            }
        }
    }

    IntruderAttackResult {
        id: Uuid::new_v4().to_string(),
        payload_values,
        status: None,
        response_length: None,
        response_time_ms: None,
        error: last_error,
        comment: Some(config.name.clone()),
        response: None,
        grep_match: false,
        grep_extracted: None,
    }
}

async fn send_intruder_request_once(
    client: &reqwest::Client,
    config: &IntruderAttackConfig,
    defaults: &[String],
    payload_values: &HashMap<String, String>,
    session_value: &Arc<Mutex<Option<String>>>,
) -> Result<IntruderAttackResult, String> {
    let method = reqwest::Method::from_bytes(config.base_request.method.as_bytes())
        .map_err(|error| format!("Invalid HTTP method: {}", error))?;
    let url = replace_marked_values(&config.base_request.url, payload_values, defaults);
    let body = replace_marked_values(&config.base_request.body, payload_values, defaults);
    let mut headers = HashMap::new();

    for (name, value) in &config.base_request.headers {
        headers.insert(
            replace_marked_values(name, payload_values, defaults),
            replace_marked_values(value, payload_values, defaults),
        );
    }

    if config.session_handling.enabled {
        if let (Some(header_name), Ok(current_session)) = (
            config.session_handling.update_header_name.as_ref(),
            session_value.lock(),
        ) {
            if let Some(value) = current_session.as_ref() {
                headers.insert(header_name.clone(), value.clone());
            }
        }
    }

    let mut builder = client.request(method, &url);
    for (name, value) in &headers {
        if name.eq_ignore_ascii_case("content-length") {
            continue;
        }
        builder = builder.header(name, value);
    }

    if !body.is_empty() {
        builder = builder.body(body);
    }

    let started_at = Instant::now();
    let response = builder
        .send()
        .await
        .map_err(|error| format!("Failed to send request: {}", error))?;
    let elapsed_ms = started_at.elapsed().as_millis();
    let status = response.status();
    let final_url = response.url().to_string();
    let response_headers: HashMap<String, String> = response
        .headers()
        .iter()
        .map(|(name, value)| {
            (
                name.to_string(),
                value.to_str().unwrap_or_default().to_string(),
            )
        })
        .collect();
    let response_body = response
        .text()
        .await
        .map_err(|error| format!("Failed to read response body: {}", error))?;

    let grep_match = response_matches(&response_body, &config.grep_match);
    let grep_extracted = extract_grep_value(&response_body, &config.grep_extract);

    if config.session_handling.enabled {
        if let Some(next_session) = extract_session_value(&response_body, &config.session_handling)
        {
            if let Ok(mut current_session) = session_value.lock() {
                *current_session = Some(next_session);
            }
        }
    }

    Ok(IntruderAttackResult {
        id: Uuid::new_v4().to_string(),
        payload_values: payload_values.clone(),
        status: Some(status.as_u16()),
        response_length: Some(response_body.len()),
        response_time_ms: Some(elapsed_ms),
        error: None,
        comment: None,
        response: Some(IntruderResponse {
            status: status.as_u16(),
            status_text: status.canonical_reason().unwrap_or_default().to_string(),
            headers: response_headers,
            body: response_body,
            time_ms: elapsed_ms,
            final_url,
        }),
        grep_match,
        grep_extracted,
    })
}

fn build_payload_source(config: &IntruderPayloadConfig) -> Result<Vec<String>, String> {
    let values = match config.payload_type {
        IntruderPayloadType::SimpleList => config.values.clone(),
        IntruderPayloadType::RuntimeFile => {
            if let Some(file_path) = &config.file_path {
                std::fs::read_to_string(file_path)
                    .map_err(|error| format!("Failed to read payload file: {}", error))?
                    .lines()
                    .map(str::to_string)
                    .collect()
            } else {
                config.values.clone()
            }
        }
        IntruderPayloadType::NumberRange => {
            let start = config.number_start.unwrap_or(0);
            let end = config.number_end.unwrap_or(100);
            let mut step = config.number_step.unwrap_or(1);
            if step == 0 {
                step = 1;
            }

            let mut values = Vec::new();
            let mut current = start;
            while if step > 0 {
                current <= end
            } else {
                current >= end
            } {
                values.push(format_number_payload(
                    current,
                    config.number_format.as_deref(),
                ));
                current += step;
                if values.len() > 250_000 {
                    return Err("Number range is too large".to_string());
                }
            }
            values
        }
    };

    Ok(values
        .into_iter()
        .map(|value| apply_payload_processing(value, &config.processing))
        .filter(|value| !value.is_empty())
        .collect())
}

fn format_number_payload(value: i64, format: Option<&str>) -> String {
    let format = format.unwrap_or("{}");
    if let Some(width_text) = format
        .strip_prefix("{:0")
        .and_then(|text| text.strip_suffix('}'))
    {
        if let Ok(width) = width_text.parse::<usize>() {
            return format!("{:0width$}", value, width = width);
        }
    }

    format.replace("{}", &value.to_string())
}

fn apply_payload_processing(mut value: String, steps: &[IntruderPayloadProcessingStep]) -> String {
    for step in steps {
        value = match step {
            IntruderPayloadProcessingStep::UrlEncode => percent_encode(&value),
            IntruderPayloadProcessingStep::UrlDecode => percent_decode(&value).unwrap_or(value),
            IntruderPayloadProcessingStep::Base64Encode => {
                general_purpose::STANDARD.encode(value.as_bytes())
            }
            IntruderPayloadProcessingStep::Base64Decode => general_purpose::STANDARD
                .decode(value.as_bytes())
                .ok()
                .and_then(|bytes| String::from_utf8(bytes).ok())
                .unwrap_or(value),
            IntruderPayloadProcessingStep::Md5Hash => md5_hex(value.as_bytes()),
            IntruderPayloadProcessingStep::Sha1Hash => {
                let mut hasher = Sha1::new();
                hasher.update(value.as_bytes());
                hex_encode(&hasher.finalize())
            }
            IntruderPayloadProcessingStep::Sha256Hash => {
                let mut hasher = Sha256::new();
                hasher.update(value.as_bytes());
                hex_encode(&hasher.finalize())
            }
        };
    }

    value
}

fn generate_intruder_payloads(
    config: &IntruderAttackConfig,
    source: &[String],
    position_count: usize,
) -> Vec<HashMap<String, String>> {
    match config.mode {
        IntruderAttackMode::Sniper => {
            let mut rows = Vec::new();
            for position_index in 0..position_count {
                for payload in source {
                    let mut row = HashMap::new();
                    row.insert(
                        position_name(&config.positions, position_index),
                        payload.clone(),
                    );
                    rows.push(row);
                }
            }
            rows
        }
        IntruderAttackMode::BatteringRam => source
            .iter()
            .map(|payload| {
                (0..position_count)
                    .map(|index| (position_name(&config.positions, index), payload.clone()))
                    .collect()
            })
            .collect(),
        IntruderAttackMode::Pitchfork => source
            .iter()
            .map(|payload| {
                (0..position_count)
                    .map(|index| (position_name(&config.positions, index), payload.clone()))
                    .collect()
            })
            .collect(),
        IntruderAttackMode::ClusterBomb => {
            let mut rows = Vec::new();
            append_cluster_payloads(
                &mut rows,
                HashMap::new(),
                source,
                &config.positions,
                position_count,
                0,
            );
            rows
        }
    }
}

fn append_cluster_payloads(
    rows: &mut Vec<HashMap<String, String>>,
    current: HashMap<String, String>,
    source: &[String],
    positions: &[IntruderPayloadPosition],
    position_count: usize,
    position_index: usize,
) {
    if position_index == position_count {
        rows.push(current);
        return;
    }

    for payload in source {
        let mut next = current.clone();
        next.insert(position_name(positions, position_index), payload.clone());
        append_cluster_payloads(
            rows,
            next,
            source,
            positions,
            position_count,
            position_index + 1,
        );
        if rows.len() > 250_000 {
            return;
        }
    }
}

fn position_name(positions: &[IntruderPayloadPosition], index: usize) -> String {
    positions
        .get(index)
        .map(|position| position.name.clone())
        .unwrap_or_else(|| format!("position_{}", index + 1))
}

fn count_markers(request: &IntruderHttpRequest) -> usize {
    marker_defaults(request).len()
}

fn marker_defaults(request: &IntruderHttpRequest) -> Vec<String> {
    let mut defaults = Vec::new();
    collect_marked_values(&request.url, &mut defaults);
    for (name, value) in &request.headers {
        collect_marked_values(name, &mut defaults);
        collect_marked_values(value, &mut defaults);
    }
    collect_marked_values(&request.body, &mut defaults);
    defaults
}

fn collect_marked_values(text: &str, values: &mut Vec<String>) {
    let mut search_start = 0;
    while let Some(start) = text[search_start..].find('§') {
        let absolute_start = search_start + start;
        if let Some(end) = text[absolute_start + '§'.len_utf8()..].find('§') {
            let absolute_end = absolute_start + '§'.len_utf8() + end;
            values.push(text[absolute_start + '§'.len_utf8()..absolute_end].to_string());
            search_start = absolute_end + '§'.len_utf8();
        } else {
            break;
        }
    }
}

fn replace_marked_values(
    text: &str,
    payload_values: &HashMap<String, String>,
    defaults: &[String],
) -> String {
    let mut output = String::with_capacity(text.len());
    let mut search_start = 0;
    let mut position_index = 0;

    while let Some(start) = text[search_start..].find('§') {
        let absolute_start = search_start + start;
        let Some(end) = text[absolute_start + '§'.len_utf8()..].find('§') else {
            break;
        };
        let absolute_end = absolute_start + '§'.len_utf8() + end;
        let position_key = format!("position_{}", position_index + 1);
        let replacement = payload_values
            .get(&position_key)
            .cloned()
            .unwrap_or_else(|| defaults.get(position_index).cloned().unwrap_or_default());

        output.push_str(&text[search_start..absolute_start]);
        output.push_str(&replacement);
        search_start = absolute_end + '§'.len_utf8();
        position_index += 1;
    }

    output.push_str(&text[search_start..]);
    output
}

fn response_matches(body: &str, config: &IntruderGrepMatchConfig) -> bool {
    if !config.enabled || config.keyword.is_empty() {
        return false;
    }

    if config.case_sensitive {
        body.contains(&config.keyword)
    } else {
        body.to_lowercase().contains(&config.keyword.to_lowercase())
    }
}

fn extract_grep_value(body: &str, config: &IntruderGrepExtractConfig) -> Option<String> {
    if !config.enabled || config.regex.is_empty() {
        return None;
    }

    let regex = Regex::new(&config.regex).ok()?;
    let captures = regex.captures(body)?;
    if let Some(replacement) = &config.replacement {
        return Some(regex.replace(body, replacement.as_str()).to_string());
    }

    captures
        .get(1)
        .or_else(|| captures.get(0))
        .map(|match_| match_.as_str().to_string())
}

fn extract_session_value(body: &str, config: &IntruderSessionHandlingConfig) -> Option<String> {
    if let Some(pattern) = config
        .extract_from_response
        .as_ref()
        .filter(|value| !value.is_empty())
    {
        let regex = Regex::new(pattern).ok()?;
        return regex
            .captures(body)
            .and_then(|captures| captures.get(1).or_else(|| captures.get(0)))
            .map(|match_| match_.as_str().to_string());
    }

    let token_name = config.extract_token_name.as_ref()?.trim();
    if token_name.is_empty() {
        return None;
    }

    let pattern = format!(
        r#"(?i){}\s*["'=:\s]+\s*["']?([^"'<>\s&;]+)"#,
        regex::escape(token_name)
    );
    let regex = Regex::new(&pattern).ok()?;
    regex
        .captures(body)
        .and_then(|captures| captures.get(1))
        .map(|match_| match_.as_str().to_string())
}

fn percent_encode(value: &str) -> String {
    value
        .bytes()
        .flat_map(|byte| {
            if byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'.' | b'_' | b'~') {
                vec![byte as char]
            } else {
                format!("%{:02X}", byte).chars().collect()
            }
        })
        .collect()
}

fn percent_decode(value: &str) -> Option<String> {
    let mut output = Vec::with_capacity(value.len());
    let bytes = value.as_bytes();
    let mut index = 0;

    while index < bytes.len() {
        if bytes[index] == b'%' && index + 2 < bytes.len() {
            let hex = std::str::from_utf8(&bytes[index + 1..index + 3]).ok()?;
            output.push(u8::from_str_radix(hex, 16).ok()?);
            index += 3;
        } else {
            output.push(bytes[index]);
            index += 1;
        }
    }

    String::from_utf8(output).ok()
}

fn hex_encode(bytes: &[u8]) -> String {
    bytes.iter().map(|byte| format!("{:02x}", byte)).collect()
}

fn md5_hex(input: &[u8]) -> String {
    let mut message = input.to_vec();
    let bit_len = (message.len() as u64) * 8;
    message.push(0x80);
    while message.len() % 64 != 56 {
        message.push(0);
    }
    message.extend_from_slice(&bit_len.to_le_bytes());

    let mut a0: u32 = 0x67452301;
    let mut b0: u32 = 0xefcdab89;
    let mut c0: u32 = 0x98badcfe;
    let mut d0: u32 = 0x10325476;
    let shifts: [u32; 64] = [
        7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5,
        9, 14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10,
        15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
    ];
    let constants: [u32; 64] = [
        0xd76aa478, 0xe8c7b756, 0x242070db, 0xc1bdceee, 0xf57c0faf, 0x4787c62a, 0xa8304613,
        0xfd469501, 0x698098d8, 0x8b44f7af, 0xffff5bb1, 0x895cd7be, 0x6b901122, 0xfd987193,
        0xa679438e, 0x49b40821, 0xf61e2562, 0xc040b340, 0x265e5a51, 0xe9b6c7aa, 0xd62f105d,
        0x02441453, 0xd8a1e681, 0xe7d3fbc8, 0x21e1cde6, 0xc33707d6, 0xf4d50d87, 0x455a14ed,
        0xa9e3e905, 0xfcefa3f8, 0x676f02d9, 0x8d2a4c8a, 0xfffa3942, 0x8771f681, 0x6d9d6122,
        0xfde5380c, 0xa4beea44, 0x4bdecfa9, 0xf6bb4b60, 0xbebfbc70, 0x289b7ec6, 0xeaa127fa,
        0xd4ef3085, 0x04881d05, 0xd9d4d039, 0xe6db99e5, 0x1fa27cf8, 0xc4ac5665, 0xf4292244,
        0x432aff97, 0xab9423a7, 0xfc93a039, 0x655b59c3, 0x8f0ccc92, 0xffeff47d, 0x85845dd1,
        0x6fa87e4f, 0xfe2ce6e0, 0xa3014314, 0x4e0811a1, 0xf7537e82, 0xbd3af235, 0x2ad7d2bb,
        0xeb86d391,
    ];

    for chunk in message.chunks(64) {
        let mut words = [0u32; 16];
        for (index, word) in words.iter_mut().enumerate() {
            let start = index * 4;
            *word = u32::from_le_bytes([
                chunk[start],
                chunk[start + 1],
                chunk[start + 2],
                chunk[start + 3],
            ]);
        }

        let mut a = a0;
        let mut b = b0;
        let mut c = c0;
        let mut d = d0;

        for i in 0..64 {
            let (f, g) = if i < 16 {
                ((b & c) | ((!b) & d), i)
            } else if i < 32 {
                ((d & b) | ((!d) & c), (5 * i + 1) % 16)
            } else if i < 48 {
                (b ^ c ^ d, (3 * i + 5) % 16)
            } else {
                (c ^ (b | (!d)), (7 * i) % 16)
            };
            let next = d;
            d = c;
            c = b;
            b = b.wrapping_add(
                a.wrapping_add(f)
                    .wrapping_add(constants[i])
                    .wrapping_add(words[g])
                    .rotate_left(shifts[i]),
            );
            a = next;
        }

        a0 = a0.wrapping_add(a);
        b0 = b0.wrapping_add(b);
        c0 = c0.wrapping_add(c);
        d0 = d0.wrapping_add(d);
    }

    let mut digest = Vec::with_capacity(16);
    digest.extend_from_slice(&a0.to_le_bytes());
    digest.extend_from_slice(&b0.to_le_bytes());
    digest.extend_from_slice(&c0.to_le_bytes());
    digest.extend_from_slice(&d0.to_le_bytes());
    hex_encode(&digest)
}

#[tauri::command]
async fn start_proxy(app: AppHandle, port: u16, tls_port: u16) -> Result<String, String> {
    use std::io::Write;
    let mut file = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open("/tmp/seven_project.log")
        .map_err(|e| e.to_string())?;
    writeln!(
        file,
        "start_proxy called: port={}, tls_port={}",
        port, tls_port
    )
    .map_err(|e| e.to_string())?;

    let handle = app.clone();
    std::thread::spawn(move || {
        let mut file = std::fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open("/tmp/seven_project.log")
            .unwrap();
        writeln!(file, "thread spawned, calling run()").unwrap();
        run(
            ProxyConfig {
                port,
                reuse: true,
                tls_port,
            },
            handle,
        );
        writeln!(file, "run() returned").unwrap();
    });
    Ok(format!(
        "Proxy starting on port {} (HTTP) and {} (HTTPS MITM)",
        port, tls_port
    ))
}

#[tauri::command]
async fn get_intercept_status(
    state: State<'_, Mutex<ProxyState>>,
) -> Result<InterceptStatus, String> {
    let proxy_state = state.lock().map_err(|error| format!("{error}"))?;
    Ok(proxy_state.get_status())
}

#[tauri::command]
async fn set_intercept_enabled(
    state: State<'_, Mutex<ProxyState>>,
    enabled: bool,
) -> Result<InterceptStatus, String> {
    let proxy_state = state.lock().map_err(|error| format!("{error}"))?;

    if enabled {
        proxy_state.set_mode(InterceptMode::Enabled);
    } else {
        proxy_state.set_mode(InterceptMode::Disabled);
    }

    Ok(proxy_state.get_status())
}

#[tauri::command]
async fn get_paused_requests(
    state: State<'_, Mutex<ProxyState>>,
) -> Result<Vec<PausedRequest>, String> {
    let proxy_state = state.lock().map_err(|error| format!("{error}"))?;
    Ok(proxy_state.get_all_paused())
}

#[tauri::command]
async fn forward_intercepted_request(
    state: State<'_, Mutex<ProxyState>>,
    request_id: String,
    request: Option<InterceptForwardRequest>,
) -> Result<(), String> {
    let id = Uuid::parse_str(&request_id).map_err(|e| e.to_string())?;
    let request = request.map(|request| ProxyRequest {
        method: request.method,
        uri: request.url,
        http_version: "HTTP/1.1".to_string(),
        headers: request.headers,
        body: request.body.into_bytes(),
    });
    let proxy_state = state.lock().map_err(|error| format!("{error}"))?;
    let forwarded = proxy_state.forward_paused_request(&id, request);

    if forwarded {
        Ok(())
    } else {
        Err("Paused request not found.".to_string())
    }
}

#[tauri::command]
async fn drop_intercepted_request(
    state: State<'_, Mutex<ProxyState>>,
    request_id: String,
) -> Result<(), String> {
    let id = Uuid::parse_str(&request_id).map_err(|e| e.to_string())?;
    let proxy_state = state.lock().map_err(|error| format!("{error}"))?;
    let dropped = proxy_state.drop_paused_request(&id);

    if dropped {
        Ok(())
    } else {
        Err("Paused request not found.".to_string())
    }
}

fn browser_candidates() -> Vec<PathBuf> {
    fn workspace_chrome_candidates() -> Vec<PathBuf> {
        let mut roots = Vec::new();

        if let Ok(current_dir) = std::env::current_dir() {
            roots.push(current_dir.clone());
            if let Some(parent) = current_dir.parent() {
                roots.push(parent.to_path_buf());
            }
        }

        let mut candidates = Vec::new();

        for root in roots {
            let chrome_root = root.join("chrome");

            if let Ok(entries) = std::fs::read_dir(&chrome_root) {
                for entry in entries.flatten() {
                    let version_dir = entry.path();
                    candidates.push(
                        version_dir
                            .join("chrome-mac-arm64")
                            .join("Google Chrome for Testing.app")
                            .join("Contents")
                            .join("MacOS")
                            .join("Google Chrome for Testing"),
                    );
                }
            }
        }

        candidates
    }

    #[cfg(target_os = "macos")]
    {
        let mut candidates = workspace_chrome_candidates();
        candidates.extend([
            PathBuf::from("/Applications/Chromium.app/Contents/MacOS/Chromium"),
            PathBuf::from(
                "/Applications/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
            ),
            PathBuf::from("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"),
            PathBuf::from("/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary"),
        ]);
        return candidates;
    }

    #[cfg(target_os = "windows")]
    {
        let mut candidates = Vec::new();

        if let Some(local_app_data) = std::env::var_os("LOCALAPPDATA") {
            candidates.push(PathBuf::from(local_app_data).join("Chromium/Application/chrome.exe"));
        }

        if let Some(program_files) = std::env::var_os("PROGRAMFILES") {
            candidates.push(PathBuf::from(program_files).join("Google/Chrome/Application/chrome.exe"));
            candidates.push(PathBuf::from(program_files).join("Chromium/Application/chrome.exe"));
        }

        if let Some(program_files_x86) = std::env::var_os("PROGRAMFILES(X86)") {
            candidates.push(PathBuf::from(program_files_x86).join("Google/Chrome/Application/chrome.exe"));
        }

        return candidates;
    }

    #[cfg(target_os = "linux")]
    {
        return vec![
            PathBuf::from("chromium"),
            PathBuf::from("chromium-browser"),
            PathBuf::from("google-chrome"),
            PathBuf::from("google-chrome-stable"),
        ];
    }
}

fn intercept_browser_profile_dir(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("intercept-browser-profile"))
}

fn write_intercept_ca(app: &AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&app_data_dir).map_err(|e| e.to_string())?;

    let ca_path = app_data_dir.join("apprecon-ca.pem");
    let ca_pem = export_ca_cert_pem().map_err(|error| format!("{error}"))?;
    std::fs::write(&ca_path, ca_pem).map_err(|e| e.to_string())?;

    Ok(ca_path)
}

fn certutil_candidates() -> Vec<PathBuf> {
    vec![
        PathBuf::from("certutil"),
        PathBuf::from("/opt/homebrew/opt/nss/bin/certutil"),
        PathBuf::from("/opt/homebrew/bin/certutil"),
        PathBuf::from("/usr/local/opt/nss/bin/certutil"),
        PathBuf::from("/usr/local/bin/certutil"),
    ]
}

fn run_certutil(args: &[String]) -> Result<(), String> {
    let mut last_error = None;

    for candidate in certutil_candidates() {
        let output = Command::new(&candidate).args(args).output();

        match output {
            Ok(output) if output.status.success() => return Ok(()),
            Ok(output) => {
                let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
                last_error = Some(if stderr.is_empty() {
                    format!("certutil exited with {}", output.status)
                } else {
                    stderr
                });
            }
            Err(error) => last_error = Some(error.to_string()),
        }
    }

    Err(last_error.unwrap_or_else(|| {
        "certutil was not found. Install NSS tools first, for example: brew install nss".to_string()
    }))
}

#[tauri::command]
async fn open_intercept_browser(app: AppHandle) -> Result<(), String> {
    let profile_dir = intercept_browser_profile_dir(&app)?;
    std::fs::create_dir_all(&profile_dir).map_err(|e| e.to_string())?;
    let ca_import_result = import_intercept_ca_to_chrome_profile(&app);

    let mut last_error = None;
    let args = vec![
        format!("--user-data-dir={}", profile_dir.display()),
        "--new-window".to_string(),
        "--no-first-run".to_string(),
        "--no-default-browser-check".to_string(),
        "--proxy-server=127.0.0.1:8888".to_string(),
        "about:blank".to_string(),
    ];

    for candidate in browser_candidates() {
        if candidate.components().count() > 1 && !candidate.exists() {
            continue;
        }

        match Command::new(&candidate).args(&args).spawn() {
            Ok(_) => {
                return ca_import_result
                    .map(|_| ())
                    .or_else(|error| Err(format!("Browser opened, but CA import failed: {error}")));
            }
            Err(error) => last_error = Some(error.to_string()),
        }
    }

    Err(last_error.unwrap_or_else(|| "Chromium or Google Chrome was not found.".to_string()))
}

fn import_intercept_ca_to_chrome_profile(app: &AppHandle) -> Result<String, String> {
    let profile_dir = intercept_browser_profile_dir(&app)?;
    std::fs::create_dir_all(&profile_dir).map_err(|e| e.to_string())?;
    let ca_path = write_intercept_ca(app)?;
    let db_dir = format!("sql:{}", profile_dir.display());
    let nickname = "AppRecon Root CA".to_string();

    let init_args = vec![
        "-N".to_string(),
        "-d".to_string(),
        db_dir.clone(),
        "--empty-password".to_string(),
    ];
    let _ = run_certutil(&init_args);

    let delete_args = vec![
        "-D".to_string(),
        "-d".to_string(),
        db_dir.clone(),
        "-n".to_string(),
        nickname.clone(),
    ];
    let _ = run_certutil(&delete_args);

    let add_args = vec![
        "-A".to_string(),
        "-d".to_string(),
        db_dir,
        "-n".to_string(),
        nickname,
        "-t".to_string(),
        "C,,".to_string(),
        "-i".to_string(),
        ca_path.display().to_string(),
    ];

    match run_certutil(&add_args) {
        Ok(()) => Ok("AppRecon CA imported into the managed Chrome profile. Close old Intercept browser windows and open it again.".to_string()),
        Err(error) => Err(format!(
            "Chrome-profile CA import failed: {error}. Install NSS tools with `brew install nss`, then try again."
        )),
    }
}

#[tauri::command]
async fn trust_intercept_ca(app: AppHandle) -> Result<String, String> {
    import_intercept_ca_to_chrome_profile(&app)
}

#[tauri::command]
async fn clear_proxy_all(history: State<'_, HistoryBridge>) -> Result<(), String> {
    history.clear_all()
}

#[tauri::command]
async fn get_documents(history: State<'_, HistoryBridge>) -> Result<Vec<DocumentRecord>, String> {
    history.get_documents()
}

#[tauri::command]
async fn save_document(
    history: State<'_, HistoryBridge>,
    document: DocumentRecord,
) -> Result<(), String> {
    history.save_document(&document)
}

#[tauri::command]
async fn delete_document(
    history: State<'_, HistoryBridge>,
    document_id: String,
) -> Result<(), String> {
    history.delete_document(&document_id)
}

#[tauri::command]
async fn delete_proxy_by_id(
    history: State<'_, HistoryBridge>,
    log_id: String,
) -> Result<(), String> {
    history.delete_by_id(&log_id)
}

#[tauri::command]
async fn get_proxy_all(history: State<'_, HistoryBridge>) -> Result<Vec<ProxyRecord>, String> {
    history.get_all()
}

#[tauri::command]
async fn get_proxy_filtered(
    history: State<'_, HistoryBridge>,
    filter: ProxyFilter,
) -> Result<Vec<ProxyRecord>, String> {
    history.get_filtered(filter)
}

#[tauri::command]
async fn get_proxy_paginated(
    history: State<'_, HistoryBridge>,
    page: u32,
    per_page: u32,
    filter: Option<ProxyFilter>,
    sort_order: Option<String>,
) -> Result<PaginatedResponse<ProxyLogSummary>, String> {
    history.get_paginated(page, per_page, filter, sort_order)
}

#[tauri::command]
async fn get_proxy_detail(
    history: State<'_, HistoryBridge>,
    log_id: String,
) -> Result<ProxyRecord, String> {
    history
        .get_by_id(&log_id)?
        .ok_or_else(|| format!("Log not found: {}", log_id))
}

#[tauri::command]
async fn save_ca_cert(path: String, content: String) -> Result<(), String> {
    std::fs::write(&path, &content).map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_ca_cert() -> Result<String, String> {
    let pem = export_ca_cert_pem().map_err(|error| format!("{error}"))?;
    String::from_utf8(pem).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_ai_settings(app: AppHandle) -> Result<AiSettings, String> {
    zeroxlily::ai::get_ai_settings(app)
}

#[tauri::command]
fn save_ai_settings(app: AppHandle, settings: AiSettings) -> Result<AiSettings, String> {
    zeroxlily::ai::save_ai_settings(app, settings)
}

#[tauri::command]
fn clear_ai_api_key(app: AppHandle) -> Result<AiSettings, String> {
    zeroxlily::ai::clear_ai_api_key(app)
}

#[tauri::command]
fn get_mastra_status(
    app: AppHandle,
    state: State<'_, MastraProcessState>,
) -> Result<MastraStatus, String> {
    zeroxlily::ai::get_mastra_status(app, state)
}

#[tauri::command]
fn start_mastra(
    app: AppHandle,
    state: State<'_, MastraProcessState>,
) -> Result<MastraStatus, String> {
    zeroxlily::ai::start_mastra(app, state)
}

#[tauri::command]
fn stop_mastra(
    app: AppHandle,
    state: State<'_, MastraProcessState>,
) -> Result<MastraStatus, String> {
    zeroxlily::ai::stop_mastra(app, state)
}

#[tauri::command]
async fn get_proxy_tree(
    history: State<'_, HistoryBridge>,
    filter: Option<ProxyFilter>,
) -> Result<Vec<TreeNode>, String> {
    history.get_tree(filter)
}

#[tauri::command]
async fn get_websocket_paginated(
    history: State<'_, HistoryBridge>,
    page: u32,
    per_page: u32,
    filter: Option<WebSocketFilter>,
) -> Result<PaginatedResponse<WebSocketConnectionSummary>, String> {
    history.get_websocket_paginated(page, per_page, filter)
}

#[tauri::command]
async fn get_websocket_detail(
    history: State<'_, HistoryBridge>,
    connection_id: String,
) -> Result<WebSocketConnectionDetail, String> {
    history
        .get_websocket_detail(&connection_id)?
        .ok_or_else(|| format!("WebSocket connection not found: {}", connection_id))
}

#[tauri::command]
async fn clear_websocket_all(history: State<'_, HistoryBridge>) -> Result<(), String> {
    history.clear_websocket_all()
}

fn main() {
    eprintln!("[main] Application starting...");

    std::panic::set_hook(Box::new(|panic_info| {
        let msg = format!("PANIC: {:?}", panic_info);
        eprintln!("{}", msg);
        let _ = std::fs::write("/tmp/seven_project_panic.log", msg);
    }));

    tauri::Builder::default()
        .setup(|app| {
            eprintln!("[main] Initializing database...");
            let app_dir = app
                .path()
                .app_data_dir()
                .expect("Failed to get app data dir");
            std::fs::create_dir_all(&app_dir).expect("Failed to create app data dir");
            let db_path = app_dir.join("seven_project.db");
            eprintln!("[main] Opening database at {:?}", db_path);
            let history = HistoryBridge::new(db_path).expect("Failed to initialize history bridge");
            eprintln!("[main] History bridge initialized");

            app.manage(Mutex::new(ProxyState::new()));
            app.manage(MastraProcessState::default());
            app.manage(IntruderState::default());
            app.manage(PortScanState::default());
            app.manage(BrowserProcessState::default());
            app.manage(SqliScanState::new());
            app.manage(history);
            eprintln!("[main] Building Tauri app...");

            if let Err(error) = start_mastra_if_enabled(&app.handle().clone()) {
                eprintln!("[main] Mastra auto-start skipped: {}", error);
            }

            eprintln!("[main] Tauri setup complete, spawning proxy thread...");
            let handle = app.handle().clone();
            std::thread::spawn(move || {
                eprintln!("[main] Inside new thread, calling run()...");
                run(
                    ProxyConfig {
                        port: 8888,
                        reuse: false,
                        tls_port: 8889,
                    },
                    handle,
                );
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            start_proxy,
            get_intercept_status,
            set_intercept_enabled,
            get_paused_requests,
            forward_intercepted_request,
            drop_intercepted_request,
            open_intercept_browser,
            trust_intercept_ca,
            get_proxy_all,
            get_proxy_filtered,
            get_proxy_paginated,
            get_proxy_detail,
            clear_proxy_all,
            delete_proxy_by_id,
            get_documents,
            save_document,
            delete_document,
            get_ca_cert,
            save_ca_cert,
            get_proxy_tree,
            get_websocket_paginated,
            get_websocket_detail,
            clear_websocket_all,
            send_repeater_request,
            start_intruder_attack,
            stop_intruder_attack,
            zeroxlily::port_scanner::scan_ports,
            zeroxlily::port_scanner::stop_port_scan,
            get_ai_settings,
            save_ai_settings,
            clear_ai_api_key,
            get_mastra_status,
            start_mastra,
            stop_mastra,
            zeroxlily::browser::get_browser_status,
            zeroxlily::browser::browser_open,
            zeroxlily::browser::browser_close,
            zeroxlily::browser::browser_snapshot,
            zeroxlily::browser::browser_click,
            zeroxlily::browser::browser_fill,
            zeroxlily::browser::browser_navigate,
            zeroxlily::browser::browser_type,
            zeroxlily::browser::browser_press,
            zeroxlily::browser::browser_screenshot,
            zeroxlily::browser::browser_batch,
            zeroxlily::browser::browser_execute,
            zeroxlily::sqli::start_sqli_scan,
            zeroxlily::sqli::stop_sqli_scan
        ])
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
