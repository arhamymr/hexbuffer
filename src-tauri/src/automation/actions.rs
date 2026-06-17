use std::{fs, time::Duration};

use base64::{engine::general_purpose, Engine};
use chrono::Utc;
use md5::Md5;
use regex::Regex;
use reqwest::Method;
use serde_json::{json, Value};
use sha1::Sha1;
use sha2::{Digest, Sha256, Sha512};
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_notification::NotificationExt;
use tokio::net::TcpStream;
use tokio::process::Command as TokioCommand;
use uuid::Uuid;

use crate::{db::repository::DocumentRecord, history::HistoryBridge};

use super::condition::value_to_string;
use super::state::AutomationRuntimeState;
use super::types::AutomationNode;

pub(crate) async fn execute_runtime_action(
    app: &AppHandle,
    workflow_id: &str,
    node: &AutomationNode,
    input_data: &Value,
) -> Option<Result<Value, String>> {
    let action_type = node
        .data
        .config
        .get("actionType")
        .and_then(Value::as_str)
        .unwrap_or_default();

    match action_type {
        "action:add-to-report" => Some(execute_add_to_report(app, node, input_data)),
        "action:send-to-repeater" => Some(execute_ui_action(
            app,
            workflow_id,
            node,
            input_data,
            action_type,
        )),
        "action:create-finding" => Some(execute_create_finding(app, node, input_data)),
        "action:send-webhook" => Some(execute_send_webhook(node, input_data).await),
        "action:show-notification" => Some(execute_show_notification(app, node, input_data)),
        "action:run-script" => Some(execute_run_script(app, node, input_data).await),
        "action:start-crawl" => Some(execute_start_crawl(app, node, input_data).await),
        "action:stop-crawl" => Some(execute_stop_crawl(app, node, input_data).await),
        "action:send-to-intercept" => Some(execute_ui_action(
            app,
            workflow_id,
            node,
            input_data,
            action_type,
        )),
        "action:start-invoker" => Some(execute_ui_action(
            app,
            workflow_id,
            node,
            input_data,
            action_type,
        )),
        "action:port-scan" => Some(execute_port_scan(node, input_data).await),
        "action:encode-decode" => Some(execute_encode_decode(node, input_data)),
        "action:hash-data" => Some(execute_hash_data(node, input_data)),
        "action:export-json" => Some(execute_export_json(app, node, input_data)),
        "action:create-document" => Some(execute_create_document(app, node, input_data)),
        "action:add-to-document" => Some(execute_add_to_document(app, node, input_data)),
        "action:ai-analyze" => Some(execute_ai_analyze(app, node, input_data).await),
        "action:script-analyze" => Some(execute_script_analyze(node, input_data)),
        _ => None,
    }
}

pub(crate) fn execute_add_to_report(
    app: &AppHandle,
    node: &AutomationNode,
    input_data: &Value,
) -> Result<Value, String> {
    let Some(history) = app.try_state::<HistoryBridge>() else {
        return Err("Document storage is unavailable".to_string());
    };
    let params = node
        .data
        .config
        .get("params")
        .cloned()
        .unwrap_or_else(|| json!({}));
    let content = resolve_template(
        params
            .get("content")
            .and_then(Value::as_str)
            .unwrap_or("(no content)"),
        input_data,
    );
    if content.trim().is_empty() {
        return Ok(json!({ "skipped": true, "reason": "empty content" }));
    }
    let title = resolve_template(
        params
            .get("title")
            .and_then(Value::as_str)
            .unwrap_or("Workflow Report"),
        input_data,
    );
    let section_key = params
        .get("section")
        .and_then(Value::as_str)
        .filter(|value| !value.trim().is_empty())
        .unwrap_or("automation-output")
        .to_string();
    let document_id = params
        .get("documentId")
        .and_then(Value::as_str)
        .filter(|value| !value.trim().is_empty())
        .map(str::to_string);
    let mode = params
        .get("mode")
        .and_then(Value::as_str)
        .unwrap_or("append");

    let mut documents = history.get_documents()?;
    let target_index = document_id
        .as_ref()
        .and_then(|id| documents.iter().position(|document| &document.id == id));
    let mut document = if let Some(index) = target_index {
        documents.remove(index)
    } else if let Some(document) = documents.into_iter().next() {
        document
    } else {
        let now = Utc::now().to_rfc3339();
        DocumentRecord {
            id: Uuid::new_v4().to_string(),
            name: "Document 1".to_string(),
            title: "Automation Output".to_string(),
            sections: json!({}),
            custom_sections: json!([]),
            removed_built_in_sections: json!([]),
            api_entries: json!([]),
            created_at: now.clone(),
            updated_at: now,
        }
    };

    let mut sections = document
        .custom_sections
        .as_array()
        .cloned()
        .unwrap_or_default();
    let existing_index = sections.iter().position(|section| {
        section.get("key").and_then(Value::as_str) == Some(section_key.as_str())
    });
    if let Some(index) = existing_index {
        let existing_content = sections[index]
            .get("content")
            .and_then(Value::as_str)
            .unwrap_or_default();
        let next_content = if mode == "replace" {
            content.clone()
        } else {
            format!("{}\n\n{}", existing_content, content)
                .trim()
                .to_string()
        };
        if let Some(section) = sections[index].as_object_mut() {
            section.insert("content".to_string(), Value::String(next_content));
        }
    } else {
        sections.push(json!({
            "key": section_key,
            "title": if title.trim().is_empty() {
                section_key.as_str()
            } else {
                title.as_str()
            },
            "description": "Automation workflow output",
            "placeholder": "",
            "content": content,
        }));
    }

    document.custom_sections = Value::Array(sections);
    document.updated_at = Utc::now().to_rfc3339();
    history.save_document(&document)?;

    Ok(merge_action_output(
        input_data,
        json!({
            "type": "action:add-to-report",
            "status": "updated",
            "documentId": document.id,
            "section": section_key,
            "title": title,
            "mode": mode,
        }),
    ))
}

