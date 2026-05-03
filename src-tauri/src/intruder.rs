use crate::repeater::{HttpRequest, HttpResponse, Repeater};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::mpsc;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AttackMode {
    Sniper,
    BatteringRam,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PayloadType {
    SimpleList,
    RuntimeFile,
    NumberRange,
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
        };

        let mut handles = Vec::new();

        match config.mode {
            AttackMode::Sniper => {
                for (_pos_idx, position) in config.positions.iter().enumerate() {
                    for payload in payloads.iter() {
                        if config.concurrency > 1 {
                            let repeater = self.repeater.clone();
                            let req = self.build_modified_request(&config.base_request, position, payload);
                            let tx = results_tx.clone();
                            let progress = progress_tx.clone();
                            let retries = config.retries;
                            let delay = config.delay_ms;
                            let delay_max = config.delay_max_ms;

                            let handle = tokio::spawn(async move {
                                if delay > 0 {
                                    let wait = if let Some(max) = delay_max {
                                        rand_delay(delay, max)
                                    } else {
                                        delay
                                    };
                                    tokio::time::sleep(tokio::time::Duration::from_millis(wait)).await;
                                }

                                let result = send_with_retry(&repeater, &req, retries).await;
                                let _ = progress.send(AttackProgress::Update(1, total_requests)).await;
                                let _ = tx.send(result).await;
                            });
                            handles.push(handle);

                            if handles.len() >= config.concurrency {
                                let _ = handles.remove(0).await;
                            }
                        } else {
                            let req = self.build_modified_request(&config.base_request, position, payload);
                            let result = send_with_retry(&self.repeater, &req, config.retries).await;
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
                    let repeater = self.repeater.clone();
                    let mut modified_req = config.base_request.clone();
                    let mut payload_values = HashMap::new();

                    for position in &config.positions {
                        let original = &modified_req.url;
                        let prefix = &original[..position.start];
                        let suffix = &original[position.end..];
                        let new_url = format!("{}{}{}", prefix, payload, suffix);
                        modified_req.url = new_url;
                        payload_values.insert(position.name.clone(), payload.clone());
                    }

                    if config.concurrency > 1 {
                        let req = modified_req;
                        let tx = results_tx.clone();
                        let progress = progress_tx.clone();
                        let retries = config.retries;
                        let delay = config.delay_ms;
                        let delay_max = config.delay_max_ms;

                        let handle = tokio::spawn(async move {
                            if delay > 0 {
                                let wait = if let Some(max) = delay_max {
                                    rand_delay(delay, max)
                                } else {
                                    delay
                                };
                                tokio::time::sleep(tokio::time::Duration::from_millis(wait)).await;
                            }

                            let result = send_with_retry(&repeater, &req, retries).await;
                            let _ = progress.send(AttackProgress::Update(1, total_requests)).await;
                            let _ = tx.send(result).await;
                        });
                        handles.push(handle);

                        if handles.len() >= config.concurrency {
                            let _ = handles.remove(0).await;
                        }
                    } else {
                        let result = send_with_retry(&self.repeater, &modified_req, config.retries).await;
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

    fn build_modified_request(&self, base: &HttpRequest, position: &PayloadPosition, payload: &str) -> HttpRequest {
        let mut modified = base.clone();
        let original = &modified.url;
        let prefix = &original[..position.start];
        let suffix = &original[position.end..];
        modified.url = format!("{}{}{}", prefix, payload, suffix);
        modified
    }
}

async fn send_with_retry(repeater: &Repeater, request: &HttpRequest, retries: u32) -> AttackResult {
    let mut last_error = None;
    let mut response_opt = None;
    let mut status_opt = None;
    let mut length_opt = None;
    let mut time_opt = None;

    for _ in 0..=retries {
        match repeater.send_request(request).await {
            Ok(resp) => {
                status_opt = Some(resp.status);
                length_opt = Some(resp.body.len());
                time_opt = Some(resp.time_ms);
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
        payload_values: HashMap::new(),
        status: status_opt,
        response_length: length_opt,
        response_time_ms: time_opt,
        error: last_error,
        comment: None,
        response: response_opt,
    }
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