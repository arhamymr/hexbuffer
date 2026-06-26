use std::{
    collections::{HashSet, VecDeque},
    time::{Duration, Instant},
};

use chrono::Utc;
use serde::Serialize;
use serde_json::{json, Value};
use tauri::{AppHandle, Emitter, Manager, State};
use uuid::Uuid;

use super::state::{pending_count_locked, AutomationRuntimeState};
use super::types::{
    AutomationUiTelemetryBatchEvent, AutomationUiTelemetryItem, LiveTrafficHostInsightEvent,
    LiveTrafficQueueStatsEvent, NodeRuntimeEvent, WorkflowRuntimeEvent, AUTOMATION_LOG_LIMIT,
    AUTOMATION_UI_TELEMETRY_THROTTLE_MS, LIVE_TRAFFIC_UI_TELEMETRY_BATCH_LIMIT,
};

// ── Execution log event ───────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ExecutionLogEvent {
    pub id: String,
    pub workflow_id: String,
    pub timestamp: String,
    pub level: String,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub node_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub node_label: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub input_data: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub output_data: Option<Value>,
}

// ── Log / node runtime ────────────────────────────────────────────────────

pub(crate) fn append_log(
    app: &AppHandle,
    workflow_id: &str,
    level: &str,
    message: &str,
    node_id: Option<&str>,
    node_label: Option<&str>,
    input_data: Option<Value>,
    output_data: Option<Value>,
) {
    let log = ExecutionLogEvent {
        id: Uuid::new_v4().to_string(),
        workflow_id: workflow_id.to_string(),
        timestamp: Utc::now().to_rfc3339(),
        level: level.to_string(),
        message: message.to_string(),
        node_id: node_id.map(str::to_string),
        node_label: node_label.map(str::to_string),
        input_data,
        output_data,
    };
    if let Some(state) = app.try_state::<AutomationRuntimeState>() {
        if let Ok(mut inner) = state.0.lock() {
            let logs = inner
                .logs_by_workflow_id
                .entry(workflow_id.to_string())
                .or_default();
            logs.push_back(log.clone());
            while logs.len() > AUTOMATION_LOG_LIMIT {
                logs.pop_front();
            }
        }
    }
    push_ui_telemetry(
        app,
        AutomationUiTelemetryItem::ExecutionLog(compact_log_for_ui(log)),
    );
}

pub(crate) fn set_node_runtime(
    app: &AppHandle,
    workflow_id: &str,
    node_id: &str,
    status: &str,
    message: &str,
    input_data: Option<Value>,
    output_data: Option<Value>,
) {
    let event = NodeRuntimeEvent {
        node_id: node_id.to_string(),
        workflow_id: workflow_id.to_string(),
        status: status.to_string(),
        message: message.to_string(),
        updated_at: Utc::now().to_rfc3339(),
        input_data: input_data.map(compact_value_for_ui),
        output_data: output_data.map(compact_value_for_ui),
    };
    push_ui_telemetry(app, AutomationUiTelemetryItem::NodeRuntime(event));
}

pub(crate) fn clear_workflow_runtime(app: &AppHandle, workflow_id: &str) {
    push_ui_telemetry(
        app,
        AutomationUiTelemetryItem::WorkflowRuntimeClear(workflow_id.to_string()),
    );
}

// ── Workflow runtime state emission ───────────────────────────────────────

pub(crate) fn emit_runtime(app: &AppHandle, state: &State<'_, AutomationRuntimeState>) {
    let payload = {
        let inner = match state.0.lock() {
            Ok(inner) => inner,
            Err(_) => return,
        };
        WorkflowRuntimeEvent {
            running_workflow_ids: inner.running_workflow_ids.iter().cloned().collect(),
            active_run_workflow_id: inner.active_run_workflow_id.clone(),
            executing_node_id: inner.executing_node_id.clone(),
        }
    };
    push_ui_telemetry(app, AutomationUiTelemetryItem::WorkflowRuntime(payload));
}

