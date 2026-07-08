use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use base64::{engine::general_purpose, Engine};
use regex::Regex;
use serde::{Deserialize, Serialize};
use sha1::Sha1;
use sha2::{Digest, Sha256};
use tauri::{AppHandle, Emitter, State};
use tokio::sync::Semaphore;
use uuid::Uuid;

#[derive(Debug, Clone, Deserialize)]
pub enum InvokerAttackMode {
    Sniper,
    BatteringRam,
    Pitchfork,
    ClusterBomb,
}

#[derive(Debug, Clone, Deserialize)]
pub enum InvokerPayloadType {
    SimpleList,
    RuntimeFile,
    NumberRange,
}

#[derive(Debug, Clone, Deserialize)]
pub enum InvokerPayloadProcessingStep {
    UrlEncode,
    UrlDecode,
    Base64Encode,
    Base64Decode,
    Md5Hash,
    Sha1Hash,
    Sha256Hash,
}

#[derive(Debug, Clone, Deserialize)]
pub struct InvokerPayloadPosition {
    pub name: String,
    pub start: usize,
    pub end: usize,
}

#[derive(Debug, Clone, Deserialize)]
pub struct InvokerPayloadConfig {
    pub payload_type: InvokerPayloadType,
    pub values: Vec<String>,
    pub file_path: Option<String>,
    pub number_start: Option<i64>,
    pub number_end: Option<i64>,
    pub number_step: Option<i64>,
    pub number_format: Option<String>,
    pub processing: Vec<InvokerPayloadProcessingStep>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct InvokerGrepMatchConfig {
    pub enabled: bool,
    pub keyword: String,
    pub case_sensitive: bool,
}

#[derive(Debug, Clone, Deserialize)]
pub struct InvokerGrepExtractConfig {
    pub enabled: bool,
    pub regex: String,
    pub replacement: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct InvokerSessionHandlingConfig {
    pub enabled: bool,
    pub extract_token_name: Option<String>,
    pub extract_from_response: Option<String>,
    pub update_header_name: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct InvokerHttpRequest {
    pub method: String,
    pub url: String,
    pub headers: HashMap<String, String>,
    pub body: String,
    pub follow_redirects: bool,
    pub max_hops: usize,
}

#[derive(Debug, Clone, Deserialize)]
pub struct InvokerAttackConfig {
    pub name: String,
    pub mode: InvokerAttackMode,
    pub base_request: InvokerHttpRequest,
    pub positions: Vec<InvokerPayloadPosition>,
    pub payload_config: InvokerPayloadConfig,
    #[serde(default)]
    pub position_payloads: Option<HashMap<String, InvokerPayloadConfig>>,
    pub concurrency: usize,
    pub delay_ms: u64,
    pub delay_max_ms: Option<u64>,
    pub retries: usize,
    pub grep_match: InvokerGrepMatchConfig,
    #[serde(rename = "grep_extract")]
    pub grep_extract: InvokerGrepExtractConfig,
    pub session_handling: InvokerSessionHandlingConfig,
}

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "type")]
pub enum InvokerProgress {
    Update { current: usize, total: usize },
    Complete,
}

#[derive(Debug, Clone, Serialize)]
pub struct InvokerResponse {
    pub status: u16,
    pub status_text: String,
    pub headers: HashMap<String, String>,
    pub body: String,
    pub time_ms: u128,
    pub final_url: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct InvokerAttackResult {
    pub id: String,
    pub payload_values: HashMap<String, String>,
    pub status: Option<u16>,
    pub response_length: Option<usize>,
    pub response_time_ms: Option<u128>,
    pub error: Option<String>,
    pub comment: Option<String>,
    pub response: Option<InvokerResponse>,
    pub grep_match: bool,
    pub grep_extracted: Option<String>,
}

impl InvokerAttackResult {
    pub fn error(error: String) -> Self {
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

#[derive(Default)]
pub struct InvokerState {
    pub cancellations: Arc<Mutex<HashMap<String, Arc<AtomicBool>>>>,
}

#[tauri::command]
pub async fn start_invoker_attack(
    app: AppHandle,
    state: State<'_, InvokerState>,
    config: InvokerAttackConfig,
) -> Result<String, String> {
    validate_invoker_config(&config)?;

    let attack_id = Uuid::new_v4().to_string();
    let cancel_flag = Arc::new(AtomicBool::new(false));
    state
        .cancellations
        .lock()
        .map_err(|_| "Failed to lock invoker state".to_string())?
        .insert(attack_id.clone(), cancel_flag.clone());

    let event_id = attack_id.clone();
    let cancellations = state.cancellations.clone();
    tokio::spawn(async move {
        run_invoker_attack(app, event_id.clone(), config, cancel_flag).await;
        if let Ok(mut cancellations) = cancellations.lock() {
            cancellations.remove(&event_id);
        }
    });

    Ok(attack_id)
}

#[tauri::command]
pub async fn stop_invoker_attack(
    state: State<'_, InvokerState>,
    attack_id: String,
) -> Result<(), String> {
    if let Some(cancel_flag) = state
        .cancellations
        .lock()
        .map_err(|_| "Failed to lock invoker state".to_string())?
        .remove(&attack_id)
    {
        cancel_flag.store(true, Ordering::Relaxed);
    }

    Ok(())
}

pub fn validate_invoker_config(config: &InvokerAttackConfig) -> Result<(), String> {
    if config.base_request.url.trim().is_empty() {
        return Err("Base request URL is required".to_string());
    }

    if count_markers(&config.base_request) == 0 {
        return Err("Add at least one payload position with $ markers".to_string());
    }

    if config
        .positions
        .iter()
        .any(|position| position.end < position.start)
    {
        return Err("Payload position ranges are invalid".to_string());
    }

    if config
        .position_payloads
        .as_ref()
        .is_some_and(|position_payloads| !position_payloads.is_empty())
    {
        let sources = build_position_payload_sources(config, count_markers(&config.base_request))?;
        if sources.is_empty() {
            return Err("Add payloads for every marked position".to_string());
        }
    } else if build_payload_source(&config.payload_config)?.is_empty() {
        return Err("Add at least one payload".to_string());
    }

    Ok(())
}

pub async fn run_invoker_attack(
    app: AppHandle,
    attack_id: String,
    config: InvokerAttackConfig,
    cancel_flag: Arc<AtomicBool>,
) {
    let defaults = marker_defaults(&config.base_request);
    let position_count = defaults.len();
    let payloads = match build_invoker_payload_rows(&config, position_count) {
        Ok(values) => values,
        Err(error) => {
            let _ = app.emit(
                &format!("invoker-result-{}", attack_id),
                InvokerAttackResult::error(error),
            );
            let _ = app.emit(
                &format!("invoker-progress-{}", attack_id),
                InvokerProgress::Complete,
            );
            return;
        }
    };

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
                &format!("invoker-result-{}", attack_id),
                InvokerAttackResult::error(format!("Failed to build HTTP client: {}", error)),
            );
            let _ = app.emit(
                &format!("invoker-progress-{}", attack_id),
                InvokerProgress::Complete,
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

            apply_invoker_delay(&config, index).await;
            let result = send_invoker_request(
                &client,
                &config,
                &defaults,
                payload_values,
                session_value,
                cancel_flag.clone(),
            )
            .await;

            let current = completed.fetch_add(1, Ordering::Relaxed) + 1;
            let _ = app.emit(&format!("invoker-result-{}", attack_id), result);
            let _ = app.emit(
                &format!("invoker-progress-{}", attack_id),
                InvokerProgress::Update { current, total },
            );
        }));
    }

