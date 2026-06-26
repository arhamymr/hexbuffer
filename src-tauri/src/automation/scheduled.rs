use std::time::{Duration, Instant};

use chrono::Utc;
use serde_json::json;
use tauri::{AppHandle, Manager, State};
use uuid::Uuid;

use super::execution::run_workflow_task;
use super::state::AutomationRuntimeState;
use super::types::{
    config_string, node_effective_type, AutomationNode, AutomationWorkflow, WorkflowContext,
    SCHEDULED_TRIGGER_TYPE,
};

const SCHEDULER_TICK: Duration = Duration::from_secs(15);

pub(crate) fn ensure_scheduled_trigger_scheduler(
    app: AppHandle,
    state: &State<'_, AutomationRuntimeState>,
) {
    {
        let mut inner = match state.0.lock() {
            Ok(inner) => inner,
            Err(_) => return,
        };
        if inner.scheduled_scheduler_started {
            return;
        }
        inner.scheduled_scheduler_started = true;
    }

    tauri::async_runtime::spawn(async move {
        loop {
            tokio::time::sleep(SCHEDULER_TICK).await;
            tick_scheduled_triggers(&app);
        }
    });
}

fn tick_scheduled_triggers(app: &AppHandle) {
    let Some(state) = app.try_state::<AutomationRuntimeState>() else {
        return;
    };

    let due_runs = {
        let mut inner = match state.0.lock() {
            Ok(inner) => inner,
            Err(_) => return,
        };
        let now = Instant::now();
        let mut due_runs = Vec::new();

        for workflow in inner.workflows.clone() {
            if !workflow.enabled || inner.paused_workflow_ids.contains(&workflow.id) {
                continue;
            }
            if inner.running_workflow_ids.contains(&workflow.id) {
                continue;
            }

            let Some(trigger_node) = scheduled_trigger_node(&workflow) else {
                continue;
            };
            let interval =
                match schedule_interval(&config_string(&trigger_node.data.config, "schedule")) {
                    Some(interval) => interval,
                    None => continue,
                };

            let Some(last_run) = inner
                .scheduled_last_run_by_trigger_id
                .get(&trigger_node.id)
                .copied()
            else {
                inner
                    .scheduled_last_run_by_trigger_id
                    .insert(trigger_node.id.clone(), now);
                continue;
            };

            if now.duration_since(last_run) < interval {
                continue;
            }

            let run_token = Uuid::new_v4().to_string();
            inner
                .scheduled_last_run_by_trigger_id
                .insert(trigger_node.id.clone(), now);
            inner
                .active_run_token_by_workflow_id
                .insert(workflow.id.clone(), run_token.clone());
            let context = WorkflowContext {
                trigger_type: Some(SCHEDULED_TRIGGER_TYPE.to_string()),
                trigger_node_id: Some(trigger_node.id.clone()),
                data: json!({
                    "triggerType": SCHEDULED_TRIGGER_TYPE,
                    "triggerNodeId": trigger_node.id,
                    "schedule": config_string(&trigger_node.data.config, "schedule"),
                    "timestamp": Utc::now().to_rfc3339(),
                }),
            };
            due_runs.push((workflow, context, run_token));
        }

        due_runs
    };

    for (workflow, context, run_token) in due_runs {
        let app_for_task = app.clone();
        tauri::async_runtime::spawn(async move {
            run_workflow_task(app_for_task, workflow, context, false, run_token).await;
        });
    }
}

fn scheduled_trigger_node(workflow: &AutomationWorkflow) -> Option<AutomationNode> {
    workflow
        .nodes
        .iter()
        .find(|node| {
            node_effective_type(node) == SCHEDULED_TRIGGER_TYPE
                && config_string(&node.data.config, "triggerType") == SCHEDULED_TRIGGER_TYPE
        })
        .cloned()
}

fn schedule_interval(schedule: &str) -> Option<Duration> {
    let trimmed = schedule.trim();
    if trimmed.is_empty() {
        return None;
    }

    if let Some(value) = trimmed.strip_prefix("@every ") {
        return parse_duration(value.trim());
    }

    let parts: Vec<&str> = trimmed.split_whitespace().collect();
    if parts.len() != 5 {
        return None;
    }

    let minute = parts[0];
    let hour = parts[1];

    if let Some(step) = minute.strip_prefix("*/") {
        let minutes = step.parse::<u64>().ok()?.max(1);
        return Some(Duration::from_secs(minutes * 60));
    }

    if minute == "0" {
        if let Some(step) = hour.strip_prefix("*/") {
            let hours = step.parse::<u64>().ok()?.max(1);
            return Some(Duration::from_secs(hours * 60 * 60));
        }
        if hour == "*" {
            return Some(Duration::from_secs(60 * 60));
        }
    }

    if minute.parse::<u8>().is_ok() && hour == "*" {
        return Some(Duration::from_secs(60 * 60));
    }

    None
}

fn parse_duration(value: &str) -> Option<Duration> {
    let value = value.trim();
    let unit_start = value
        .find(|ch: char| !ch.is_ascii_digit())
        .unwrap_or(value.len());
    let amount = value[..unit_start].parse::<u64>().ok()?.max(1);
    let unit = value[unit_start..].trim().to_ascii_lowercase();
    match unit.as_str() {
        "s" | "sec" | "secs" | "second" | "seconds" => Some(Duration::from_secs(amount)),
        "" | "m" | "min" | "mins" | "minute" | "minutes" => Some(Duration::from_secs(amount * 60)),
        "h" | "hr" | "hrs" | "hour" | "hours" => Some(Duration::from_secs(amount * 60 * 60)),
        _ => None,
    }
}

pub(crate) fn prune_scheduled_trigger_state(inner: &mut super::types::AutomationRuntimeInner) {
    let trigger_ids: std::collections::HashSet<String> = inner
        .workflows
        .iter()
        .flat_map(|workflow| {
            workflow
                .nodes
                .iter()
                .filter(|node| node_effective_type(node) == SCHEDULED_TRIGGER_TYPE)
                .map(|node| node.id.clone())
                .collect::<Vec<_>>()
        })
        .collect();
    inner
        .scheduled_last_run_by_trigger_id
        .retain(|trigger_id, _| trigger_ids.contains(trigger_id));
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_every_duration() {
        assert_eq!(
            schedule_interval("@every 30s"),
            Some(Duration::from_secs(30))
        );
        assert_eq!(
            schedule_interval("@every 5m"),
            Some(Duration::from_secs(300))
        );
        assert_eq!(
            schedule_interval("@every 2h"),
            Some(Duration::from_secs(7200))
        );
    }

    #[test]
    fn parses_common_cron_intervals() {
        assert_eq!(
            schedule_interval("*/5 * * * *"),
            Some(Duration::from_secs(300))
        );
        assert_eq!(
            schedule_interval("0 */6 * * *"),
            Some(Duration::from_secs(21_600))
        );
        assert_eq!(
            schedule_interval("0 * * * *"),
            Some(Duration::from_secs(3_600))
        );
    }
}
