use std::{
    collections::HashMap,
    time::{Duration, Instant},
};

use chrono::Utc;
use regex::Regex;
use serde_json::{json, Value};
use tauri::{AppHandle, Manager};
use uuid::Uuid;

use crate::proxy::state::ProxyRecord;

use super::events::{
    append_log, emit_host_insight, emit_host_insight_remove, emit_queue_stats, set_node_runtime,
};
use super::execution::run_workflow_task;
use super::state::{
    cap_host_ids, enqueue_live_traffic_job_locked, pop_next_job_locked,
    prune_recent_matches_locked, AutomationRuntimeState,
};
use super::types::{
    config_string, node_effective_type, AutomationRuntimeSettings, AutomationWorkflow,
    LiveTrafficHostInsightEvent, QueueJob, WorkflowContext, LIVE_TRAFFIC_HOST_INSIGHT_LIMIT,
    LIVE_TRAFFIC_TRIGGER_TYPE,
};

// ── Public entry point ────────────────────────────────────────────────────

pub fn ingest_proxy_record(app: &AppHandle, record: &ProxyRecord) {
    let Some(state) = app.try_state::<AutomationRuntimeState>() else {
        return;
    };

    let matches = {
        let mut inner = match state.0.lock() {
            Ok(inner) => inner,
            Err(_) => return,
        };
        let workflows = inner.workflows.clone();
        let settings = inner.settings.clone();
        let mut matches = Vec::new();
        let record_parts = get_record_url_parts(record);

        prune_recent_matches_locked(&mut inner, settings.recent_match_dedupe_ttl_ms);

        for workflow in workflows {
            if !workflow.enabled || inner.paused_workflow_ids.contains(&workflow.id) {
                continue;
            }

            let Some(trigger_node) = live_traffic_trigger_node(&workflow) else {
                continue;
            };

            if !matches_live_traffic_trigger(record, &trigger_node.data.config, &record_parts) {
                continue;
            }

            let match_key = format!(
                "{}|{}|{}|{}|{}|{}",
                trigger_node.id,
                record.id,
                record.request.method,
                record
                    .response
                    .as_ref()
                    .map(|response| response.status_code)
                    .unwrap_or_default(),
                record_parts.host,
                record_parts.path
            );
            if settings.recent_match_dedupe_ttl_ms > 0
                && inner.recent_matches.contains_key(&match_key)
            {
                continue;
            }
            inner.recent_matches.insert(match_key, Instant::now());

            matches.push((workflow, trigger_node, record_parts.clone()));
        }
        matches
    };

    if matches.is_empty() {
        return;
    }

    for (workflow, trigger_node, record_parts) in matches {
        let insight_id = Uuid::new_v4().to_string();
        let trigger_label = trigger_node
            .data
            .label
            .clone()
            .unwrap_or_else(|| "Live Traffic Captured".to_string());
        let cap = {
            let inner = match state.0.lock() {
                Ok(inner) => inner,
                Err(_) => return,
            };
            queue_cap_for_trigger(&trigger_node.data.config, &inner.settings)
        };
        let context = build_live_traffic_context(record, &record_parts, &trigger_node.id);
        let insight = LiveTrafficHostInsightEvent {
            id: insight_id.clone(),
            workflow_id: workflow.id.clone(),
            workflow_name: workflow.name.clone(),
            trigger_node_id: trigger_node.id.clone(),
            trigger_node_label: trigger_label.clone(),
            host: record_parts.host.clone(),
            method: record.request.method.clone(),
            status: record
                .response
                .as_ref()
                .map(|response| response.status_code),
            path: record_parts.path.clone(),
            matched_at: Utc::now().to_rfc3339(),
        };

        emit_host_insight(app, &insight);

        {
            let mut inner = match state.0.lock() {
                Ok(inner) => inner,
                Err(_) => return,
            };
            cap_host_ids(
                &mut inner.host_insight_ids,
                insight_id.clone(),
                LIVE_TRAFFIC_HOST_INSIGHT_LIMIT,
            );
            cap_host_ids(
                &mut inner.captured_host_ids,
                insight_id.clone(),
                LIVE_TRAFFIC_HOST_INSIGHT_LIMIT,
            );
            enqueue_live_traffic_job_locked(
                &mut inner,
                QueueJob {
                    id: insight_id,
                    workflow_id: workflow.id.clone(),
                    trigger_node_id: trigger_node.id.clone(),
                    trigger_node_label: trigger_label,
                    cap,
                    context,
                },
            );
        }

        emit_queue_stats(app, &state, &trigger_node.id);
    }

    schedule_live_traffic_queue(app.clone());
}

