use std::{
    collections::{HashMap, HashSet, VecDeque},
    time::Duration,
};

use serde_json::Value;
use tauri::AppHandle;

use super::actions::execute_runtime_action;
use super::condition::evaluate_condition;
use super::events::{
    append_log, clear_workflow_runtime, flush_ui_telemetry_batch, is_workflow_run_cancelled,
    log_abort_and_finish_run, mark_workflow_run_finished, mark_workflow_running, set_node_runtime,
};
use super::types::{node_effective_type, node_label, AutomationNode, AutomationWorkflow, WorkflowContext};

const NODE_TRAVEL_DELAY: Duration = Duration::from_millis(300);
const NODE_TRAVEL_ABORT_POLL: Duration = Duration::from_millis(100);

async fn wait_for_node_travel(
    app: &AppHandle,
    workflow_id: &str,
    run_token: &str,
) -> bool {
    let mut remaining = NODE_TRAVEL_DELAY;
    while !remaining.is_zero() {
        let sleep_for = remaining.min(NODE_TRAVEL_ABORT_POLL);
        tokio::time::sleep(sleep_for).await;

        if is_workflow_run_cancelled(app, workflow_id, run_token) {
            log_abort_and_finish_run(app, workflow_id, run_token);
            flush_ui_telemetry_batch(app);
            return false;
        }

        remaining = remaining.saturating_sub(sleep_for);
    }

    true
}

