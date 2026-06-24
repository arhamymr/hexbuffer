use regex::Regex;
use serde_json::{json, Value};
use tauri::{AppHandle, Manager};
use uuid::Uuid;

use crate::proxy::state::{
    WebSocketMessageDirection, WebSocketMessageRecord, WebSocketMessageType,
};

use super::events::emit_queue_stats;
use super::live_traffic::schedule_live_traffic_queue;
use super::state::{enqueue_live_traffic_job_locked, AutomationRuntimeState};
use super::types::{
    config_string, node_effective_type, AutomationNode, AutomationRuntimeSettings,
    AutomationWorkflow, QueueJob, WorkflowContext, WEBSOCKET_MESSAGE_TRIGGER_TYPE,
};

pub fn ingest_websocket_message(
    app: &AppHandle,
    record: &WebSocketMessageRecord,
    host: &str,
    path: &str,
    url: &str,
) {
    let Some(state) = app.try_state::<AutomationRuntimeState>() else {
        return;
    };

    let payload_text = String::from_utf8_lossy(&record.payload).to_string();
    let matches = {
        let inner = match state.0.lock() {
            Ok(inner) => inner,
            Err(_) => return,
        };
        let workflows = inner.workflows.clone();
        let settings = inner.settings.clone();

        workflows
            .into_iter()
            .filter(|workflow| {
                workflow.enabled && !inner.paused_workflow_ids.contains(&workflow.id)
            })
            .filter_map(|workflow| {
                let trigger = websocket_message_trigger_node(&workflow)?;
                if matches_websocket_trigger(
                    record,
                    host,
                    path,
                    url,
                    &payload_text,
                    &trigger.data.config,
                ) {
                    let cap = queue_cap_for_trigger(&trigger.data.config, &settings);
                    Some((workflow, trigger, cap))
                } else {
                    None
                }
            })
            .collect::<Vec<_>>()
    };

    if matches.is_empty() {
        return;
    }

    for (workflow, trigger_node, cap) in matches {
        let trigger_label = trigger_node
            .data
            .label
            .clone()
            .unwrap_or_else(|| "WebSocket Message".to_string());
        let job_id = Uuid::new_v4().to_string();
        let trigger_node_id = trigger_node.id.clone();
        let context =
            build_websocket_context(record, host, path, url, &payload_text, &trigger_node_id);

        {
            let mut inner = match state.0.lock() {
                Ok(inner) => inner,
                Err(_) => return,
            };
            enqueue_live_traffic_job_locked(
                &mut inner,
                QueueJob {
                    id: job_id,
                    workflow_id: workflow.id.clone(),
                    trigger_node_id: trigger_node_id.clone(),
                    trigger_node_label: trigger_label,
                    received_log_label: "Received WebSocket message".to_string(),
                    received_runtime_label: "WebSocket message".to_string(),
                    cap,
                    context,
                },
            );
        }

        emit_queue_stats(app, &state, &trigger_node_id);
    }

    schedule_live_traffic_queue(app.clone());
}

fn websocket_message_trigger_node(workflow: &AutomationWorkflow) -> Option<AutomationNode> {
    workflow
        .nodes
        .iter()
        .find(|node| {
            node_effective_type(node) == WEBSOCKET_MESSAGE_TRIGGER_TYPE
                && config_string(&node.data.config, "triggerType") == WEBSOCKET_MESSAGE_TRIGGER_TYPE
        })
        .cloned()
}

fn matches_websocket_trigger(
    record: &WebSocketMessageRecord,
    host: &str,
    path: &str,
    url: &str,
    payload_text: &str,
    config: &Value,
) -> bool {
    if config_string(config, "triggerType") != WEBSOCKET_MESSAGE_TRIGGER_TYPE {
        return false;
    }

    if !matches_direction(&record.direction, &config_string(config, "direction")) {
        return false;
    }

    if !matches_host_filter(host, &config_string(config, "host")) {
        return false;
    }

    matches_value_filter(
        &[payload_text, url, path],
        &config_string(config, "operator"),
        &config_string(config, "value"),
    )
}

fn matches_direction(direction: &WebSocketMessageDirection, filter: &str) -> bool {
    let filter = filter.trim();
    if filter.is_empty() {
        return true;
    }

    match direction {
        WebSocketMessageDirection::Inbound => filter.eq_ignore_ascii_case("sent"),
        WebSocketMessageDirection::Outbound => filter.eq_ignore_ascii_case("received"),
    }
}

fn matches_value_filter(haystacks: &[&str], operator: &str, value: &str) -> bool {
    let value = value.trim();
    if value.is_empty() {
        return true;
    }

    match operator {
        "equals" => haystacks
            .iter()
            .any(|haystack| haystack.eq_ignore_ascii_case(value)),
        "regex" => Regex::new(value)
            .map(|regex| haystacks.iter().any(|haystack| regex.is_match(haystack)))
            .unwrap_or(false),
        _ => {
            let value = value.to_ascii_lowercase();
            haystacks
                .iter()
                .any(|haystack| haystack.to_ascii_lowercase().contains(&value))
        }
    }
}