fn execute_ui_action(
    app: &AppHandle,
    workflow_id: &str,
    node: &AutomationNode,
    input_data: &Value,
    action_type: &str,
) -> Result<Value, String> {
    let params = action_params(node);
    let action_id = Uuid::new_v4().to_string();
    app.emit(
        "automation:action-ui",
        json!({
            "actionId": action_id,
            "workflowId": workflow_id,
            "nodeId": node.id,
            "actionType": action_type,
            "params": params,
            "inputData": input_data,
        }),
    )
    .map_err(|error| error.to_string())?;

    Ok(merge_action_output(
        input_data,
        json!({
            "type": action_type,
            "status": "emitted",
            "actionId": action_id,
        }),
    ))
}

async fn execute_send_webhook(node: &AutomationNode, input_data: &Value) -> Result<Value, String> {
    let params = action_params(node);
    let url = resolve_template(&param_string(&params, "url", ""), input_data);
    if url.trim().is_empty() {
        return Err("Webhook URL is required".to_string());
    }

    let method_name = param_string(&params, "method", "POST").to_uppercase();
    let method = Method::from_bytes(method_name.as_bytes()).map_err(|error| error.to_string())?;
    let mut request = reqwest::Client::new().request(method.clone(), url.trim());

    for (name, value) in parse_header_lines(&resolve_template(
        &param_string(&params, "headers", ""),
        input_data,
    )) {
        request = request.header(name, value);
    }

    let body_template = param_string(&params, "bodyTemplate", "");
    if method != Method::GET && method != Method::HEAD && !body_template.trim().is_empty() {
        request = request.body(resolve_template(&body_template, input_data));
    }

    let response = request.send().await.map_err(|error| error.to_string())?;
    let status = response.status().as_u16();
    let final_url = response.url().to_string();
    let response_text = response.text().await.map_err(|error| error.to_string())?;
    let response_preview = truncate_preview(&response_text, 4096);

    Ok(merge_action_output(
        input_data,
        json!({
            "type": "action:send-webhook",
            "status": status,
            "ok": (200..400).contains(&status),
            "url": final_url,
            "responsePreview": response_preview,
        }),
    ))
}

fn execute_create_document(
    app: &AppHandle,
    node: &AutomationNode,
    input_data: &Value,
) -> Result<Value, String> {
    let Some(history) = app.try_state::<HistoryBridge>() else {
        return Err("Document storage is unavailable".to_string());
    };
    let params = action_params(node);
    let title = resolve_template(
        &param_string(&params, "title", "Automation Document"),
        input_data,
    );
    let template = param_string(&params, "template", "blank");
    let now = Utc::now().to_rfc3339();
    let document = DocumentRecord {
        id: Uuid::new_v4().to_string(),
        name: title.clone(),
        title: title.clone(),
        sections: json!({}),
        custom_sections: json!([]),
        removed_built_in_sections: json!([]),
        api_entries: json!([]),
        created_at: now.clone(),
        updated_at: now,
    };

    history.save_document(&document)?;

    Ok(merge_action_output(
        input_data,
        json!({
            "type": "action:create-document",
            "status": "created",
            "documentId": document.id,
            "title": title,
            "template": template,
        }),
    ))
}