pub(crate) async fn run_workflow_task(
    app: AppHandle,
    workflow: AutomationWorkflow,
    context: WorkflowContext,
    _from_live_traffic: bool,
    run_token: String,
) {
    clear_workflow_runtime(&app, &workflow.id);
    mark_workflow_running(&app, &workflow.id, &run_token, None);
    append_log(
        &app,
        &workflow.id,
        "info",
        &format!("Starting workflow: {}", workflow.name),
        None,
        None,
        None,
        None,
    );

    if workflow.nodes.is_empty() {
        append_log(
            &app,
            &workflow.id,
            "error",
            "Workflow has no nodes",
            None,
            None,
            None,
            None,
        );
        mark_workflow_run_finished(&app, &workflow.id, &run_token, false);
        return;
    }

    let mut nodes_by_id: HashMap<String, AutomationNode> = workflow
        .nodes
        .iter()
        .map(|node| (node.id.clone(), node.clone()))
        .collect();
    let targets: HashSet<String> = workflow
        .edges
        .iter()
        .map(|edge| edge.target.clone())
        .collect();
    let triggers: Vec<String> = if let Some(trigger_node_id) = context.trigger_node_id.clone() {
        if nodes_by_id.contains_key(&trigger_node_id) {
            vec![trigger_node_id]
        } else {
            Vec::new()
        }
    } else {
        workflow
            .nodes
            .iter()
            .filter(|node| !targets.contains(&node.id))
            .map(|node| node.id.clone())
            .collect()
    };

    if triggers.is_empty() {
        append_log(
            &app,
            &workflow.id,
            "error",
            "Add a starting node before running",
            None,
            None,
            None,
            None,
        );
        mark_workflow_run_finished(&app, &workflow.id, &run_token, false);
        return;
    }

    let mut visited = HashSet::new();
    let mut queue: VecDeque<String> = triggers.iter().cloned().collect();
    let mut node_input_by_id: HashMap<String, Value> = triggers
        .iter()
        .map(|node_id| (node_id.clone(), context.data.clone()))
        .collect();

    while let Some(node_id) = queue.pop_front() {
        if is_workflow_run_cancelled(&app, &workflow.id, &run_token) {
            log_abort_and_finish_run(&app, &workflow.id, &run_token);
            flush_ui_telemetry_batch(&app);
            return;
        }

        if !visited.insert(node_id.clone()) {
            continue;
        }

        let Some(node) = nodes_by_id.remove(&node_id) else {
            continue;
        };
        let node_type = node_effective_type(&node);
        let label = node_label(&node);
        let input_data = node_input_by_id
            .get(&node_id)
            .cloned()
            .unwrap_or(Value::Null);
        let mut output_data = input_data.clone();

        mark_workflow_running(&app, &workflow.id, &run_token, Some(node_id.clone()));
        append_log(
            &app,
            &workflow.id,
            "info",
            &format!("Executing: {}", label),
            Some(&node_id),
            Some(&label),
            Some(input_data.clone()),
            None,
        );
        set_node_runtime(
            &app,
            &workflow.id,
            &node_id,
            "running",
            &format!("Executing: {}", label),
            Some(input_data.clone()),
            None,
        );
        flush_ui_telemetry_batch(&app);
        if !wait_for_node_travel(&app, &workflow.id, &run_token).await {
            return;
        }

        if let Some(result) = execute_runtime_action(&app, &workflow.id, &node, &input_data).await {
            match result {
                Ok(next_output) => {
                    output_data = next_output;
                    append_log(
                        &app,
                        &workflow.id,
                        "success",
                        &format!("Completed: {}", label),
                        Some(&node_id),
                        Some(&label),
                        Some(input_data.clone()),
                        Some(output_data.clone()),
                    );
                    set_node_runtime(
                        &app,
                        &workflow.id,
                        &node_id,
                        "success",
                        &format!("Completed: {}", label),
                        Some(input_data.clone()),
                        Some(output_data.clone()),
                    );
                    flush_ui_telemetry_batch(&app);
                }
                Err(error) => {
                    let message = format!("Failed: {}", error);
                    append_log(
                        &app,
                        &workflow.id,
                        "error",
                        &message,
                        Some(&node_id),
                        Some(&label),
                        Some(input_data.clone()),
                        None,
                    );
                    set_node_runtime(
                        &app,
                        &workflow.id,
                        &node_id,
                        "error",
                        &message,
                        Some(input_data.clone()),
                        None,
                    );
                    mark_workflow_run_finished(&app, &workflow.id, &run_token, false);
                    flush_ui_telemetry_batch(&app);
                    return;
                }
            }
        } else if node_type.starts_with("condition:") {
            tokio::time::sleep(Duration::from_millis(25)).await;
            if is_workflow_run_cancelled(&app, &workflow.id, &run_token) {
                log_abort_and_finish_run(&app, &workflow.id, &run_token);
                flush_ui_telemetry_batch(&app);
                return;
            }
            let result = evaluate_condition(&node.data.config, &input_data);
            output_data = result.output.clone();
            let level = if result.match_value {
                "success"
            } else {
                "warning"
            };
            let status = if result.match_value {
                "success"
            } else {
                "skipped"
            };
            append_log(
                &app,
                &workflow.id,
                level,
                &result.message,
                Some(&node_id),
                Some(&label),
                Some(input_data.clone()),
                Some(output_data.clone()),
            );
            set_node_runtime(
                &app,
                &workflow.id,
                &node_id,
                status,
                &result.message,
                Some(input_data.clone()),
                Some(output_data.clone()),
            );
            flush_ui_telemetry_batch(&app);
        } else if node_type.starts_with("trigger:") {
            if let Some(host) = input_data.get("host").and_then(Value::as_str) {
                append_log(
                    &app,
                    &workflow.id,
                    "info",
                    &format!(
                        "Trigger host: {}",
                        if host.is_empty() { "(unknown)" } else { host }
                    ),
                    Some(&node_id),
                    Some(&label),
                    Some(input_data.clone()),
                    Some(output_data.clone()),
                );
            } else {
                append_log(
                    &app,
                    &workflow.id,
                    "info",
                    "Trigger activated",
                    Some(&node_id),
                    Some(&label),
                    Some(input_data.clone()),
                    Some(output_data.clone()),
                );
            }
            set_node_runtime(
                &app,
                &workflow.id,
                &node_id,
                "success",
                &format!("Triggered: {}", label),
                Some(input_data.clone()),
                Some(output_data.clone()),
            );
            append_log(
                &app,
                &workflow.id,
                "success",
                &format!("Triggered: {}", label),
                Some(&node_id),
                Some(&label),
                Some(input_data.clone()),
                Some(output_data.clone()),
            );
            flush_ui_telemetry_batch(&app);
        } else {
            tokio::time::sleep(Duration::from_millis(75)).await;
            if is_workflow_run_cancelled(&app, &workflow.id, &run_token) {
                log_abort_and_finish_run(&app, &workflow.id, &run_token);
                flush_ui_telemetry_batch(&app);
                return;
            }
            append_log(
                &app,
                &workflow.id,
                "success",
                &format!("Completed: {}", label),
                Some(&node_id),
                Some(&label),
                Some(input_data.clone()),
                Some(output_data.clone()),
            );
            set_node_runtime(
                &app,
                &workflow.id,
                &node_id,
                "success",
                &format!("Completed: {}", label),
                Some(input_data.clone()),
                Some(output_data.clone()),
            );
            flush_ui_telemetry_batch(&app);
        }

        let match_value = output_data
            .get("match")
            .and_then(Value::as_bool)
            .unwrap_or(false);
        for edge in workflow.edges.iter().filter(|edge| edge.source == node_id) {
            if node_type.starts_with("condition:") {
                let expected_handle = if match_value { "true" } else { "false" };
                if edge.source_handle.as_deref() != Some(expected_handle) {
                    continue;
                }
            }
            if !visited.contains(&edge.target) {
                node_input_by_id.insert(edge.target.clone(), output_data.clone());
                queue.push_back(edge.target.clone());
            }
        }
    }

    for node in &workflow.nodes {
        if visited.contains(&node.id) {
            continue;
        }
        let label = node_label(node);
        append_log(
            &app,
            &workflow.id,
            "warning",
            &format!("Skipped (unreachable): {}", label),
            Some(&node.id),
            Some(&label),
            None,
            None,
        );
        set_node_runtime(
            &app,
            &workflow.id,
            &node.id,
            "skipped",
            &format!("Skipped (unreachable): {}", label),
            None,
            None,
        );
    }

    append_log(
        &app,
        &workflow.id,
        "success",
        &format!(
            "Workflow completed: {}/{} nodes executed",
            visited.len(),
            workflow.nodes.len()
        ),
        None,
        None,
        None,
        None,
    );
    mark_workflow_run_finished(&app, &workflow.id, &run_token, false);
    flush_ui_telemetry_batch(&app);
}