pub(crate) fn mark_workflow_running(
    app: &AppHandle,
    workflow_id: &str,
    run_token: &str,
    executing_node_id: Option<String>,
) {
    if let Some(state) = app.try_state::<AutomationRuntimeState>() {
        if let Ok(mut inner) = state.0.lock() {
            inner.aborted_workflow_ids.remove(workflow_id);
            inner
                .active_run_token_by_workflow_id
                .insert(workflow_id.to_string(), run_token.to_string());
            inner.running_workflow_ids.insert(workflow_id.to_string());
            inner.active_run_workflow_id = Some(workflow_id.to_string());
            inner.executing_node_id = executing_node_id;
        }
        emit_runtime(app, &state);
    }
}

pub(crate) fn mark_workflow_run_finished(
    app: &AppHandle,
    workflow_id: &str,
    run_token: &str,
    keep_abort: bool,
) {
    if let Some(state) = app.try_state::<AutomationRuntimeState>() {
        if let Ok(mut inner) = state.0.lock() {
            if inner
                .active_run_token_by_workflow_id
                .get(workflow_id)
                .is_some_and(|active_token| active_token != run_token)
            {
                return;
            }
            inner.active_run_token_by_workflow_id.remove(workflow_id);
            inner.running_workflow_ids.remove(workflow_id);
            if !keep_abort {
                inner.aborted_workflow_ids.remove(workflow_id);
            }
            if inner.active_run_workflow_id.as_deref() == Some(workflow_id) {
                inner.active_run_workflow_id = inner.running_workflow_ids.iter().next().cloned();
            }
            inner.executing_node_id = None;
        }
        emit_runtime(app, &state);
    }
}

pub(crate) fn is_workflow_run_cancelled(
    app: &AppHandle,
    workflow_id: &str,
    run_token: &str,
) -> bool {
    app.try_state::<AutomationRuntimeState>()
        .and_then(|state| {
            state.0.lock().ok().map(|inner| {
                inner.aborted_workflow_ids.contains_key(workflow_id)
                    || inner
                        .active_run_token_by_workflow_id
                        .get(workflow_id)
                        .is_some_and(|active_token| active_token != run_token)
            })
        })
        .unwrap_or(false)
}

pub(crate) fn log_abort_and_finish_run(app: &AppHandle, workflow_id: &str, run_token: &str) {
    let reason = app
        .try_state::<AutomationRuntimeState>()
        .and_then(|state| {
            state
                .0
                .lock()
                .ok()
                .and_then(|inner| inner.aborted_workflow_ids.get(workflow_id).cloned())
        })
        .unwrap_or_else(|| "superseded".to_string());
    append_log(
        app,
        workflow_id,
        "warning",
        &format!("Workflow aborted: {}", reason),
        None,
        None,
        None,
        None,
    );
    mark_workflow_run_finished(app, workflow_id, run_token, true);
}

// ── Queue stats emission ──────────────────────────────────────────────────

pub(crate) fn emit_queue_stats(
    app: &AppHandle,
    state: &State<'_, AutomationRuntimeState>,
    trigger_node_id: &str,
) {
    let payload = {
        let inner = match state.0.lock() {
            Ok(inner) => inner,
            Err(_) => return,
        };
        let current = inner.queue_stats_by_trigger_id.get(trigger_node_id);
        LiveTrafficQueueStatsEvent {
            trigger_node_id: trigger_node_id.to_string(),
            pending: pending_count_locked(&inner, trigger_node_id),
            dropped: current.map(|stats| stats.dropped).unwrap_or(0),
            last_dropped_at: current.and_then(|stats| stats.last_dropped_at.clone()),
            cap: current
                .map(|stats| stats.cap)
                .unwrap_or(inner.settings.filtered_trigger_queue_cap),
        }
    };
    push_ui_telemetry(app, AutomationUiTelemetryItem::QueueStats(payload));
}