fn execute_add_to_document(
    app: &AppHandle,
    node: &AutomationNode,
    input_data: &Value,
) -> Result<Value, String> {
    let params = action_params(node);
    let document_id = params
        .get("documentId")
        .and_then(Value::as_str)
        .filter(|value| !value.trim().is_empty())
        .map(str::to_string);
    let section_key = param_string(&params, "section", "automation-output");
    let content = resolve_template(&param_string(&params, "content", ""), input_data);
    if content.trim().is_empty() {
        return Err("Document content is required".to_string());
    }

    let document = upsert_document_section(
        app,
        document_id,
        "Automation Document",
        &section_key,
        &section_key,
        &content,
        "append",
        "Automation workflow output",
    )?;

    Ok(merge_action_output(
        input_data,
        json!({
            "type": "action:add-to-document",
            "status": "updated",
            "documentId": document.id,
            "section": section_key,
        }),
    ))
}

fn execute_create_finding(
    app: &AppHandle,
    node: &AutomationNode,
    input_data: &Value,
) -> Result<Value, String> {
    let params = action_params(node);
    let title = resolve_template(
        &param_string(&params, "title", "Automation Finding"),
        input_data,
    );
    if title.trim().is_empty() {
        return Err("Finding title is required".to_string());
    }
    let severity = param_string(&params, "severity", "medium");
    let description = resolve_template(&param_string(&params, "description", ""), input_data);
    let evidence_source = param_string(&params, "evidenceSource", "payload");
    let evidence = resolve_source_value(input_data, &evidence_source);
    let finding_id = Uuid::new_v4().to_string();
    let content = format!(
        "### {}\n\n- Severity: {}\n- Finding ID: {}\n\n{}\n\n#### Evidence\n\n```text\n{}\n```",
        title,
        severity,
        finding_id,
        if description.trim().is_empty() {
            "(no description)"
        } else {
            description.as_str()
        },
        truncate_preview(&evidence, 8192),
    );

    let document = upsert_document_section(
        app,
        None,
        "Automation Findings",
        "automation-findings",
        "Automation Findings",
        &content,
        "append",
        "Findings created by automation workflows",
    )?;

    Ok(merge_action_output(
        input_data,
        json!({
            "type": "action:create-finding",
            "status": "created",
            "findingId": finding_id,
            "severity": severity,
            "documentId": document.id,
            "section": "automation-findings",
        }),
    ))
}

fn execute_show_notification(
    app: &AppHandle,
    node: &AutomationNode,
    input_data: &Value,
) -> Result<Value, String> {
    let params = action_params(node);
    let title = resolve_template(
        param_string(&params, "title", "Workflow Alert").as_str(),
        input_data,
    );
    let body = resolve_template(param_string(&params, "body", "").as_str(), input_data);
    app.notification()
        .builder()
        .title(if title.trim().is_empty() {
            "Workflow Alert"
        } else {
            title.as_str()
        })
        .body(body.clone())
        .show()
        .map_err(|error| error.to_string())?;

    Ok(merge_action_output(
        input_data,
        json!({
            "notified": true,
            "level": param_string(&params, "level", "info"),
            "title": title,
            "body": body,
        }),
    ))
}

async fn execute_run_script(
    app: &AppHandle,
    node: &AutomationNode,
    input_data: &Value,
) -> Result<Value, String> {
    if !run_script_actions_allowed(app) {
        return Err(
            "Run-script actions are disabled. Enable them in Automation Settings first."
                .to_string(),
        );
    }

    let params = action_params(node);
    let command = resolve_template(&param_string(&params, "command", ""), input_data);
    if command.trim().is_empty() {
        return Err("Command is required".to_string());
    }
    let timeout_seconds = param_string(&params, "timeoutSeconds", "30")
        .parse::<u64>()
        .unwrap_or(30)
        .clamp(1, 300);

    #[cfg(target_os = "windows")]
    let mut child_command = {
        let mut command_builder = TokioCommand::new("cmd");
        command_builder.args(["/C", command.as_str()]);
        command_builder
    };
    #[cfg(not(target_os = "windows"))]
    let mut child_command = {
        let mut command_builder = TokioCommand::new("sh");
        command_builder.args(["-c", command.as_str()]);
        command_builder
    };

    let working_directory =
        resolve_template(&param_string(&params, "workingDirectory", ""), input_data);
    if !working_directory.trim().is_empty() {
        child_command.current_dir(working_directory.trim());
    }
    child_command.kill_on_drop(true);

    let output = tokio::time::timeout(Duration::from_secs(timeout_seconds), child_command.output())
        .await
        .map_err(|_| format!("Command timed out after {} seconds", timeout_seconds))?
        .map_err(|error| error.to_string())?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    Ok(merge_action_output(
        input_data,
        json!({
            "type": "action:run-script",
            "status": if output.status.success() { "completed" } else { "failed" },
            "exitCode": output.status.code(),
            "stdoutPreview": truncate_preview(&stdout, 4096),
            "stderrPreview": truncate_preview(&stderr, 4096),
            "timeoutSeconds": timeout_seconds,
        }),
    ))
}