    for handle in handles {
        let _ = handle.await;
    }

    let _ = app.emit(
        &format!("invoker-progress-{}", attack_id),
        InvokerProgress::Complete,
    );
}

pub async fn apply_invoker_delay(config: &InvokerAttackConfig, index: usize) {
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

pub async fn send_invoker_request(
    client: &reqwest::Client,
    config: &InvokerAttackConfig,
    defaults: &[String],
    payload_values: HashMap<String, String>,
    session_value: Arc<Mutex<Option<String>>>,
    cancel_flag: Arc<AtomicBool>,
) -> InvokerAttackResult {
    let mut last_error = None;

    for attempt in 0..=config.retries {
        if cancel_flag.load(Ordering::Relaxed) {
            last_error = Some("Attack stopped".to_string());
            break;
        }

        match send_invoker_request_once(client, config, defaults, &payload_values, &session_value)
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

    InvokerAttackResult {
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

pub async fn send_invoker_request_once(
    client: &reqwest::Client,
    config: &InvokerAttackConfig,
    defaults: &[String],
    payload_values: &HashMap<String, String>,
    session_value: &Arc<Mutex<Option<String>>>,
) -> Result<InvokerAttackResult, String> {
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

    Ok(InvokerAttackResult {
        id: Uuid::new_v4().to_string(),
        payload_values: payload_values.clone(),
        status: Some(status.as_u16()),
        response_length: Some(response_body.len()),
        response_time_ms: Some(elapsed_ms),
        error: None,
        comment: None,
        response: Some(InvokerResponse {
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

pub fn build_payload_source(config: &InvokerPayloadConfig) -> Result<Vec<String>, String> {
    let values = match config.payload_type {
        InvokerPayloadType::SimpleList => config.values.clone(),
        InvokerPayloadType::RuntimeFile => {
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
        InvokerPayloadType::NumberRange => {
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

pub fn build_invoker_payload_rows(
    config: &InvokerAttackConfig,
    position_count: usize,
) -> Result<Vec<HashMap<String, String>>, String> {
    if config
        .position_payloads
        .as_ref()
        .is_some_and(|position_payloads| !position_payloads.is_empty())
    {
        let sources = build_position_payload_sources(config, position_count)?;
        return Ok(generate_aligned_position_payloads(&sources));
    }

    let payload_source = build_payload_source(&config.payload_config)?;
    Ok(generate_invoker_payloads(
        config,
        &payload_source,
        position_count,
    ))
}

pub fn build_position_payload_sources(
    config: &InvokerAttackConfig,
    position_count: usize,
) -> Result<Vec<(String, Vec<String>)>, String> {
    let Some(position_payloads) = config.position_payloads.as_ref() else {
        return Ok(Vec::new());
    };

    let mut sources = Vec::with_capacity(position_count);

    for position_index in 0..position_count {
        let name = position_name(&config.positions, position_index);
        let payload_config = position_payloads
            .get(&name)
            .ok_or_else(|| format!("Add payloads for {}", name))?;
        let source = build_payload_source(payload_config)?;

        if source.is_empty() {
            return Err(format!("Add payloads for {}", name));
        }

        sources.push((name, source));
    }

    Ok(sources)
}

pub fn generate_aligned_position_payloads(
    sources: &[(String, Vec<String>)],
) -> Vec<HashMap<String, String>> {
    let Some(row_count) = sources.iter().map(|(_, source)| source.len()).min() else {
        return Vec::new();
    };

    (0..row_count)
        .map(|row_index| {
            sources
                .iter()
                .map(|(name, source)| (name.clone(), source[row_index].clone()))
                .collect()
        })
        .collect()
}

pub fn format_number_payload(value: i64, format: Option<&str>) -> String {
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

pub fn apply_payload_processing(
    mut value: String,
    steps: &[InvokerPayloadProcessingStep],
) -> String {
    for step in steps {
        value = match step {
            InvokerPayloadProcessingStep::UrlEncode => percent_encode(&value),
            InvokerPayloadProcessingStep::UrlDecode => percent_decode(&value).unwrap_or(value),
            InvokerPayloadProcessingStep::Base64Encode => {
                general_purpose::STANDARD.encode(value.as_bytes())
            }
            InvokerPayloadProcessingStep::Base64Decode => general_purpose::STANDARD
                .decode(value.as_bytes())
                .ok()
                .and_then(|bytes| String::from_utf8(bytes).ok())
                .unwrap_or(value),
            InvokerPayloadProcessingStep::Md5Hash => md5_hex(value.as_bytes()),
            InvokerPayloadProcessingStep::Sha1Hash => {
                let mut hasher = Sha1::new();
                hasher.update(value.as_bytes());
                hex_encode(&hasher.finalize())
            }
            InvokerPayloadProcessingStep::Sha256Hash => {
                let mut hasher = Sha256::new();
                hasher.update(value.as_bytes());
                hex_encode(&hasher.finalize())
            }
        };
    }

    value
}

pub fn generate_invoker_payloads(
    config: &InvokerAttackConfig,
    source: &[String],
    position_count: usize,
) -> Vec<HashMap<String, String>> {
    match config.mode {
        InvokerAttackMode::Sniper => {
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
        InvokerAttackMode::BatteringRam => source
            .iter()
            .map(|payload| {
                (0..position_count)
                    .map(|index| (position_name(&config.positions, index), payload.clone()))
                    .collect()
            })
            .collect(),
        InvokerAttackMode::Pitchfork => source
            .iter()
            .map(|payload| {
                (0..position_count)
                    .map(|index| (position_name(&config.positions, index), payload.clone()))
                    .collect()
            })
            .collect(),
        InvokerAttackMode::ClusterBomb => {
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

pub fn append_cluster_payloads(
    rows: &mut Vec<HashMap<String, String>>,
    current: HashMap<String, String>,
    source: &[String],
    positions: &[InvokerPayloadPosition],
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

pub fn position_name(positions: &[InvokerPayloadPosition], index: usize) -> String {
    positions
        .get(index)
        .map(|position| position.name.clone())
        .unwrap_or_else(|| format!("position_{}", index + 1))
}

pub fn count_markers(request: &InvokerHttpRequest) -> usize {
    marker_defaults(request).len()
}

pub fn marker_defaults(request: &InvokerHttpRequest) -> Vec<String> {
    let mut defaults = Vec::new();
    collect_marked_values(&request.url, &mut defaults);
    for (name, value) in &request.headers {
        collect_marked_values(name, &mut defaults);
        collect_marked_values(value, &mut defaults);
    }
    collect_marked_values(&request.body, &mut defaults);
    defaults
}

pub fn collect_marked_values(text: &str, values: &mut Vec<String>) {
    let mut search_start = 0;
    while let Some(start) = text[search_start..].find('$') {
        let absolute_start = search_start + start;
        if let Some(end) = text[absolute_start + '$'.len_utf8()..].find('$') {
            let absolute_end = absolute_start + '$'.len_utf8() + end;
            values.push(text[absolute_start + '$'.len_utf8()..absolute_end].to_string());
            search_start = absolute_end + '$'.len_utf8();
        } else {
            break;
        }
    }
}

pub fn replace_marked_values(
    text: &str,
    payload_values: &HashMap<String, String>,
    defaults: &[String],
) -> String {
    let mut output = String::with_capacity(text.len());
    let mut search_start = 0;
    let mut position_index = 0;

    while let Some(start) = text[search_start..].find('$') {
        let absolute_start = search_start + start;
        let Some(end) = text[absolute_start + '$'.len_utf8()..].find('$') else {
            break;
        };
        let absolute_end = absolute_start + '$'.len_utf8() + end;
        let position_key = format!("position_{}", position_index + 1);
        let replacement = payload_values
            .get(&position_key)
            .cloned()
            .unwrap_or_else(|| defaults.get(position_index).cloned().unwrap_or_default());

        output.push_str(&text[search_start..absolute_start]);
        output.push_str(&replacement);
        search_start = absolute_end + '$'.len_utf8();
        position_index += 1;
    }

    output.push_str(&text[search_start..]);
    output
}

pub fn response_matches(body: &str, config: &InvokerGrepMatchConfig) -> bool {
    if !config.enabled || config.keyword.is_empty() {
        return false;
    }

    if config.case_sensitive {
        body.contains(&config.keyword)
    } else {
        body.to_lowercase().contains(&config.keyword.to_lowercase())
    }
}

pub fn extract_grep_value(body: &str, config: &InvokerGrepExtractConfig) -> Option<String> {
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

pub fn extract_session_value(body: &str, config: &InvokerSessionHandlingConfig) -> Option<String> {
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

pub fn percent_encode(value: &str) -> String {
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

pub fn percent_decode(value: &str) -> Option<String> {
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

pub fn hex_encode(bytes: &[u8]) -> String {
    bytes.iter().map(|byte| format!("{:02x}", byte)).collect()
}

pub fn md5_hex(input: &[u8]) -> String {
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

#[cfg(test)]
mod tests {
    use super::*;

    fn payload_config(values: &[&str]) -> InvokerPayloadConfig {
        InvokerPayloadConfig {
            payload_type: InvokerPayloadType::SimpleList,
            values: values.iter().map(|value| value.to_string()).collect(),
            file_path: None,
            number_start: None,
            number_end: None,
            number_step: None,
            number_format: None,
            processing: Vec::new(),
        }
    }

    fn attack_config(
        position_payloads: Option<HashMap<String, InvokerPayloadConfig>>,
    ) -> InvokerAttackConfig {
        InvokerAttackConfig {
            name: "test".to_string(),
            mode: InvokerAttackMode::Sniper,
            base_request: InvokerHttpRequest {
                method: "GET".to_string(),
                url: "https://example.test/login?u=$user$&p=$pass$".to_string(),
                headers: HashMap::new(),
                body: String::new(),
                follow_redirects: true,
                max_hops: 10,
            },
            positions: vec![
                InvokerPayloadPosition {
                    name: "position_1".to_string(),
                    start: 0,
                    end: 0,
                },
                InvokerPayloadPosition {
                    name: "position_2".to_string(),
                    start: 0,
                    end: 0,
                },
            ],
            payload_config: payload_config(&["legacy-a", "legacy-b"]),
            position_payloads,
            concurrency: 1,
            delay_ms: 0,
            delay_max_ms: None,
            retries: 0,
            grep_match: InvokerGrepMatchConfig {
                enabled: false,
                keyword: String::new(),
                case_sensitive: false,
            },
            grep_extract: InvokerGrepExtractConfig {
                enabled: false,
                regex: String::new(),
                replacement: None,
            },
            session_handling: InvokerSessionHandlingConfig {
                enabled: false,
                extract_token_name: None,
                extract_from_response: None,
                update_header_name: None,
            },
        }
    }

    #[test]
    fn aligned_position_payloads_pair_equal_length_sets() {
        let sources = vec![
            (
                "position_1".to_string(),
                vec!["admin".to_string(), "root".to_string()],
            ),
            (
                "position_2".to_string(),
                vec!["pass".to_string(), "toor".to_string()],
            ),
        ];

        let rows = generate_aligned_position_payloads(&sources);

        assert_eq!(rows.len(), 2);
        assert_eq!(rows[0].get("position_1").map(String::as_str), Some("admin"));
        assert_eq!(rows[0].get("position_2").map(String::as_str), Some("pass"));
        assert_eq!(rows[1].get("position_1").map(String::as_str), Some("root"));
        assert_eq!(rows[1].get("position_2").map(String::as_str), Some("toor"));
    }

    #[test]
    fn aligned_position_payloads_stop_at_shortest_set() {
        let sources = vec![
            (
                "position_1".to_string(),
                vec!["admin".to_string(), "root".to_string(), "test".to_string()],
            ),
            ("position_2".to_string(), vec!["pass".to_string()]),
        ];

        let rows = generate_aligned_position_payloads(&sources);

        assert_eq!(rows.len(), 1);
        assert_eq!(rows[0].get("position_1").map(String::as_str), Some("admin"));
        assert_eq!(rows[0].get("position_2").map(String::as_str), Some("pass"));
    }

    #[test]
    fn validation_requires_payloads_for_every_marker() {
        let mut position_payloads = HashMap::new();
        position_payloads.insert("position_1".to_string(), payload_config(&["admin"]));

        let config = attack_config(Some(position_payloads));

        assert_eq!(
            validate_invoker_config(&config),
            Err("Add payloads for position_2".to_string())
        );
    }

    #[test]
    fn legacy_single_payload_config_still_generates_sniper_rows() {
        let config = attack_config(None);
        let rows = build_invoker_payload_rows(&config, 2).expect("legacy rows");

        assert_eq!(rows.len(), 4);
        assert_eq!(
            rows[0].get("position_1").map(String::as_str),
            Some("legacy-a")
        );
        assert!(!rows[0].contains_key("position_2"));
    }
}