// ── Queue scheduling ──────────────────────────────────────────────────────

pub(crate) fn schedule_live_traffic_queue(app: AppHandle) {
    tauri::async_runtime::spawn(async move {
        loop {
            let next_job = {
                let Some(state) = app.try_state::<AutomationRuntimeState>() else {
                    return;
                };
                let mut inner = match state.0.lock() {
                    Ok(inner) => inner,
                    Err(_) => return,
                };
                let concurrency = inner.settings.live_traffic_concurrency.max(1);
                if inner.active_live_traffic_jobs >= concurrency {
                    return;
                }

                let Some(job) = pop_next_job_locked(&mut inner) else {
                    return;
                };

                let workflow_exists = inner
                    .workflows
                    .iter()
                    .any(|workflow| workflow.id == job.workflow_id && workflow.enabled);
                if !workflow_exists || inner.paused_workflow_ids.contains(&job.workflow_id) {
                    continue;
                }

                if inner.running_workflow_ids.contains(&job.workflow_id) {
                    enqueue_live_traffic_job_locked(&mut inner, job);
                    let retry_app = app.clone();
                    tauri::async_runtime::spawn(async move {
                        tokio::time::sleep(Duration::from_millis(250)).await;
                        schedule_live_traffic_queue(retry_app);
                    });
                    return;
                }

                inner.active_live_traffic_jobs += 1;
                Some(job)
            };

            let Some(job) = next_job else {
                return;
            };

            let workflow = {
                let Some(state) = app.try_state::<AutomationRuntimeState>() else {
                    return;
                };
                let inner = match state.0.lock() {
                    Ok(inner) => inner,
                    Err(_) => return,
                };
                inner
                    .workflows
                    .iter()
                    .find(|workflow| workflow.id == job.workflow_id && workflow.enabled)
                    .cloned()
            };

            emit_host_insight_remove(&app, job.id.clone());
            if let Some(state) = app.try_state::<AutomationRuntimeState>() {
                emit_queue_stats(&app, &state, &job.trigger_node_id);
            }

            if let Some(workflow) = workflow {
                let app_for_task = app.clone();
                let job_for_task = job.clone();
                tauri::async_runtime::spawn(async move {
                    append_log(
                        &app_for_task,
                        &job_for_task.workflow_id,
                        "info",
                        &format!("Received live traffic: {}", job_for_task.trigger_node_label),
                        Some(&job_for_task.trigger_node_id),
                        Some(&job_for_task.trigger_node_label),
                        Some(job_for_task.context.data.clone()),
                        Some(job_for_task.context.data.clone()),
                    );
                    set_node_runtime(
                        &app_for_task,
                        &job_for_task.workflow_id,
                        &job_for_task.trigger_node_id,
                        "running",
                        &format!("Received: {}", job_for_task.trigger_node_label),
                        Some(job_for_task.context.data.clone()),
                        Some(job_for_task.context.data.clone()),
                    );
                    run_workflow_task(
                        app_for_task.clone(),
                        workflow,
                        job_for_task.context.clone(),
                        true,
                        Uuid::new_v4().to_string(),
                    )
                    .await;
                    finish_live_traffic_job(&app_for_task, &job_for_task);
                });
            } else {
                finish_live_traffic_job(&app, &job);
            }
        }
    });
}

fn finish_live_traffic_job(app: &AppHandle, job: &QueueJob) {
    if let Some(state) = app.try_state::<AutomationRuntimeState>() {
        if let Ok(mut inner) = state.0.lock() {
            inner.active_live_traffic_jobs = inner.active_live_traffic_jobs.saturating_sub(1);
        }
        emit_queue_stats(app, &state, &job.trigger_node_id);
    }
    schedule_live_traffic_queue(app.clone());
}