async fn execute_start_crawl(
    app: &AppHandle,
    node: &AutomationNode,
    input_data: &Value,
) -> Result<Value, String> {
    let Some(state) = app.try_state::<crate::commands::browser::AiBrowserState>() else {
        return Err("Browser crawl runtime is unavailable".to_string());
    };
    let params = action_params(node);
    let target_url = resolve_template(
        &param_string(&params, "url", &resolve_source_value(input_data, "url")),
        input_data,
    );
    if target_url.trim().is_empty() {
        return Err("Crawl URL is required".to_string());
    }
    let max_depth = param_string(&params, "maxDepth", "3")
        .parse::<u32>()
        .unwrap_or(3)
        .clamp(1, 10);
    let scope = param_string(&params, "scope", "same-host");
    let session_id = format!("automation-crawl-{}", Uuid::new_v4());
    let config = crate::commands::browser::CrawlConfig {
        target_url: target_url.clone(),
        strategy: Some("bfs".to_string()),
        max_depth,
        max_pages: 100,
        same_domain_only: scope != "all",
        exclude_paths: None,
        request_delay_ms: 250,
        timeout_ms: 30_000,
        enable_ai_insights: false,
        network_settle_ms: Some(500),
        capture_screenshots: false,
        capture_rendered_html: true,
        resume_from_url: None,
        human_input_fields: None,
        headless: true,
    };

    let session = crate::commands::browser::ai_browser_start_crawl(
        app.clone(),
        state,
        config,
        Some(session_id.clone()),
        Some(false),
    )
    .await?;

    Ok(merge_action_output(
        input_data,
        json!({
            "type": "action:start-crawl",
            "status": "started",
            "crawlId": session.id,
            "targetUrl": session.target_url,
            "maxDepth": session.max_depth,
        }),
    ))
}

async fn execute_stop_crawl(
    app: &AppHandle,
    node: &AutomationNode,
    input_data: &Value,
) -> Result<Value, String> {
    let Some(state) = app.try_state::<crate::commands::browser::AiBrowserState>() else {
        return Err("Browser crawl runtime is unavailable".to_string());
    };
    let params = action_params(node);
    let crawl_id = resolve_template(&param_string(&params, "crawlId", ""), input_data);
    if crawl_id.trim().is_empty() {
        return Err("Crawl ID is required".to_string());
    }
    crate::commands::browser::ai_browser_stop_crawl(app.clone(), state, crawl_id.clone()).await?;

    Ok(merge_action_output(
        input_data,
        json!({
            "type": "action:stop-crawl",
            "status": "stopped",
            "crawlId": crawl_id,
        }),
    ))
}

async fn execute_port_scan(node: &AutomationNode, input_data: &Value) -> Result<Value, String> {
    let params = action_params(node);
    let target = resolve_template(
        &param_string(&params, "target", &resolve_source_value(input_data, "host")),
        input_data,
    );
    let host = normalize_scan_host(&target)?;
    let ports = parse_port_scan_ports(
        &param_string(&params, "ports", ""),
        &param_string(&params, "preset", "web"),
    )?;
    let timeout_ms = 800_u64;
    let mut results = Vec::with_capacity(ports.len());
    for port in ports {
        let result = scan_port_once(&host, port, timeout_ms).await;
        results.push(result);
    }
    let open_ports: Vec<Value> = results
        .iter()
        .filter(|result| result.get("state").and_then(Value::as_str) == Some("open"))
        .cloned()
        .collect();

    Ok(merge_action_output(
        input_data,
        json!({
            "type": "action:port-scan",
            "status": "completed",
            "target": host,
            "openPorts": open_ports,
            "ports": results,
        }),
    ))
}