pub(crate) fn emit_all_queue_stats(app: &AppHandle, state: &State<'_, AutomationRuntimeState>) {
    let trigger_ids = {
        let inner = match state.0.lock() {
            Ok(inner) => inner,
            Err(_) => return,
        };
        let mut ids: HashSet<String> = inner.queue_stats_by_trigger_id.keys().cloned().collect();
        ids.extend(inner.trigger_queues.keys().cloned());
        ids.into_iter().collect::<Vec<_>>()
    };
    for trigger_id in trigger_ids {
        emit_queue_stats(app, state, &trigger_id);
    }
}

// ── Backpressured UI telemetry ────────────────────────────────────────────

pub(crate) fn emit_host_insight(app: &AppHandle, insight: &LiveTrafficHostInsightEvent) {
    if let Some(state) = app.try_state::<AutomationRuntimeState>() {
        if let Ok(mut inner) = state.0.lock() {
            inner
                .ui_telemetry_queue
                .push_back(AutomationUiTelemetryItem::HostInsight(insight.clone()));
            inner
                .ui_telemetry_queue
                .push_back(AutomationUiTelemetryItem::CapturedHost(insight.clone()));
        }
        emit_next_ui_telemetry_batch(app, &state);
    }
}

pub(crate) fn emit_host_insight_remove(app: &AppHandle, id: String) {
    if let Some(state) = app.try_state::<AutomationRuntimeState>() {
        if let Ok(mut inner) = state.0.lock() {
            inner
                .ui_telemetry_queue
                .push_back(AutomationUiTelemetryItem::RemoveHostInsight(id));
        }
        emit_next_ui_telemetry_batch(app, &state);
    }
}

pub(crate) fn ack_ui_telemetry_batch(
    app: &AppHandle,
    state: &State<'_, AutomationRuntimeState>,
    batch_id: &str,
) {
    {
        let mut inner = match state.0.lock() {
            Ok(inner) => inner,
            Err(_) => return,
        };
        if inner.ui_telemetry_in_flight_batch_id.as_deref() != Some(batch_id) {
            return;
        }
        inner.ui_telemetry_in_flight_batch_id = None;
    }
    emit_next_ui_telemetry_batch(app, state);
}

enum UiEmitDecision {
    None,
    Schedule(Duration),
    Emit(AutomationUiTelemetryBatchEvent),
}

pub(crate) fn emit_next_ui_telemetry_batch(
    app: &AppHandle,
    state: &State<'_, AutomationRuntimeState>,
) {
    let decision = {
        let mut inner = match state.0.lock() {
            Ok(inner) => inner,
            Err(_) => return,
        };
        if inner.ui_telemetry_in_flight_batch_id.is_some() || inner.ui_telemetry_queue.is_empty() {
            return;
        }

        let throttle = Duration::from_millis(AUTOMATION_UI_TELEMETRY_THROTTLE_MS);
        if let Some(last_emit_at) = inner.ui_telemetry_last_emit_at {
            let elapsed = last_emit_at.elapsed();
            if elapsed < throttle {
                if inner.ui_telemetry_emit_scheduled {
                    return;
                }
                inner.ui_telemetry_emit_scheduled = true;
                UiEmitDecision::Schedule(throttle.saturating_sub(elapsed))
            } else {
                build_ui_telemetry_batch_locked(&mut inner)
            }
        } else {
            build_ui_telemetry_batch_locked(&mut inner)
        }
    };

    match decision {
        UiEmitDecision::None => {}
        UiEmitDecision::Schedule(delay) => {
            schedule_delayed_ui_telemetry_emit(app.clone(), delay);
        }
        UiEmitDecision::Emit(payload) => {
            let _ = app.emit("automation:ui-batch", payload);
        }
    }
}

pub(crate) fn flush_ui_telemetry_batch(app: &AppHandle) {
    let Some(state) = app.try_state::<AutomationRuntimeState>() else {
        return;
    };
    let payload = {
        let mut inner = match state.0.lock() {
            Ok(inner) => inner,
            Err(_) => return,
        };
        build_priority_ui_telemetry_batch_locked(&mut inner)
    };

    if let Some(payload) = payload {
        let _ = app.emit("automation:ui-batch", payload);
    }
}

