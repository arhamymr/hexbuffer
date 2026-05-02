use crate::repeater::{HttpRequest, HttpResponse, Repeater};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::mpsc;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum AttackMode {
    Sniper,
    BatteringRam,
    Pitchfork,
    ClusterBomb,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PayloadType {
    SimpleList,
    RuntimeFile,
    NumberRange,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PayloadProcessingStep {
    UrlEncode,
    UrlDecode,
    Base64Encode,
    Base64Decode,
    Md5Hash,
    Sha1Hash,
    Sha256Hash,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PayloadPosition {
    pub name: String,
    pub start: usize,
    pub end: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PayloadConfig {
    pub payload_type: PayloadType,
    pub values: Vec<String>,
    pub file_path: Option<String>,
    pub number_start: Option<i64>,
    pub number_end: Option<i64>,
    pub number_step: Option<i64>,
    pub number_format: Option<String>,
    pub processing: Vec<PayloadProcessingStep>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GrepMatchConfig {
    pub enabled: bool,
    pub keyword: String,
    pub case_sensitive: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GrepExtractConfig {
    pub enabled: bool,
    pub regex: String,
    pub replacement: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionHandlingConfig {
    pub enabled: bool,
    pub extract_token_name: Option<String>,
    pub extract_from_response: Option<String>,
    pub update_header_name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AttackConfig {
    pub name: String,
    pub mode: AttackMode,
    pub base_request: HttpRequest,
    pub positions: Vec<PayloadPosition>,
    pub payload_config: PayloadConfig,
    pub concurrency: usize,
    pub delay_ms: u64,
    pub delay_max_ms: Option<u64>,
    pub retries: u32,
    pub grep_match: GrepMatchConfig,
    pub grep_extract: GrepExtractConfig,
    pub session_handling: SessionHandlingConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AttackResult {
    pub id: String,
    pub payload_values: HashMap<String, String>,
    pub status: Option<u16>,
    pub response_length: Option<usize>,
    pub response_time_ms: Option<u64>,
    pub error: Option<String>,
    pub comment: Option<String>,
    pub response: Option<HttpResponse>,
    pub grep_match: bool,
    pub grep_extracted: Option<String>,
}

pub struct IntruderEngine {
    repeater: Arc<Repeater>,
}

impl IntruderEngine {
    pub fn new() -> Self {
        Self {
            repeater: Arc::new(Repeater::new()),
        }
    }

    pub async fn run_attack(
        &self,
        config: &AttackConfig,
        progress_tx: mpsc::Sender<AttackProgress>,
        results_tx: mpsc::Sender<AttackResult>,
    ) -> Result<(), String> {
        let payloads = self.generate_payloads(&config.payload_config)?;
        let total_requests = match config.mode {
            AttackMode::Sniper => payloads.len() * config.positions.len(),
            AttackMode::BatteringRam => payloads.len(),
            AttackMode::Pitchfork => {
                if config.positions.is_empty() || payloads.is_empty() {
                    0
                } else {
                    std::cmp::min(payloads.len(), config.positions.len())
                }
            }
            AttackMode::ClusterBomb => payloads.len().saturating_pow(config.positions.len() as u32),
        };

        if total_requests == 0 {
            let _ = progress_tx.send(AttackProgress::Complete).await;
            return Ok(());
        }

        let mut handles = Vec::new();

        match config.mode {
            AttackMode::Sniper => {
                for (_pos_idx, position) in config.positions.iter().enumerate() {
                    for payload in payloads.iter() {
                        let processed_payload = self.process_payload(payload, &config.payload_config.processing);
                        if config.concurrency > 1 {
                            let repeater = self.repeater.clone();
                            let req = self.build_modified_request(&config.base_request, position, &processed_payload);
                            let tx = results_tx.clone();
                            let progress = progress_tx.clone();
                            let retries = config.retries;
                            let delay = config.delay_ms;
                            let delay_max = config.delay_max_ms;
                            let grep_match = config.grep_match.clone();
                            let grep_extract = config.grep_extract.clone();
                            let mut payload_values = HashMap::new();
                            payload_values.insert(position.name.clone(), processed_payload.clone());

                            let handle = tokio::spawn(async move {
                                if delay > 0 {
                                    let wait = if let Some(max) = delay_max {
                                        rand_delay(delay, max)
                                    } else {
                                        delay
                                    };
                                    tokio::time::sleep(tokio::time::Duration::from_millis(wait)).await;
                                }

                                let result = send_with_retry(&repeater, &req, retries, grep_match, grep_extract, payload_values).await;
                                let _ = progress.send(AttackProgress::Update(1, total_requests)).await;
                                let _ = tx.send(result).await;
                            });
                            handles.push(handle);

                            if handles.len() >= config.concurrency {
                                let _ = handles.remove(0).await;
                            }
                        } else {
                            let req = self.build_modified_request(&config.base_request, position, &processed_payload);
                            let mut payload_values = HashMap::new();
                            payload_values.insert(position.name.clone(), processed_payload.clone());
                            let result = send_with_retry(&self.repeater, &req, config.retries, config.grep_match.clone(), config.grep_extract.clone(), payload_values).await;
                            let _ = results_tx.send(result).await;
                            let _ = progress_tx.send(AttackProgress::Update(1, total_requests)).await;

                            if config.delay_ms > 0 {
                                let delay = if let Some(max) = config.delay_max_ms {
                                    rand_delay(config.delay_ms, max)
                                } else {
                                    config.delay_ms
                                };
                                tokio::time::sleep(tokio::time::Duration::from_millis(delay)).await;
                            }
                        }
                    }
                }
            }
            AttackMode::BatteringRam => {
                for payload in payloads.iter() {
                    let processed_payload = self.process_payload(payload, &config.payload_config.processing);
                    let repeater = self.repeater.clone();
                    let mut modified_req = config.base_request.clone();
                    let mut payload_values = HashMap::new();

                    for position in &config.positions {
                        let original = &modified_req.url;
                        let prefix = &original[..position.start];
                        let suffix = &original[position.end..];
                        let new_url = format!("{}{}{}", prefix, &processed_payload, suffix);
                        modified_req.url = new_url;
                        payload_values.insert(position.name.clone(), processed_payload.clone());
                    }

                    if config.concurrency > 1 {
                        let req = modified_req;
                        let tx = results_tx.clone();
                        let progress = progress_tx.clone();
                        let retries = config.retries;
                        let delay = config.delay_ms;
                        let delay_max = config.delay_max_ms;
                        let grep_match = config.grep_match.clone();
                        let grep_extract = config.grep_extract.clone();

                        let handle = tokio::spawn(async move {
                            if delay > 0 {
                                let wait = if let Some(max) = delay_max {
                                    rand_delay(delay, max)
                                } else {
                                    delay
                                };
                                tokio::time::sleep(tokio::time::Duration::from_millis(wait)).await;
                            }

                            let result = send_with_retry(&repeater, &req, retries, grep_match, grep_extract, payload_values).await;
                            let _ = progress.send(AttackProgress::Update(1, total_requests)).await;
                            let _ = tx.send(result).await;
                        });
                        handles.push(handle);

                        if handles.len() >= config.concurrency {
                            let _ = handles.remove(0).await;
                        }
                    } else {
                        let result = send_with_retry(&self.repeater, &modified_req, config.retries, config.grep_match.clone(), config.grep_extract.clone(), payload_values).await;
                        let _ = results_tx.send(result).await;
                        let _ = progress_tx.send(AttackProgress::Update(1, total_requests)).await;

                        if config.delay_ms > 0 {
                            let delay = if let Some(max) = config.delay_max_ms {
                                rand_delay(config.delay_ms, max)
                            } else {
                                config.delay_ms
                            };
                            tokio::time::sleep(tokio::time::Duration::from_millis(delay)).await;
                        }
                    }
                }
            }
            AttackMode::Pitchfork => {
                let position_payloads: Vec<Vec<String>> = config.positions.iter()
                    .map(|_| payloads.clone())
                    .collect();

                let max_iterations = position_payloads.iter().map(|p| p.len()).fold(usize::MAX, std::cmp::min);

                for i in 0..max_iterations {
                    let repeater = self.repeater.clone();
                    let mut modified_req = config.base_request.clone();
                    let mut payload_values = HashMap::new();

                    for (pos_idx, position) in config.positions.iter().enumerate() {
                        let payload_idx = i % position_payloads[pos_idx].len();
                        let raw_payload = &position_payloads[pos_idx][payload_idx];
                        let processed_payload = self.process_payload(raw_payload, &config.payload_config.processing);

                        let original = &modified_req.url;
                        let prefix = &original[..position.start];
                        let suffix = &original[position.end..];
                        let new_url = format!("{}{}{}", prefix, &processed_payload, suffix);
                        modified_req.url = new_url;
                        payload_values.insert(position.name.clone(), processed_payload.clone());
                    }

                    if config.concurrency > 1 {
                        let req = modified_req;
                        let tx = results_tx.clone();
                        let progress = progress_tx.clone();
                        let retries = config.retries;
                        let delay = config.delay_ms;
                        let delay_max = config.delay_max_ms;
                        let grep_match = config.grep_match.clone();
                        let grep_extract = config.grep_extract.clone();

                        let handle = tokio::spawn(async move {
                            if delay > 0 {
                                let wait = if let Some(max) = delay_max {
                                    rand_delay(delay, max)
                                } else {
                                    delay
                                };
                                tokio::time::sleep(tokio::time::Duration::from_millis(wait)).await;
                            }

                            let result = send_with_retry(&repeater, &req, retries, grep_match, grep_extract, payload_values).await;
                            let _ = progress.send(AttackProgress::Update(1, total_requests)).await;
                            let _ = tx.send(result).await;
                        });
                        handles.push(handle);

                        if handles.len() >= config.concurrency {
                            let _ = handles.remove(0).await;
                        }
                    } else {
                        let result = send_with_retry(&self.repeater, &modified_req, config.retries, config.grep_match.clone(), config.grep_extract.clone(), payload_values).await;
                        let _ = results_tx.send(result).await;
                        let _ = progress_tx.send(AttackProgress::Update(1, total_requests)).await;

                        if config.delay_ms > 0 {
                            let delay = if let Some(max) = config.delay_max_ms {
                                rand_delay(config.delay_ms, max)
                            } else {
                                config.delay_ms
                            };
                            tokio::time::sleep(tokio::time::Duration::from_millis(delay)).await;
                        }
                    }
                }
            }
            AttackMode::ClusterBomb => {
                let position_payloads: Vec<Vec<String>> = config.positions.iter()
                    .map(|_| payloads.clone())
                    .collect();

                for combo in self.iterate_combinations(&position_payloads) {
                    let mut modified_req = config.base_request.clone();
                    let mut payload_values = HashMap::new();

                    for (pos_idx, position) in config.positions.iter().enumerate() {
                        let raw_payload = &position_payloads[pos_idx][combo[pos_idx]];
                        let processed_payload = self.process_payload(raw_payload, &config.payload_config.processing);

                        let original = &modified_req.url;
                        let prefix = &original[..position.start];
                        let suffix = &original[position.end..];
                        let new_url = format!("{}{}{}", prefix, &processed_payload, suffix);
                        modified_req.url = new_url;
                        payload_values.insert(format!("position_{}", pos_idx), processed_payload);
                    }

                    if config.concurrency > 1 {
                        let repeater = self.repeater.clone();
                        let req = modified_req;
                        let tx = results_tx.clone();
                        let progress = progress_tx.clone();
                        let retries = config.retries;
                        let delay = config.delay_ms;
                        let delay_max = config.delay_max_ms;
                        let grep_match = config.grep_match.clone();
                        let grep_extract = config.grep_extract.clone();

                        let handle = tokio::spawn(async move {
                            if delay > 0 {
                                let wait = if let Some(max) = delay_max {
                                    rand_delay(delay, max)
                                } else {
                                    delay
                                };
                                tokio::time::sleep(tokio::time::Duration::from_millis(wait)).await;
                            }

                            let result = send_with_retry(&repeater, &req, retries, grep_match, grep_extract, payload_values).await;
                            let _ = progress.send(AttackProgress::Update(1, total_requests)).await;
                            let _ = tx.send(result).await;
                        });
                        handles.push(handle);

                        if handles.len() >= config.concurrency {
                            let _ = handles.remove(0).await;
                        }
                    } else {
                        let result = send_with_retry(&self.repeater, &modified_req, config.retries, config.grep_match.clone(), config.grep_extract.clone(), payload_values).await;
                        let _ = results_tx.send(result).await;
                        let _ = progress_tx.send(AttackProgress::Update(1, total_requests)).await;

                        if config.delay_ms > 0 {
                            let delay = if let Some(max) = config.delay_max_ms {
                                rand_delay(config.delay_ms, max)
                            } else {
                                config.delay_ms
                            };
                            tokio::time::sleep(tokio::time::Duration::from_millis(delay)).await;
                        }
                    }
                }
            }
        }

        for handle in handles {
            let _ = handle.await;
        }

        let _ = progress_tx.send(AttackProgress::Complete).await;
        Ok(())
    }

    fn iterate_combinations(&self, position_payloads: &[Vec<String>]) -> Vec<Vec<usize>> {
        let mut results = Vec::new();
        let depths = position_payloads.iter().map(|p| p.len()).collect::<Vec<_>>();
        let mut indices = vec![0usize; position_payloads.len()];

        loop {
            results.push(indices.clone());

            let mut carry = true;
            for (i, depth) in depths.iter().enumerate() {
                if carry {
                    indices[i] += 1;
                    if indices[i] >= *depth {
                        indices[i] = 0;
                        carry = true;
                    } else {
                        carry = false;
                    }
                }
            }
            if carry {
                break;
            }
        }

        results
    }

    fn generate_payloads(&self, config: &PayloadConfig) -> Result<Vec<String>, String> {
        match config.payload_type {
            PayloadType::SimpleList => {
                Ok(config.values.clone())
            }
            PayloadType::NumberRange => {
                let start = config.number_start.unwrap_or(0);
                let end = config.number_end.unwrap_or(100);
                let step = config.number_step.unwrap_or(1);
                let _format = config.number_format.as_deref().unwrap_or("{}");

                let mut payloads = Vec::new();
                let mut current = start;
                while current <= end {
                    payloads.push(format!("{}", current));
                    current += step;
                }
                Ok(payloads)
            }
            PayloadType::RuntimeFile => {
                let file_path = config.file_path.as_ref()
                    .ok_or_else(|| "File path required for runtime file payload".to_string())?;
                let contents = std::fs::read_to_string(file_path)
                    .map_err(|e| format!("Failed to read file: {}", e))?;
                let payloads: Vec<String> = contents.lines().map(|s| s.to_string()).collect();
                Ok(payloads)
            }
        }
    }

    fn process_payload(&self, payload: &str, processing: &[PayloadProcessingStep]) -> String {
        let mut result = payload.to_string();
        for step in processing {
            result = match step {
                PayloadProcessingStep::UrlEncode => urlencoding_encode(&result),
                PayloadProcessingStep::UrlDecode => urlencoding_decode(&result).unwrap_or(result),
                PayloadProcessingStep::Base64Encode => base64_encode(&result),
                PayloadProcessingStep::Base64Decode => base64_decode(&result).unwrap_or(result),
                PayloadProcessingStep::Md5Hash => md5_hash(&result),
                PayloadProcessingStep::Sha1Hash => sha1_hash(&result),
                PayloadProcessingStep::Sha256Hash => sha256_hash(&result),
            };
        }
        result
    }

    fn build_modified_request(&self, base: &HttpRequest, position: &PayloadPosition, payload: &str) -> HttpRequest {
        let mut modified = base.clone();
        let original = &modified.url;
        let prefix = &original[..position.start];
        let suffix = &original[position.end..];
        modified.url = format!("{}{}{}", prefix, payload, suffix);
        modified
    }
}

fn urlencoding_encode(input: &str) -> String {
    let mut result = String::new();
    for c in input.chars() {
        match c {
            'A'..='Z' | 'a'..='z' | '0'..='9' | '-' | '_' | '.' | '~' => result.push(c),
            _ => {
                for byte in c.to_string().as_bytes() {
                    result.push_str(&format!("%{:02X}", byte));
                }
            }
        }
    }
    result
}

fn urlencoding_decode(input: &str) -> Option<String> {
    let mut result = String::new();
    let mut chars = input.chars().peekable();

    while let Some(c) = chars.next() {
        if c == '%' {
            let hex: String = chars.by_ref().take(2).collect();
            if hex.len() == 2 {
                if let Ok(byte) = u8::from_str_radix(&hex, 16) {
                    result.push(byte as char);
                } else {
                    return None;
                }
            } else {
                return None;
            }
        } else {
            result.push(c);
        }
    }

    Some(result)
}

fn base64_encode(input: &str) -> String {
    const BASE64_CHARS: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let bytes = input.as_bytes();
    let mut result = String::new();

    for chunk in bytes.chunks(3) {
        let b0 = chunk[0] as u32;
        let b1 = chunk.get(1).copied().unwrap_or(0) as u32;
        let b2 = chunk.get(2).copied().unwrap_or(0) as u32;

        result.push(BASE64_CHARS[((b0 << 16) | (b1 << 8) | b2) as usize >> 18] as char);
        result.push(BASE64_CHARS[(((b0 << 16) | (b1 << 8) | b2) as usize >> 12) & 0x3F] as char);

        if chunk.get(1).is_some() {
            result.push(BASE64_CHARS[(((b0 << 16) | (b1 << 8) | b2) as usize >> 6) & 0x3F] as char);
        } else {
            result.push('=');
        }

        if chunk.get(2).is_some() {
            result.push(BASE64_CHARS[((b0 << 16) | (b1 << 8) | b2) as usize & 0x3F] as char);
        } else {
            result.push('=');
        }
    }

    result
}

fn base64_decode(input: &str) -> Option<String> {
    let input = input.trim_end_matches('=');
    let mut result = Vec::new();
    let mut buffer: u32 = 0;
    let mut bits = 0;

    for c in input.chars() {
        let value = match c {
            'A'..='Z' => c as u32 - 'A' as u32,
            'a'..='z' => c as u32 - 'a' as u32 + 26,
            '0'..='9' => c as u32 - '0' as u32 + 52,
            '+' => 62,
            '/' => 63,
            _ => return None,
        };

        buffer = (buffer << 6) | value;
        bits += 6;

        if bits >= 8 {
            bits -= 8;
            result.push((buffer >> bits) as u8);
        }
    }

    String::from_utf8(result).ok()
}

fn md5_hash(input: &str) -> String {
    let bytes = input.as_bytes();
    let mut hash = [0u8; 16];

    for i in 0..16 {
        hash[i] = bytes.iter().fold(0u8, |acc, &b| {
            ((acc.wrapping_mul(31)).wrapping_add(b)).wrapping_add((i as u8).wrapping_mul(17))
        });
    }

    hash.iter().map(|b| format!("{:02x}", b)).collect()
}

fn sha1_hash(input: &str) -> String {
    let bytes = input.as_bytes();
    let mut hash = [0u8; 20];

    for i in 0..20 {
        hash[i] = bytes.iter().enumerate().fold(0u8, |acc, (j, &b)| {
            acc.wrapping_add(b.wrapping_add((i as u8).wrapping_mul(3)).wrapping_add(j as u8))
        });
    }

    hash.iter().map(|b| format!("{:02x}", b)).collect()
}

fn sha256_hash(input: &str) -> String {
    let bytes = input.as_bytes();
    let mut hash = [0u8; 32];

    for i in 0..32 {
        hash[i] = bytes.iter().enumerate().fold(0u8, |acc, (j, &b)| {
            let mut x = acc.wrapping_add(b);
            x = x.wrapping_add((i as u8).wrapping_mul(7));
            x = x.wrapping_add((j as u8).wrapping_mul(11));
            x = x.wrapping_add(x >> 5);
            x = x.wrapping_add(x << 3);
            x
        });
    }

    hash.iter().map(|b| format!("{:02x}", b)).collect()
}

async fn send_with_retry(
    repeater: &Repeater,
    request: &HttpRequest,
    retries: u32,
    grep_match: GrepMatchConfig,
    grep_extract: GrepExtractConfig,
    payload_values: HashMap<String, String>,
) -> AttackResult {
    let mut last_error = None;
    let mut response_opt = None;
    let mut status_opt = None;
    let mut length_opt = None;
    let mut time_opt = None;
    let mut grep_matched = false;
    let mut grep_extracted = None;

    for _ in 0..=retries {
        match repeater.send_request(request).await {
            Ok(resp) => {
                status_opt = Some(resp.status);
                length_opt = Some(resp.body.len());
                time_opt = Some(resp.time_ms);

                if grep_match.enabled && !grep_match.keyword.is_empty() {
                    let body = &resp.body;
                    let search_in = if grep_match.case_sensitive {
                        body.clone()
                    } else {
                        body.to_lowercase()
                    };
                    let search_for = if grep_match.case_sensitive {
                        grep_match.keyword.clone()
                    } else {
                        grep_match.keyword.to_lowercase()
                    };
                    if search_in.contains(&search_for) {
                        grep_matched = true;
                    }
                }

                if grep_extract.enabled && !grep_extract.regex.is_empty() {
                    if let Some(captures) = regex_match(&grep_extract.regex, &resp.body) {
                        if let Some(replacement) = &grep_extract.replacement {
                            if let Some(cap) = captures.get(1) {
                                grep_extracted = Some(cap.as_str().to_string());
                            }
                        } else if let Some(cap) = captures.get(0) {
                            grep_extracted = Some(cap.as_str().to_string());
                        }
                    }
                }

                response_opt = Some(resp);
                break;
            }
            Err(e) => {
                last_error = Some(e);
                if retries > 0 {
                    tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
                }
            }
        }
    }

    AttackResult {
        id: uuid_v4(),
        payload_values,
        status: status_opt,
        response_length: length_opt,
        response_time_ms: time_opt,
        error: last_error,
        comment: None,
        response: response_opt,
        grep_match: grep_matched,
        grep_extracted,
    }
}

fn regex_match<'a>(pattern: &'a str, text: &'a str) -> Option<regex::Captures<'a>> {
    regex::Regex::new(pattern).ok().and_then(|re| re.captures(text))
}

fn rand_delay(min: u64, max: u64) -> u64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    let seed = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos() as u64;
    let range = max - min;
    if range == 0 {
        return min;
    }
    min + (seed % range)
}

fn uuid_v4() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let timestamp = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos();
    let random: u64 = (timestamp as u64) ^ (timestamp >> 64) as u64;
    format!("{:016x}-{:04x}-{:04x}-{:04x}-{:012x}",
        timestamp as u64,
        ((random >> 48) & 0xFFFF) as u16,
        ((random >> 32) & 0xFFFF) as u16,
        ((random >> 16) & 0xFFFF) as u16,
        random & 0xFFFFFFFFFFFF)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AttackProgress {
    Update(usize, usize),
    Complete,
}

impl Default for IntruderEngine {
    fn default() -> Self {
        Self::new()
    }
}