async fn execute_ai_analyze(
    app: &AppHandle,
    node: &AutomationNode,
    input_data: &Value,
) -> Result<Value, String> {
    let Some(history) = app.try_state::<HistoryBridge>() else {
        return Err("AI chat context is unavailable".to_string());
    };
    let params = action_params(node);
    let prompt = resolve_template(&param_string(&params, "prompt", ""), input_data);
    if prompt.trim().is_empty() {
        return Err("AI prompt is required".to_string());
    }
    let include_request = param_bool(&params, "includeRequest", true);
    let include_response = param_bool(&params, "includeResponse", true);
    let mut content = String::new();
    content.push_str("Analyze this automation context for security relevance.\n\n");
    content.push_str(prompt.trim());
    content.push_str("\n\nContext:\n");
    if include_request {
        content.push_str("Request/source data:\n");
        content.push_str(&truncate_preview(&input_data.to_string(), 8192));
        content.push('\n');
    }
    if include_response {
        content.push_str("Response/body:\n");
        content.push_str(&truncate_preview(
            &resolve_source_value(input_data, "body"),
            8192,
        ));
        content.push('\n');
    }

    let request = crate::ai::types::AiChatRequest {
        messages: vec![crate::ai::types::AiChatMessage {
            role: "user".to_string(),
            content,
        }],
    };
    let response = crate::ai::send_ai_chat_message(app.clone(), history, request).await?;

    Ok(merge_action_output(
        input_data,
        json!({
            "type": "action:ai-analyze",
            "status": "completed",
            "profile": param_string(&params, "profile", "security"),
            "provider": response.provider,
            "model": response.model,
            "analysis": response.content,
        }),
    ))
}

fn execute_script_analyze(node: &AutomationNode, input_data: &Value) -> Result<Value, String> {
    let params = action_params(node);
    let source = resolve_source_value(input_data, &param_string(&params, "sourceField", "body"));
    let include_inline = param_bool(&params, "includeInline", true);
    let include_external = param_bool(&params, "includeExternal", true);
    let scripts = extract_scripts(&source, include_inline, include_external);

    Ok(merge_action_output(
        input_data,
        json!({
            "type": "action:script-analyze",
            "status": "completed",
            "scriptCount": scripts.len(),
            "scripts": scripts,
        }),
    ))
}

fn upsert_document_section(
    app: &AppHandle,
    document_id: Option<String>,
    fallback_title: &str,
    section_key: &str,
    section_title: &str,
    content: &str,
    mode: &str,
    description: &str,
) -> Result<DocumentRecord, String> {
    let Some(history) = app.try_state::<HistoryBridge>() else {
        return Err("Document storage is unavailable".to_string());
    };

    let mut documents = history.get_documents()?;
    let target_index = document_id
        .as_ref()
        .and_then(|id| documents.iter().position(|document| &document.id == id));
    let mut document = if let Some(index) = target_index {
        documents.remove(index)
    } else if let Some(document) = documents.into_iter().next() {
        document
    } else {
        let now = Utc::now().to_rfc3339();
        DocumentRecord {
            id: Uuid::new_v4().to_string(),
            name: fallback_title.to_string(),
            title: fallback_title.to_string(),
            sections: json!({}),
            custom_sections: json!([]),
            removed_built_in_sections: json!([]),
            api_entries: json!([]),
            created_at: now.clone(),
            updated_at: now,
        }
    };

    let mut sections = document
        .custom_sections
        .as_array()
        .cloned()
        .unwrap_or_default();
    let existing_index = sections
        .iter()
        .position(|section| section.get("key").and_then(Value::as_str) == Some(section_key));
    if let Some(index) = existing_index {
        let existing_content = sections[index]
            .get("content")
            .and_then(Value::as_str)
            .unwrap_or_default();
        let next_content = if mode == "replace" {
            content.to_string()
        } else {
            format!("{}\n\n{}", existing_content, content)
                .trim()
                .to_string()
        };
        if let Some(section) = sections[index].as_object_mut() {
            section.insert("content".to_string(), Value::String(next_content));
        }
    } else {
        sections.push(json!({
            "key": section_key,
            "title": if section_title.trim().is_empty() { section_key } else { section_title },
            "description": description,
            "placeholder": "",
            "content": content,
        }));
    }

    document.custom_sections = Value::Array(sections);
    document.updated_at = Utc::now().to_rfc3339();
    history.save_document(&document)?;
    Ok(document)
}

fn execute_encode_decode(node: &AutomationNode, input_data: &Value) -> Result<Value, String> {
    let params = action_params(node);
    let source = resolve_source_value(input_data, &param_string(&params, "sourceField", "body"));
    let mode = param_string(&params, "mode", "encode");
    let codec = param_string(&params, "codec", "url");
    let result = match (mode.as_str(), codec.as_str()) {
        ("decode", "base64") => String::from_utf8(
            general_purpose::STANDARD
                .decode(source.as_bytes())
                .map_err(|error| error.to_string())?,
        )
        .map_err(|error| error.to_string())?,
        (_, "base64") => general_purpose::STANDARD.encode(source.as_bytes()),
        ("decode", "hex") => decode_hex(&source)?,
        (_, "hex") => encode_hex(source.as_bytes()),
        ("decode", "url") => percent_decode(&source)?,
        _ => percent_encode(&source),
    };

    Ok(merge_action_output(
        input_data,
        json!({
            "result": result,
            "mode": mode,
            "codec": codec,
            "sourceField": param_string(&params, "sourceField", "body"),
        }),
    ))
}

