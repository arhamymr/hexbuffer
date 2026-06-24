use serde_json::json;
use tauri::{AppHandle, Manager};
use uuid::Uuid;

use crate::browser::crawl_types::{AIInsight, CrawlPage, CrawlSession};

use super::events::emit_queue_stats;
use super::live_traffic::schedule_live_traffic_queue;
use super::state::{enqueue_live_traffic_job_locked, AutomationRuntimeState};
use super::types::{
    config_string, node_effective_type, AutomationNode, AutomationWorkflow, QueueJob,
    WorkflowContext, SCAN_COMPLETED_TRIGGER_TYPE,
};

pub fn ingest_scan_completed(
    app: &AppHandle,
    session: &CrawlSession,
    pages: &[CrawlPage],
    insights: &[AIInsight],
) {
    let Some(state) = app.try_state::<AutomationRuntimeState>() else {
        return;
    };

    let matches = {
        let inner = match state.0.lock() {
            Ok(inner) => inner,
            Err(_) => return,
        };
        inner
            .workflows
            .clone()
            .into_iter()
            .filter(|workflow| {
                workflow.enabled && !inner.paused_workflow_ids.contains(&workflow.id)
            })
            .filter_map(|workflow| {
                let trigger = scan_completed_trigger_node(&workflow)?;
                Some((workflow, trigger, inner.settings.filtered_trigger_queue_cap))
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
            .unwrap_or_else(|| "Scan Completed".to_string());
        let trigger_node_id = trigger_node.id.clone();
        let context = build_scan_completed_context(session, pages, insights, &trigger_node_id);

        {
            let mut inner = match state.0.lock() {
                Ok(inner) => inner,
                Err(_) => return,
            };
            enqueue_live_traffic_job_locked(
                &mut inner,
                QueueJob {
                    id: Uuid::new_v4().to_string(),
                    workflow_id: workflow.id.clone(),
                    trigger_node_id: trigger_node_id.clone(),
                    trigger_node_label: trigger_label,
                    received_log_label: "Received completed scan".to_string(),
                    received_runtime_label: "Scan completed".to_string(),
                    cap,
                    context,
                },
            );
        }

        emit_queue_stats(app, &state, &trigger_node_id);
    }

    schedule_live_traffic_queue(app.clone());
}

fn scan_completed_trigger_node(workflow: &AutomationWorkflow) -> Option<AutomationNode> {
    workflow
        .nodes
        .iter()
        .find(|node| {
            node_effective_type(node) == SCAN_COMPLETED_TRIGGER_TYPE
                && config_string(&node.data.config, "triggerType") == SCAN_COMPLETED_TRIGGER_TYPE
        })
        .cloned()
}

fn build_scan_completed_context(
    session: &CrawlSession,
    pages: &[CrawlPage],
    insights: &[AIInsight],
    trigger_node_id: &str,
) -> WorkflowContext {
    let page_urls = pages
        .iter()
        .filter(|page| page.status == "visited" || page.status == "interesting")
        .map(|page| page.url.clone())
        .collect::<Vec<_>>();
    let insight_titles = insights
        .iter()
        .map(|insight| format!("{}: {}", insight.severity, insight.title))
        .collect::<Vec<_>>();
    let host = url::Url::parse(&session.target_url)
        .ok()
        .and_then(|url| url.host_str().map(str::to_string))
        .unwrap_or_default();
    let finished_at = session.finished_at.clone().unwrap_or_default();

    WorkflowContext {
        trigger_type: Some(SCAN_COMPLETED_TRIGGER_TYPE.to_string()),
        trigger_node_id: Some(trigger_node_id.to_string()),
        data: json!({
            "triggerType": SCAN_COMPLETED_TRIGGER_TYPE,
            "triggerNodeId": trigger_node_id,
            "scanId": session.id,
            "crawlId": session.id,
            "targetUrl": session.target_url,
            "host": host,
            "status": session.status,
            "pagesVisited": page_urls.len(),
            "pagesTotal": pages.len(),
            "insightsFound": insights.len(),
            "pageUrls": page_urls,
            "insightTitles": insight_titles,
            "finishedAt": finished_at,
            "timestamp": finished_at,
        }),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn session() -> CrawlSession {
        CrawlSession {
            id: "crawl-1".to_string(),
            target_url: "https://example.com".to_string(),
            status: "completed".to_string(),
            strategy: "bfs".to_string(),
            max_depth: 2,
            max_pages: 10,
            started_at: Some("2026-06-13T00:00:00Z".to_string()),
            finished_at: Some("2026-06-13T00:01:00Z".to_string()),
        }
    }

    #[test]
    fn builds_compact_scan_summary() {
        let pages = vec![
            CrawlPage {
                id: "page-1".to_string(),
                session_id: "crawl-1".to_string(),
                url: "https://example.com/docs".to_string(),
                title: None,
                status: "visited".to_string(),
                depth: 1,
                parent_url: None,
                http_status: Some(200),
                links_found: 2,
                forms_found: 0,
                discovered_at: "2026-06-13T00:00:01Z".to_string(),
                visited_at: Some("2026-06-13T00:00:02Z".to_string()),
                ai_summary: None,
                ai_used_for_analysis: None,
                interesting: Some(false),
                screenshot_path: None,
                rendered_html_path: None,
            },
            CrawlPage {
                id: "page-2".to_string(),
                session_id: "crawl-1".to_string(),
                url: "https://example.com/queued".to_string(),
                title: None,
                status: "queued".to_string(),
                depth: 1,
                parent_url: None,
                http_status: None,
                links_found: 0,
                forms_found: 0,
                discovered_at: "2026-06-13T00:00:03Z".to_string(),
                visited_at: None,
                ai_summary: None,
                ai_used_for_analysis: None,
                interesting: Some(false),
                screenshot_path: None,
                rendered_html_path: None,
            },
        ];
        let context = build_scan_completed_context(&session(), &pages, &[], "trigger-1");

        assert_eq!(context.data["scanId"], "crawl-1");
        assert_eq!(context.data["host"], "example.com");
        assert_eq!(context.data["pagesVisited"], 1);
        assert_eq!(context.data["pagesTotal"], 2);
    }
}