// ── Trigger matching ──────────────────────────────────────────────────────

fn live_traffic_trigger_node(
    workflow: &AutomationWorkflow,
) -> Option<super::types::AutomationNode> {
    workflow
        .nodes
        .iter()
        .find(|node| node_effective_type(node) == LIVE_TRAFFIC_TRIGGER_TYPE)
        .cloned()
}

#[derive(Clone)]
struct RecordUrlParts {
    host: String,
    full: String,
    path: String,
}

fn header_value(headers: &HashMap<String, String>, name: &str) -> String {
    headers
        .iter()
        .find(|(key, _)| key.eq_ignore_ascii_case(name))
        .map(|(_, value)| value.clone())
        .unwrap_or_default()
}

fn normalize_host_pattern(value: &str) -> String {
    let trimmed = value.trim().trim_start_matches("*.").to_lowercase();
    if trimmed.is_empty() {
        return String::new();
    }
    let candidate = if trimmed.contains("://") {
        trimmed
    } else {
        format!("https://{}", trimmed)
    };
    url::Url::parse(&candidate)
        .ok()
        .and_then(|url| url.host_str().map(str::to_string))
        .unwrap_or_else(|| {
            candidate
                .split('/')
                .next()
                .unwrap_or_default()
                .split(':')
                .next()
                .unwrap_or_default()
                .trim()
                .to_string()
        })
}

fn parse_url_parts(url: &str) -> RecordUrlParts {
    let candidate = if url.starts_with("http") {
        url.to_string()
    } else {
        format!("https://{}", url)
    };
    if let Ok(parsed) = url::Url::parse(&candidate) {
        return RecordUrlParts {
            host: parsed.host_str().unwrap_or_default().to_string(),
            full: parsed.to_string(),
            path: format!(
                "{}{}",
                parsed.path(),
                parsed
                    .query()
                    .map(|query| format!("?{}", query))
                    .unwrap_or_default()
            ),
        };
    }
    RecordUrlParts {
        host: url.to_string(),
        full: url.to_string(),
        path: url.to_string(),
    }
}

fn get_record_url_parts(record: &ProxyRecord) -> RecordUrlParts {
    let parsed = parse_url_parts(&record.request.uri);
    let uri_looks_relative = record.request.uri.starts_with('/');
    let parsed_host = if uri_looks_relative {
        String::new()
    } else {
        parsed.host
    };
    let header_host = header_value(&record.request.headers, ":authority")
        .or_else_empty(header_value(&record.request.headers, "host"));
    let fallback_host =
        normalize_host_pattern(&header_host.or_else_empty(record.server_addr.clone()));
    let host = normalize_host_pattern(&parsed_host.or_else_empty(fallback_host));
    RecordUrlParts {
        host,
        full: parsed.full,
        path: if uri_looks_relative {
            record.request.uri.clone()
        } else {
            parsed.path
        },
    }
}

trait StringFallback {
    fn or_else_empty(self, fallback: String) -> String;
}

impl StringFallback for String {
    fn or_else_empty(self, fallback: String) -> String {
        if self.trim().is_empty() {
            fallback
        } else {
            self
        }
    }
}

fn parse_host_whitelist(host: Option<&str>) -> Vec<String> {
    host.unwrap_or_default()
        .split(|ch: char| ch.is_whitespace() || ch == ',' || ch == ';')
        .map(normalize_host_pattern)
        .filter(|entry| !entry.is_empty())
        .collect()
}