fn execute_hash_data(node: &AutomationNode, input_data: &Value) -> Result<Value, String> {
    let params = action_params(node);
    let algorithm = param_string(&params, "algorithm", "sha256").to_lowercase();
    let source = resolve_source_value(input_data, &param_string(&params, "sourceField", "body"));
    let bytes = source.as_bytes();
    let hash = match algorithm.as_str() {
        "md5" => format!("{:x}", Md5::digest(bytes)),
        "sha1" => format!("{:x}", Sha1::digest(bytes)),
        "sha512" => format!("{:x}", Sha512::digest(bytes)),
        "sha3-256" => {
            return Err("SHA3-256 is not available in this runtime yet".to_string());
        }
        _ => format!("{:x}", Sha256::digest(bytes)),
    };

    Ok(merge_action_output(
        input_data,
        json!({
            "hash": hash,
            "algorithm": algorithm,
            "sourceField": param_string(&params, "sourceField", "body"),
        }),
    ))
}

fn execute_export_json(
    app: &AppHandle,
    node: &AutomationNode,
    input_data: &Value,
) -> Result<Value, String> {
    let params = action_params(node);
    let filename = sanitize_filename(&param_string(&params, "filename", "automation-export.json"));
    if filename.trim().is_empty() {
        return Err("Export filename is required".to_string());
    }
    let source = param_string(&params, "source", "payload");
    let value = if source == "payload" {
        input_data.clone()
    } else {
        resolve_json_path(input_data, &source)
    };
    let content = if param_string(&params, "format", "pretty") == "compact" {
        serde_json::to_string(&value).map_err(|error| error.to_string())?
    } else {
        serde_json::to_string_pretty(&value).map_err(|error| error.to_string())?
    };

    let dir = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?
        .join("automation-exports");
    fs::create_dir_all(&dir).map_err(|error| error.to_string())?;
    let path = dir.join(filename);
    fs::write(&path, content).map_err(|error| error.to_string())?;

    Ok(merge_action_output(
        input_data,
        json!({
            "exportPath": path.display().to_string(),
            "source": source,
        }),
    ))
}

fn action_params(node: &AutomationNode) -> Value {
    node.data
        .config
        .get("params")
        .cloned()
        .unwrap_or_else(|| json!({}))
}

fn param_string(params: &Value, key: &str, fallback: &str) -> String {
    params
        .get(key)
        .and_then(Value::as_str)
        .filter(|value| !value.trim().is_empty())
        .unwrap_or(fallback)
        .to_string()
}

fn param_bool(params: &Value, key: &str, fallback: bool) -> bool {
    match params.get(key) {
        Some(Value::Bool(value)) => *value,
        Some(Value::String(value)) if value.eq_ignore_ascii_case("true") => true,
        Some(Value::String(value)) if value.eq_ignore_ascii_case("false") => false,
        _ => fallback,
    }
}

fn run_script_actions_allowed(app: &AppHandle) -> bool {
    app.try_state::<AutomationRuntimeState>()
        .and_then(|state| {
            state
                .0
                .lock()
                .ok()
                .map(|inner| inner.settings.allow_run_script_actions)
        })
        .unwrap_or(false)
}

fn parse_header_lines(raw_headers: &str) -> Vec<(String, String)> {
    raw_headers
        .lines()
        .filter_map(|line| {
            let (name, value) = line.split_once(':')?;
            let name = name.trim();
            if name.is_empty() {
                return None;
            }
            Some((name.to_string(), value.trim().to_string()))
        })
        .collect()
}

fn truncate_preview(value: &str, max_chars: usize) -> String {
    if value.chars().count() <= max_chars {
        return value.to_string();
    }
    let mut preview = value.chars().take(max_chars).collect::<String>();
    preview.push_str("...");
    preview
}

fn normalize_scan_host(input: &str) -> Result<String, String> {
    let trimmed = input.trim();
    if trimmed.is_empty() {
        return Err("Scan target is required".to_string());
    }

    let candidate = if trimmed.contains("://") {
        url::Url::parse(trimmed)
            .ok()
            .and_then(|url| url.host_str().map(str::to_string))
            .unwrap_or_default()
    } else {
        trimmed
            .split('/')
            .next()
            .unwrap_or_default()
            .trim()
            .trim_start_matches('[')
            .trim_end_matches(']')
            .to_string()
    };
    let host = candidate
        .split('@')
        .last()
        .unwrap_or_default()
        .split(':')
        .next()
        .unwrap_or_default()
        .trim()
        .to_string();

    if host.is_empty() {
        Err("Scan target is required".to_string())
    } else {
        Ok(host)
    }
}

