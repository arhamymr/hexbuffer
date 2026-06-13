use chrono::Utc;
use regex::Regex;
use serde_json::{json, Value};
use tauri::{AppHandle, Manager};
use uuid::Uuid;

use crate::proxy::state::PausedRequest;

use super::execution::run_workflow_task;
use super::state::AutomationRuntimeState;
use super::types::{
    config_string, node_effective_type, AutomationNode, AutomationWorkflow, WorkflowContext,
    INTERCEPT_REQUEST_TRIGGER_TYPE,
};

pub fn ingest_intercept_paused_request(app: &AppHandle, paused_request: &PausedRequest) {
    if paused_request.response.is_some() {
        return;
    }

    let Some(state) = app.try_state::<AutomationRuntimeState>() else {
        return;
    };

    let url_parts = request_url_parts(paused_request);
    let matches = {
        let inner = match state.0.lock() {
            Ok(inner) => inner,
            Err(_) => return,
        };
        inner
            .workflows
            .iter()
            .filter(|workflow| {
                workflow.enabled
                    && !inner.paused_workflow_ids.contains(&workflow.id)
                    && !inner.running_workflow_ids.contains(&workflow.id)
            })
            .filter_map(|workflow| {
                let trigger = intercept_request_trigger_node(workflow)?;
                if matches_intercept_trigger(paused_request, &url_parts, &trigger.data.config) {
                    Some((workflow.clone(), trigger))
                } else {
                    None
                }
            })
            .collect::<Vec<_>>()
    };

    for (workflow, trigger_node) in matches {
        let run_token = Uuid::new_v4().to_string();
        {
            let mut inner = match state.0.lock() {
                Ok(inner) => inner,
                Err(_) => return,
            };
            inner
                .active_run_token_by_workflow_id
                .insert(workflow.id.clone(), run_token.clone());
        }

        let body = String::from_utf8_lossy(&paused_request.request.body).to_string();
        let context = WorkflowContext {
            trigger_type: Some(INTERCEPT_REQUEST_TRIGGER_TYPE.to_string()),
            trigger_node_id: Some(trigger_node.id.clone()),
            data: json!({
                "triggerType": INTERCEPT_REQUEST_TRIGGER_TYPE,
                "triggerNodeId": trigger_node.id,
                "interceptId": paused_request.id.to_string(),
                "tabId": paused_request.tab_id,
                "url": url_parts.full,
                "path": url_parts.path,
                "host": url_parts.host,
                "method": paused_request.request.method,
                "headers": paused_request.request.headers,
                "body": body,
                "clientAddr": paused_request.client_addr,
                "serverAddr": paused_request.server_addr,
                "timestamp": Utc::now().to_rfc3339(),
            }),
        };
        let app_for_task = app.clone();
        tauri::async_runtime::spawn(async move {
            run_workflow_task(app_for_task, workflow, context, false, run_token).await;
        });
    }
}

#[derive(Debug, Clone)]
struct UrlParts {
    host: String,
    full: String,
    path: String,
}

fn intercept_request_trigger_node(workflow: &AutomationWorkflow) -> Option<AutomationNode> {
    workflow
        .nodes
        .iter()
        .find(|node| {
            node_effective_type(node) == INTERCEPT_REQUEST_TRIGGER_TYPE
                && config_string(&node.data.config, "triggerType") == INTERCEPT_REQUEST_TRIGGER_TYPE
        })
        .cloned()
}

fn matches_intercept_trigger(
    paused_request: &PausedRequest,
    url_parts: &UrlParts,
    config: &Value,
) -> bool {
    let method = config_string(config, "method");
    if !method.trim().is_empty()
        && !method.eq_ignore_ascii_case("ANY")
        && !method.eq_ignore_ascii_case(&paused_request.request.method)
    {
        return false;
    }

    if !matches_host_filter(&url_parts.host, &config_string(config, "host")) {
        return false;
    }

    matches_url_filter(
        &url_parts.full,
        &url_parts.path,
        &config_string(config, "operator"),
        &config_string(config, "value"),
    )
}

fn request_url_parts(paused_request: &PausedRequest) -> UrlParts {
    let uri = paused_request.request.uri.as_str();
    let parsed = if uri.starts_with("http://") || uri.starts_with("https://") {
        url::Url::parse(uri).ok()
    } else {
        let host = header_value(&paused_request.request.headers, "host")
            .unwrap_or_else(|| paused_request.server_addr.clone());
        url::Url::parse(&format!("https://{}{}", host, if uri.starts_with('/') { uri } else { "/" })).ok()
    };

    if let Some(parsed) = parsed {
        let path = format!(
            "{}{}",
            parsed.path(),
            parsed
                .query()
                .map(|query| format!("?{}", query))
                .unwrap_or_default()
        );
        return UrlParts {
            host: parsed.host_str().unwrap_or_default().to_ascii_lowercase(),
            full: parsed.to_string(),
            path,
        };
    }

    UrlParts {
        host: normalize_host_pattern(
            &header_value(&paused_request.request.headers, "host")
                .unwrap_or_else(|| paused_request.server_addr.clone()),
        ),
        full: uri.to_string(),
        path: uri.to_string(),
    }
}

fn header_value(headers: &std::collections::HashMap<String, String>, name: &str) -> Option<String> {
    headers
        .iter()
        .find(|(key, _)| key.eq_ignore_ascii_case(name))
        .map(|(_, value)| value.clone())
}

fn matches_url_filter(full_url: &str, path: &str, operator: &str, value: &str) -> bool {
    let value = value.trim();
    if value.is_empty() {
        return true;
    }
    let haystacks = [full_url, path];
    match operator {
        "equals" => haystacks.iter().any(|haystack| haystack.eq_ignore_ascii_case(value)),
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
        return true;
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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::proxy::state::ProxyRequest;
    use std::collections::HashMap;

    fn paused(method: &str, uri: &str) -> PausedRequest {
        let mut headers = HashMap::new();
        headers.insert("Host".to_string(), "api.example.com".to_string());
        PausedRequest {
            id: Uuid::new_v4(),
            timestamp: Utc::now(),
            client_addr: "127.0.0.1:1234".to_string(),
            server_addr: "api.example.com".to_string(),
            tab_id: Some("tab-1".to_string()),
            request: ProxyRequest {
                method: method.to_string(),
                uri: uri.to_string(),
                http_version: "HTTP/1.1".to_string(),
                headers,
                body: b"body".to_vec(),
                content_decoded: true,
            },
            response: None,
        }
    }

    #[test]
    fn matches_method_host_and_path() {
        let request = paused("POST", "https://api.example.com/login");
        let parts = request_url_parts(&request);
        let config = json!({
            "triggerType": INTERCEPT_REQUEST_TRIGGER_TYPE,
            "method": "POST",
            "host": "example.com",
            "operator": "contains",
            "value": "/login",
        });

        assert!(matches_intercept_trigger(&request, &parts, &config));
    }

    #[test]
    fn rejects_non_matching_method() {
        let request = paused("GET", "https://api.example.com/login");
        let parts = request_url_parts(&request);
        let config = json!({
            "triggerType": INTERCEPT_REQUEST_TRIGGER_TYPE,
            "method": "POST",
        });

        assert!(!matches_intercept_trigger(&request, &parts, &config));
    }
}