fn matches_live_traffic_trigger(
    record: &ProxyRecord,
    config: &Value,
    parts: &RecordUrlParts,
) -> bool {
    if config_string(config, "triggerType") != LIVE_TRAFFIC_TRIGGER_TYPE {
        return false;
    }

    let method = config_string(config, "method");
    if !method.trim().is_empty() && !method.eq_ignore_ascii_case("ANY") {
        if !record.request.method.eq_ignore_ascii_case(&method) {
            return false;
        }
    }

    let whitelisted_hosts = parse_host_whitelist(config.get("host").and_then(Value::as_str));
    if whitelisted_hosts.is_empty() {
        return false;
    }

    let lowered_host = parts.host.to_lowercase();
    if !whitelisted_hosts.iter().any(|allowed| {
        lowered_host == *allowed || lowered_host.ends_with(&format!(".{}", allowed))
    }) {
        return false;
    }

    let value = config_string(config, "value");
    if value.trim().is_empty() {
        return true;
    }

    let operator = config_string(config, "operator");
    let lowered_url = record.request.uri.to_lowercase();
    let lowered_value = value.to_lowercase();
    match operator.as_str() {
        "equals" => lowered_url == lowered_value,
        "regex" => Regex::new(&value)
            .map(|regex| regex.is_match(&record.request.uri))
            .unwrap_or(false),
        _ => lowered_url.contains(&lowered_value),
    }
}

fn is_catch_all_trigger(config: &Value) -> bool {
    let has_host = !parse_host_whitelist(config.get("host").and_then(Value::as_str)).is_empty();
    let method = config_string(config, "method");
    let has_method = !method.trim().is_empty() && !method.eq_ignore_ascii_case("ANY");
    let has_value = !config_string(config, "value").trim().is_empty();
    !has_host && !has_method && !has_value
}

fn queue_cap_for_trigger(config: &Value, settings: &AutomationRuntimeSettings) -> usize {
    if is_catch_all_trigger(config) {
        settings.catch_all_trigger_queue_cap
    } else {
        settings.filtered_trigger_queue_cap
    }
}

fn build_live_traffic_context(
    record: &ProxyRecord,
    parts: &RecordUrlParts,
    trigger_node_id: &str,
) -> WorkflowContext {
    WorkflowContext {
        trigger_type: Some("live-traffic-captured".to_string()),
        trigger_node_id: Some(trigger_node_id.to_string()),
        data: json!({
            "id": record.id.to_string(),
            "timestamp": record.timestamp.to_rfc3339(),
            "url": record.request.uri,
            "method": record.request.method,
            "host": parts.host,
            "status": record.response.as_ref().map(|response| response.status_code),
            "statusText": record.response.as_ref().map(|response| response.status_text.clone()).unwrap_or_default(),
            "requestBody": String::from_utf8_lossy(&record.request.body).to_string(),
            "responseBody": record.response.as_ref().map(|response| String::from_utf8_lossy(&response.body).to_string()).unwrap_or_default(),
            "clientAddr": record.client_addr,
            "serverAddr": record.server_addr,
            "httpVersion": record.request.http_version,
            "responseHttpVersion": record.response.as_ref().map(|response| response.http_version.clone()).unwrap_or_default(),
            "path": parts.path,
        }),
    }
}

// ── Tests ─────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use crate::proxy::state::ProxyRequest;

    #[test]
    fn host_whitelist_accepts_exact_and_wildcard_hosts() {
        let hosts = parse_host_whitelist(Some("mycarrier.telkom.co.id, *.0xbuffer.com"));

        assert!(hosts.contains(&"mycarrier.telkom.co.id".to_string()));
        assert!(hosts.contains(&"0xbuffer.com".to_string()));
    }

    #[test]
    fn live_traffic_trigger_requires_a_host_whitelist() {
        let record = ProxyRecord {
            id: Uuid::new_v4(),
            timestamp: Utc::now(),
            request: ProxyRequest {
                method: "GET".to_string(),
                uri: "https://0xbuffer.com/docs".to_string(),
                http_version: "HTTP/2".to_string(),
                headers: HashMap::new(),
                body: Vec::new(),
                content_decoded: false,
            },
            response: None,
            client_addr: "127.0.0.1:12345".to_string(),
            server_addr: "https://0xbuffer.com".to_string(),
        };
        let parts = get_record_url_parts(&record);
        let config = json!({
            "triggerType": LIVE_TRAFFIC_TRIGGER_TYPE,
            "method": "GET",
            "host": "",
        });

        assert!(!matches_live_traffic_trigger(&record, &config, &parts));
    }
}