fn parse_port_scan_ports(raw_ports: &str, preset: &str) -> Result<Vec<u16>, String> {
    let source = if raw_ports.trim().is_empty() {
        match preset {
            "full" => "1-1024",
            "top100" => {
                "21,22,23,25,53,80,110,111,135,139,143,443,445,993,995,1723,3306,3389,5900,8080"
            }
            _ => "80,443,8080,8443",
        }
    } else {
        raw_ports
    };

    let mut ports = Vec::new();
    for token in source
        .split([',', ' ', '\n', '\t'])
        .map(str::trim)
        .filter(|token| !token.is_empty())
    {
        if let Some((start, end)) = token.split_once('-') {
            let start = start
                .trim()
                .parse::<u16>()
                .map_err(|_| format!("Invalid port range: {}", token))?;
            let end = end
                .trim()
                .parse::<u16>()
                .map_err(|_| format!("Invalid port range: {}", token))?;
            if start > end {
                return Err(format!("Invalid port range: {}", token));
            }
            for port in start..=end {
                ports.push(port);
            }
        } else {
            ports.push(
                token
                    .parse::<u16>()
                    .map_err(|_| format!("Invalid port: {}", token))?,
            );
        }
    }
    ports.sort_unstable();
    ports.dedup();
    if ports.is_empty() {
        return Err("At least one port is required".to_string());
    }
    if ports.len() > 1024 {
        return Err("Automation port scans are limited to 1,024 ports per action".to_string());
    }
    Ok(ports)
}

async fn scan_port_once(host: &str, port: u16, timeout_ms: u64) -> Value {
    let started_at = std::time::Instant::now();
    match tokio::time::timeout(
        Duration::from_millis(timeout_ms),
        TcpStream::connect((host, port)),
    )
    .await
    {
        Ok(Ok(_stream)) => json!({
            "host": host,
            "port": port,
            "state": "open",
            "responseTimeMs": started_at.elapsed().as_millis(),
        }),
        Ok(Err(error)) => json!({
            "host": host,
            "port": port,
            "state": "closed",
            "error": error.to_string(),
            "responseTimeMs": started_at.elapsed().as_millis(),
        }),
        Err(_) => json!({
            "host": host,
            "port": port,
            "state": "filtered",
            "error": "connection timed out",
        }),
    }
}

fn extract_scripts(source: &str, include_inline: bool, include_external: bool) -> Vec<Value> {
    let script_regex = match Regex::new(r#"(?is)<script\b([^>]*)>(.*?)</script>"#) {
        Ok(regex) => regex,
        Err(_) => return Vec::new(),
    };
    let src_regex = Regex::new(r#"(?i)\bsrc\s*=\s*["']([^"']+)["']"#).ok();
    let mut scripts = Vec::new();

    for captures in script_regex.captures_iter(source) {
        let attrs = captures
            .get(1)
            .map(|value| value.as_str())
            .unwrap_or_default();
        let body = captures
            .get(2)
            .map(|value| value.as_str())
            .unwrap_or_default();
        let src = src_regex
            .as_ref()
            .and_then(|regex| regex.captures(attrs))
            .and_then(|captures| captures.get(1))
            .map(|value| value.as_str().to_string());

        if let Some(src) = src {
            if include_external {
                scripts.push(json!({
                    "type": "external",
                    "src": src,
                }));
            }
        } else if include_inline && !body.trim().is_empty() {
            scripts.push(json!({
                "type": "inline",
                "length": body.len(),
                "preview": truncate_preview(body.trim(), 1000),
            }));
        }
    }

    scripts
}

fn merge_action_output(input_data: &Value, action: Value) -> Value {
    let mut output = input_data.as_object().cloned().unwrap_or_default();
    output.insert("action".to_string(), action);
    Value::Object(output)
}

fn resolve_source_value(input_data: &Value, source_field: &str) -> String {
    if source_field == "payload" {
        return input_data.to_string();
    }
    value_to_string(&resolve_json_path(input_data, source_field))
}

fn resolve_json_path(source: &Value, path: &str) -> Value {
    let mut current = source;
    for segment in path
        .split('.')
        .map(str::trim)
        .filter(|segment| !segment.is_empty())
    {
        if let Some(object) = current.as_object() {
            if let Some(value) = object.get(segment) {
                current = value;
                continue;
            }
            let normalized = segment.to_lowercase();
            if let Some((_, value)) = object
                .iter()
                .find(|(key, _)| key.to_lowercase() == normalized)
            {
                current = value;
                continue;
            }
        }
        return Value::Null;
    }
    current.clone()
}

fn sanitize_filename(filename: &str) -> String {
    let mut name = filename
        .chars()
        .map(|ch| match ch {
            '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|' => '_',
            other => other,
        })
        .collect::<String>();
    if !name.ends_with(".json") {
        name.push_str(".json");
    }
    name
}

fn encode_hex(bytes: &[u8]) -> String {
    bytes.iter().map(|byte| format!("{:02x}", byte)).collect()
}

fn decode_hex(value: &str) -> Result<String, String> {
    let trimmed = value.trim();
    if trimmed.len() % 2 != 0 {
        return Err("Hex input length must be even".to_string());
    }
    let mut bytes = Vec::new();
    for index in (0..trimmed.len()).step_by(2) {
        let byte = u8::from_str_radix(&trimmed[index..index + 2], 16)
            .map_err(|error| error.to_string())?;
        bytes.push(byte);
    }
    String::from_utf8(bytes).map_err(|error| error.to_string())
}

fn percent_encode(value: &str) -> String {
    value
        .bytes()
        .flat_map(|byte| {
            if byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'_' | b'.' | b'~') {
                vec![byte as char]
            } else {
                format!("%{:02X}", byte).chars().collect()
            }
        })
        .collect()
}

