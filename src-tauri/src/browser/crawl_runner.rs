use super::crawl_helpers::{add_log, now, persist_insight, persist_page, upsert_page_memory};
use super::crawl_types::{AIInsight, ActivityLog, AiBrowserState, CrawlConfig, CrawlPage};
use browser_crawler::{Browser, RenderMode};
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc,
};
use std::time::Duration;
use tauri::{AppHandle, Emitter};
use uuid::Uuid;

fn page_id() -> String {
    format!("page-{}", Uuid::new_v4())
}

pub(crate) async fn run_browser_crawler_crawl(
    app: AppHandle,
    state: AiBrowserState,
    config: CrawlConfig,
    session_id: String,
    _worker_id: String,
    cancel_flag: Arc<AtomicBool>,
) -> Result<(), String> {
    if cancel_flag.load(Ordering::SeqCst) {
        return Ok(());
    }

    add_log(
        &app,
        &state,
        ActivityLog {
            id: Uuid::new_v4().to_string(),
            session_id: session_id.clone(),
            level: "info".to_string(),
            r#type: "session".to_string(),
            message: format!("Initializing browser-crawler engine for {}", config.target_url),
            url: Some(config.target_url.clone()),
            ai_used_for_analysis: Some(false),
            created_at: now(),
            extra: None,
            human_input_request: None,
        },
    );

    let app_cb = app.clone();
    let state_cb = state.clone();
    let session_id_cb = session_id.clone();
    let cancel_flag_cb = cancel_flag.clone();
    let enable_ai_insights = config.enable_ai_insights;

    let render_mode = if config.headless {
        RenderMode::Dynamic
    } else {
        RenderMode::Static
    };

    let timeout = if config.timeout_ms > 0 {
        Duration::from_millis(config.timeout_ms)
    } else {
        Duration::from_secs(15)
    };

    let browser_result = Browser::builder()
        .start_url(&config.target_url)
        .max_depth(config.max_depth as usize)
        .render_mode(render_mode)
        .stealth(true)
        .render_timeout(timeout)
        .on_page(move |page_ir| {
            let app = app_cb.clone();
            let state = state_cb.clone();
            let session_id = session_id_cb.clone();
            let cancel_flag = cancel_flag_cb.clone();

            async move {
                if cancel_flag.load(Ordering::SeqCst) {
                    return Ok(());
                }

                let pid = page_id();
                let current_now = now();
                let is_interesting = page_ir.markdown_ir.contains("# ")
                    || page_ir.markdown_ir.contains("api")
                    || page_ir.markdown_ir.contains("login")
                    || page_ir.markdown_ir.contains("auth");

                let summary = if page_ir.markdown_ir.len() > 300 {
                    format!("{}...", &page_ir.markdown_ir[..300])
                } else {
                    page_ir.markdown_ir.clone()
                };

                let page = CrawlPage {
                    id: pid.clone(),
                    session_id: session_id.clone(),
                    url: page_ir.url.clone(),
                    title: if page_ir.title.is_empty() {
                        None
                    } else {
                        Some(page_ir.title.clone())
                    },
                    status: "visited".to_string(),
                    depth: 0,
                    parent_url: None,
                    http_status: Some(200),
                    links_found: 0,
                    forms_found: 0,
                    discovered_at: current_now.clone(),
                    visited_at: Some(current_now.clone()),
                    ai_summary: Some(summary),
                    ai_used_for_analysis: Some(false),
                    interesting: Some(is_interesting),
                    screenshot_path: None,
                    rendered_html_path: None,
                };

                upsert_page_memory(&state, page.clone());
                persist_page(&app, &page);
                let _ = app.emit("ai-browser:page-discovered", &page);
                let _ = app.emit("ai-browser:page-updated", &page);
                crate::automation::ingest_crawled_page(&app, &page);

                add_log(
                    &app,
                    &state,
                    ActivityLog {
                        id: Uuid::new_v4().to_string(),
                        session_id: session_id.clone(),
                        level: "info".to_string(),
                        r#type: "result".to_string(),
                        message: format!(
                            "Crawled page: {} ({})",
                            page_ir.url,
                            if page_ir.title.is_empty() {
                                "No Title"
                            } else {
                                &page_ir.title
                            }
                        ),
                        url: Some(page_ir.url.clone()),
                        ai_used_for_analysis: Some(false),
                        created_at: current_now.clone(),
                        extra: None,
                        human_input_request: None,
                    },
                );

                if enable_ai_insights && is_interesting {
                    let insight = AIInsight {
                        id: Uuid::new_v4().to_string(),
                        session_id: session_id.clone(),
                        page_id: Some(pid),
                        severity: "info".to_string(),
                        r#type: "interesting-page".to_string(),
                        title: format!("Discovered Content: {}", page_ir.url),
                        description: format!(
                            "Extracted Page IR Title: {}",
                            if page_ir.title.is_empty() {
                                &page_ir.url
                            } else {
                                &page_ir.title
                            }
                        ),
                        url: Some(page_ir.url.clone()),
                        ai_used_for_analysis: Some(false),
                        analysis_source: Some("browser-crawler".to_string()),
                        analysis_tool_id: None,
                        analysis_tool_name: None,
                        reviewed: false,
                        created_at: current_now,
                    };
                    if let Ok(mut insights) = state.insights.lock() {
                        insights
                            .entry(insight.session_id.clone())
                            .or_default()
                            .push(insight.clone());
                    }
                    persist_insight(&app, &insight);
                    let _ = app.emit("ai-browser:insight-created", insight);
                }

                Ok(())
            }
        })
        .build();

    let browser = match browser_result {
        Ok(b) => b,
        Err(err) => return Err(format!("Failed to build browser-crawler instance: {}", err)),
    };

    if cancel_flag.load(Ordering::SeqCst) {
        return Ok(());
    }

    let summary = browser.run().await?;

    add_log(
        &app,
        &state,
        ActivityLog {
            id: Uuid::new_v4().to_string(),
            session_id: session_id.clone(),
            level: "info".to_string(),
            r#type: "session".to_string(),
            message: format!(
                "Completed crawl: {} pages processed, {} total IR bytes extracted",
                summary.pages_processed, summary.total_ir_bytes
            ),
            url: Some(config.target_url),
            ai_used_for_analysis: Some(false),
            created_at: now(),
            extra: None,
            human_input_request: None,
        },
    );

    Ok(())
}
