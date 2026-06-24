use regex::Regex;
use serde_json::{json, Value};
use tauri::{AppHandle, Manager};
use uuid::Uuid;

use crate::browser::crawl_types::CrawlPage;

use super::events::emit_queue_stats;
use super::live_traffic::schedule_live_traffic_queue;
use super::state::{enqueue_live_traffic_job_locked, AutomationRuntimeState};
use super::types::{
    config_string, node_effective_type, AutomationNode, AutomationRuntimeSettings,
    AutomationWorkflow, QueueJob, WorkflowContext, BROWSER_PAGE_CRAWLED_TRIGGER_TYPE,
};

pub fn ingest_crawled_page(app: &AppHandle, page: &CrawlPage) {
    let Some(state) = app.try_state::<AutomationRuntimeState>() else {
        return;
    };

    let parts = UrlParts::from_url(&page.url);
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
                let trigger = page_crawled_trigger_node(&workflow)?;
                if matches_page_crawled_trigger(page, &parts, &trigger.data.config) {
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
            .unwrap_or_else(|| "Page Crawled".to_string());
        let job_id = Uuid::new_v4().to_string();
        let context = build_page_context(page, &parts, &trigger_node.id);
        let trigger_node_id = trigger_node.id.clone();

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
                    received_log_label: "Received crawled page".to_string(),
                    received_runtime_label: "Page crawled".to_string(),
                    cap,
                    context,
                },
            );
        }

        emit_queue_stats(app, &state, &trigger_node_id);
    }

    schedule_live_traffic_queue(app.clone());
}

fn page_crawled_trigger_node(workflow: &AutomationWorkflow) -> Option<AutomationNode> {
    workflow
        .nodes
        .iter()
        .find(|node| {
            node_effective_type(node) == BROWSER_PAGE_CRAWLED_TRIGGER_TYPE
                && config_string(&node.data.config, "triggerType")
                    == BROWSER_PAGE_CRAWLED_TRIGGER_TYPE
        })
        .cloned()
}

fn matches_page_crawled_trigger(page: &CrawlPage, parts: &UrlParts, config: &Value) -> bool {
    if config_string(config, "triggerType") != BROWSER_PAGE_CRAWLED_TRIGGER_TYPE {
        return false;
    }

    if !matches_host_filter(&parts.host, &config_string(config, "host")) {
        return false;
    }

    matches_value_filter(
        &[page.url.as_str(), parts.path.as_str()],
        &config_string(config, "operator"),
        &config_string(config, "value"),
    )
}

#[derive(Debug, Clone)]
struct UrlParts {
    host: String,
    path: String,
}

impl UrlParts {
    fn from_url(url: &str) -> Self {
        if let Ok(parsed) = url::Url::parse(url) {
            let path = format!(
                "{}{}",
                parsed.path(),
                parsed
                    .query()
                    .map(|query| format!("?{}", query))
                    .unwrap_or_default()
            );
            return Self {
                host: parsed.host_str().unwrap_or_default().to_ascii_lowercase(),
                path,
            };
        }

        Self {
            host: normalize_host_pattern(url),
            path: url.to_string(),
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
    let has_host = !config_string(config, "host").trim().is_empty();
    let has_value = !config_string(config, "value").trim().is_empty();
    if has_host || has_value {
        settings.filtered_trigger_queue_cap
    } else {
        settings.catch_all_trigger_queue_cap
    }
}

fn build_page_context(
    page: &CrawlPage,
    parts: &UrlParts,
    trigger_node_id: &str,
) -> WorkflowContext {
    WorkflowContext {
        trigger_type: Some(BROWSER_PAGE_CRAWLED_TRIGGER_TYPE.to_string()),
        trigger_node_id: Some(trigger_node_id.to_string()),
        data: json!({
            "triggerType": BROWSER_PAGE_CRAWLED_TRIGGER_TYPE,
            "triggerNodeId": trigger_node_id,
            "crawlId": page.session_id,
            "pageId": page.id,
            "url": page.url,
            "path": parts.path,
            "host": parts.host,
            "title": page.title,
            "status": page.status,
            "statusCode": page.http_status,
            "depth": page.depth,
            "parentUrl": page.parent_url,
            "linksFound": page.links_found,
            "formsFound": page.forms_found,
            "interesting": page.interesting,
            "aiSummary": page.ai_summary,
            "screenshotPath": page.screenshot_path,
            "renderedHtmlPath": page.rendered_html_path,
            "discoveredAt": page.discovered_at,
            "visitedAt": page.visited_at,
            "timestamp": page.visited_at.as_deref().unwrap_or(page.discovered_at.as_str()),
        }),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn page(url: &str, status: &str) -> CrawlPage {
        CrawlPage {
            id: "page-1".to_string(),
            session_id: "crawl-1".to_string(),
            url: url.to_string(),
            title: Some("Example".to_string()),
            status: status.to_string(),
            depth: 1,
            parent_url: None,
            http_status: Some(200),
            links_found: 3,
            forms_found: 1,
            discovered_at: "2026-06-13T00:00:00Z".to_string(),
            visited_at: Some("2026-06-13T00:00:01Z".to_string()),
            ai_summary: None,
            ai_used_for_analysis: None,
            interesting: Some(false),
            screenshot_path: None,
            rendered_html_path: None,
        }
    }

    #[test]
    fn matches_host_and_path_filters() {
        let page = page("https://docs.example.com/admin/login?next=1", "visited");
        let parts = UrlParts::from_url(&page.url);
        let config = json!({
            "triggerType": BROWSER_PAGE_CRAWLED_TRIGGER_TYPE,
            "host": "example.com",
            "operator": "contains",
            "value": "/admin/login",
        });

        assert!(matches_page_crawled_trigger(&page, &parts, &config));
    }

    #[test]
    fn blank_filters_match_all_pages() {
        let page = page("https://example.com/docs", "visited");
        let parts = UrlParts::from_url(&page.url);
        let config = json!({
            "triggerType": BROWSER_PAGE_CRAWLED_TRIGGER_TYPE,
            "host": "",
            "operator": "contains",
            "value": "",
        });

        assert!(matches_page_crawled_trigger(&page, &parts, &config));
    }
}