fn percent_decode(value: &str) -> Result<String, String> {
    let bytes = value.as_bytes();
    let mut decoded = Vec::new();
    let mut index = 0;
    while index < bytes.len() {
        if bytes[index] == b'%' {
            if index + 2 >= bytes.len() {
                return Err("Invalid percent encoding".to_string());
            }
            let hex = std::str::from_utf8(&bytes[index + 1..index + 3])
                .map_err(|error| error.to_string())?;
            decoded.push(u8::from_str_radix(hex, 16).map_err(|error| error.to_string())?);
            index += 3;
        } else if bytes[index] == b'+' {
            decoded.push(b' ');
            index += 1;
        } else {
            decoded.push(bytes[index]);
            index += 1;
        }
    }
    String::from_utf8(decoded).map_err(|error| error.to_string())
}

fn resolve_template(template: &str, input_data: &Value) -> String {
    Regex::new(r"\{\{([A-Za-z0-9_.-]+)\}\}")
        .map(|regex| {
            regex
                .replace_all(template, |captures: &regex::Captures| {
                    let value = resolve_json_path(input_data, &captures[1]);
                    if value.is_null() {
                        captures[0].to_string()
                    } else {
                        value_to_string(&value)
                    }
                })
                .to_string()
        })
        .unwrap_or_else(|_| template.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn resolves_templates_with_top_level_and_dotted_paths() {
        let input = json!({
            "host": "hexbuffer.com",
            "action": { "documentId": "doc-1" },
        });

        assert_eq!(
            resolve_template("{{host}} -> {{action.documentId}}", &input),
            "hexbuffer.com -> doc-1"
        );
    }

    #[test]
    fn extracts_source_values_by_json_path() {
        let input = json!({
            "request": { "body": "hello" },
            "body": "fallback",
        });

        assert_eq!(resolve_source_value(&input, "request.body"), "hello");
        assert_eq!(resolve_source_value(&input, "body"), "fallback");
    }

    #[test]
    fn parses_webhook_header_lines() {
        assert_eq!(
            parse_header_lines("Content-Type: application/json\nX-Test: yes\nbad"),
            vec![
                ("Content-Type".to_string(), "application/json".to_string()),
                ("X-Test".to_string(), "yes".to_string()),
            ]
        );
    }

    #[test]
    fn parses_port_presets_and_ranges() {
        assert_eq!(
            parse_port_scan_ports("80,443,8000-8002", "web").unwrap(),
            vec![80, 443, 8000, 8001, 8002]
        );
        assert_eq!(
            parse_port_scan_ports("", "web").unwrap(),
            vec![80, 443, 8080, 8443]
        );
    }

    #[test]
    fn extracts_inline_and_external_scripts() {
        let scripts = extract_scripts(
            r#"<html><script src="/app.js"></script><script>console.log("x")</script></html>"#,
            true,
            true,
        );

        assert_eq!(scripts.len(), 2);
        assert_eq!(
            scripts[0].get("type").and_then(Value::as_str),
            Some("external")
        );
        assert_eq!(
            scripts[1].get("type").and_then(Value::as_str),
            Some("inline")
        );
    }
}