fn build_priority_ui_telemetry_batch_locked(
    inner: &mut super::types::AutomationRuntimeInner,
) -> Option<AutomationUiTelemetryBatchEvent> {
    if inner.ui_telemetry_queue.is_empty() {
        return None;
    }

    let mut remaining = VecDeque::new();
    let mut logs = Vec::new();
    let mut node_runtimes = Vec::new();
    let mut workflow_runtimes = Vec::new();
    let mut workflow_runtime_clear_ids = Vec::new();

    while let Some(item) = inner.ui_telemetry_queue.pop_front() {
        match item {
            AutomationUiTelemetryItem::ExecutionLog(log) => logs.push(log),
            AutomationUiTelemetryItem::NodeRuntime(runtime) => node_runtimes.push(runtime),
            AutomationUiTelemetryItem::WorkflowRuntime(runtime) => workflow_runtimes.push(runtime),
            AutomationUiTelemetryItem::WorkflowRuntimeClear(workflow_id) => {
                workflow_runtime_clear_ids.push(workflow_id);
            }
            other => remaining.push_back(other),
        }
    }

    inner.ui_telemetry_queue = remaining;

    if logs.is_empty()
        && node_runtimes.is_empty()
        && workflow_runtimes.is_empty()
        && workflow_runtime_clear_ids.is_empty()
    {
        return None;
    }

    Some(AutomationUiTelemetryBatchEvent {
        batch_id: Uuid::new_v4().to_string(),
        host_insights: Vec::new(),
        captured_hosts: Vec::new(),
        remove_host_insight_ids: Vec::new(),
        logs,
        node_runtimes,
        workflow_runtimes,
        workflow_runtime_clear_ids,
        queue_stats: Vec::new(),
    })
}

fn build_ui_telemetry_batch_locked(
    inner: &mut super::types::AutomationRuntimeInner,
) -> UiEmitDecision {
    if inner.ui_telemetry_queue.is_empty() {
        return UiEmitDecision::None;
    }

    let batch_id = Uuid::new_v4().to_string();
    let mut host_insights = Vec::new();
    let mut captured_hosts = Vec::new();
    let mut remove_host_insight_ids = Vec::new();
    let mut logs = Vec::new();
    let mut node_runtimes = Vec::new();
    let mut workflow_runtimes = Vec::new();
    let mut workflow_runtime_clear_ids = Vec::new();
    let mut queue_stats = Vec::new();

    for _ in 0..LIVE_TRAFFIC_UI_TELEMETRY_BATCH_LIMIT {
        let Some(item) = inner.ui_telemetry_queue.pop_front() else {
            break;
        };
        match item {
            AutomationUiTelemetryItem::HostInsight(insight) => host_insights.push(insight),
            AutomationUiTelemetryItem::CapturedHost(insight) => captured_hosts.push(insight),
            AutomationUiTelemetryItem::RemoveHostInsight(id) => {
                remove_host_insight_ids.push(id);
            }
            AutomationUiTelemetryItem::ExecutionLog(log) => logs.push(log),
            AutomationUiTelemetryItem::NodeRuntime(runtime) => node_runtimes.push(runtime),
            AutomationUiTelemetryItem::WorkflowRuntime(runtime) => workflow_runtimes.push(runtime),
            AutomationUiTelemetryItem::WorkflowRuntimeClear(workflow_id) => {
                workflow_runtime_clear_ids.push(workflow_id);
            }
            AutomationUiTelemetryItem::QueueStats(stats) => queue_stats.push(stats),
        }
    }

    inner.ui_telemetry_in_flight_batch_id = Some(batch_id.clone());
    inner.ui_telemetry_last_emit_at = Some(Instant::now());
    inner.ui_telemetry_emit_scheduled = false;
    UiEmitDecision::Emit(AutomationUiTelemetryBatchEvent {
        batch_id,
        host_insights,
        captured_hosts,
        remove_host_insight_ids,
        logs,
        node_runtimes,
        workflow_runtimes,
        workflow_runtime_clear_ids,
        queue_stats,
    })
}