fn matches_host_filter(host: &str, filter: &str) -> bool {
    let patterns = filter
        .split([',', ';', ' ', '\n', '\t'])
        .map(normalize_host_pattern)
        .filter(|pattern| !pattern.is_empty())
        .collect::<Vec<_>>();
    if patterns.is_empty() {
        return false;
    }

    let host = normalize_host_pattern(host);
    patterns
        .iter()
        .any(|pattern| host == *pattern || host.ends_with(&format!(".{}", pattern)))
}

fn normalize_host_pattern(value: &str) -> String {
    let trimmed = value.trim().trim_start_matches("*.").to_ascii_lowercase();
    if trimmed.is_empty() {
        return String::new();
    }
    let candidate = if trimmed.contains("://") {
        url::Url::parse(&trimmed)
            .ok()
            .and_then(|url| url.host_str().map(str::to_string))
            .unwrap_or(trimmed)
    } else {
        trimmed
    };
    candidate
        .split('/')
        .next()
        .unwrap_or_default()
        .split(':')
        .next()
        .unwrap_or_default()
        .trim()
        .to_string()
}

fn queue_cap_for_trigger(config: &Value, settings: &AutomationRuntimeSettings) -> usize {
    if config_string(config, "value").trim().is_empty() {
        settings.catch_all_trigger_queue_cap
    } else {
        settings.filtered_trigger_queue_cap
    }
}

fn build_websocket_context(
    record: &WebSocketMessageRecord,
    host: &str,
    path: &str,
    url: &str,
    payload_text: &str,
    trigger_node_id: &str,
) -> WorkflowContext {
    let parsed_payload = serde_json::from_str::<Value>(payload_text).ok();
    WorkflowContext {
        trigger_type: Some(WEBSOCKET_MESSAGE_TRIGGER_TYPE.to_string()),
        trigger_node_id: Some(trigger_node_id.to_string()),
        data: json!({
            "triggerType": WEBSOCKET_MESSAGE_TRIGGER_TYPE,
            "triggerNodeId": trigger_node_id,
            "messageId": record.id.to_string(),
            "connectionId": record.connection_id.to_string(),
            "timestamp": record.timestamp.to_rfc3339(),
            "url": url,
            "path": path,
            "host": normalize_host_pattern(host),
            "direction": direction_label(&record.direction),
            "messageType": message_type_label(&record.message_type),
            "message": payload_text,
            "payloadSize": record.payload_size,
            "data": parsed_payload,
        }),
    }
}

fn direction_label(direction: &WebSocketMessageDirection) -> &'static str {
    match direction {
        WebSocketMessageDirection::Inbound => "sent",
        WebSocketMessageDirection::Outbound => "received",
    }
}

fn message_type_label(message_type: &WebSocketMessageType) -> &'static str {
    match message_type {
        WebSocketMessageType::Text => "text",
        WebSocketMessageType::Binary => "binary",
        WebSocketMessageType::Ping => "ping",
        WebSocketMessageType::Pong => "pong",
        WebSocketMessageType::Close => "close",
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;

    fn message(direction: WebSocketMessageDirection, payload: &str) -> WebSocketMessageRecord {
        WebSocketMessageRecord {
            id: Uuid::new_v4(),
            connection_id: Uuid::new_v4(),
            timestamp: Utc::now(),
            direction,
            message_type: WebSocketMessageType::Text,
            payload: payload.as_bytes().to_vec(),
            payload_size: payload.len(),
        }
    }

    #[test]
    fn requires_host_whitelist_and_matches_subdomains() {
        let record = message(WebSocketMessageDirection::Inbound, r#"{"type":"auth"}"#);
        let config = json!({
            "triggerType": WEBSOCKET_MESSAGE_TRIGGER_TYPE,
            "host": "example.com",
            "direction": "sent",
            "operator": "contains",
            "value": "auth",
        });

        assert!(matches_websocket_trigger(
            &record,
            "api.example.com",
            "/socket",
            "wss://api.example.com/socket",
            r#"{"type":"auth"}"#,
            &config,
        ));
        assert!(!matches_websocket_trigger(
            &record,
            "other.test",
            "/socket",
            "wss://other.test/socket",
            r#"{"type":"auth"}"#,
            &config,
        ));
    }

    #[test]
    fn matches_received_direction() {
        let record = message(WebSocketMessageDirection::Outbound, "ready");
        let config = json!({
            "triggerType": WEBSOCKET_MESSAGE_TRIGGER_TYPE,
            "host": "example.com",
            "direction": "received",
        });

        assert!(matches_websocket_trigger(
            &record,
            "example.com",
            "/socket",
            "wss://example.com/socket",
            "ready",
            &config,
        ));
    }
}