fn schedule_delayed_ui_telemetry_emit(app: AppHandle, delay: Duration) {
    tauri::async_runtime::spawn(async move {
        tokio::time::sleep(delay).await;
        let Some(state) = app.try_state::<AutomationRuntimeState>() else {
            return;
        };
        if let Ok(mut inner) = state.0.lock() {
            inner.ui_telemetry_emit_scheduled = false;
        }
        emit_next_ui_telemetry_batch(&app, &state);
    });
}

fn push_ui_telemetry(app: &AppHandle, item: AutomationUiTelemetryItem) {
    if let Some(state) = app.try_state::<AutomationRuntimeState>() {
        if let Ok(mut inner) = state.0.lock() {
            inner.ui_telemetry_queue.push_back(item);
        }
        emit_next_ui_telemetry_batch(app, &state);
    }
}

fn compact_value_for_ui(value: Value) -> Value {
    compact_value(value, 0)
}

fn compact_log_for_ui(log: ExecutionLogEvent) -> ExecutionLogEvent {
    ExecutionLogEvent {
        input_data: log.input_data.map(compact_value_for_ui),
        output_data: log.output_data.map(compact_value_for_ui),
        ..log
    }
}

fn compact_value(value: Value, depth: usize) -> Value {
    const MAX_DEPTH: usize = 4;
    const MAX_STRING: usize = 512;
    const MAX_ARRAY_ITEMS: usize = 20;
    const MAX_OBJECT_KEYS: usize = 40;

    if depth >= MAX_DEPTH {
        return match value {
            Value::Array(items) => {
                json!({ "type": "array", "length": items.len(), "truncated": true })
            }
            Value::Object(object) => {
                json!({ "type": "object", "keys": object.len(), "truncated": true })
            }
            other => other,
        };
    }

    match value {
        Value::String(text) => {
            if text.len() <= MAX_STRING {
                Value::String(text)
            } else {
                Value::String(truncate_string(text, MAX_STRING))
            }
        }
        Value::Array(items) => {
            let original_len = items.len();
            let mut compacted = items
                .into_iter()
                .take(MAX_ARRAY_ITEMS)
                .map(|item| compact_value(item, depth + 1))
                .collect::<Vec<_>>();
            if original_len > MAX_ARRAY_ITEMS {
                compacted.push(json!({ "truncatedItems": original_len - MAX_ARRAY_ITEMS }));
            }
            Value::Array(compacted)
        }
        Value::Object(object) => {
            let original_len = object.len();
            let mut compacted = serde_json::Map::new();
            for (key, value) in object.into_iter().take(MAX_OBJECT_KEYS) {
                let next_value = if matches!(key.as_str(), "requestBody" | "responseBody") {
                    match value {
                        Value::String(text) => {
                            if text.len() <= MAX_STRING {
                                Value::String(text)
                            } else {
                                Value::String(truncate_string(text, MAX_STRING))
                            }
                        }
                        other => compact_value(other, depth + 1),
                    }
                } else {
                    compact_value(value, depth + 1)
                };
                compacted.insert(key, next_value);
            }
            if original_len > MAX_OBJECT_KEYS {
                compacted.insert(
                    "truncatedKeys".to_string(),
                    Value::Number((original_len - MAX_OBJECT_KEYS).into()),
                );
            }
            Value::Object(compacted)
        }
        other => other,
    }
}

fn truncate_string(text: String, max_chars: usize) -> String {
    let original_chars = text.chars().count();
    let preview = text.chars().take(max_chars).collect::<String>();
    format!(
        "{}… [truncated {} chars]",
        preview,
        original_chars.saturating_sub(max_chars)
    )
}
