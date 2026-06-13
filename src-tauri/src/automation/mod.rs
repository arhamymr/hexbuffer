mod actions;
mod condition;
mod events;
mod execution;
mod live_traffic;
mod scheduled;
mod state;
mod types;

use std::collections::HashSet;

use tauri::{AppHandle, State};
use uuid::Uuid;

use events::{ack_ui_telemetry_batch, emit_all_queue_stats, emit_runtime};
use execution::run_workflow_task;
use live_traffic::schedule_live_traffic_queue;
use scheduled::{ensure_scheduled_trigger_scheduler, prune_scheduled_trigger_state};
use state::{abort_workflow_locked, purge_deleted_workflows_locked};
use types::normalize_settings;

// ── Public API re-exports ─────────────────────────────────────────────────

pub use live_traffic::ingest_proxy_record;
pub use state::AutomationRuntimeState;
pub use types::{AutomationRuntimeSettings, AutomationWorkflow, WorkflowContext};

// ── Tauri commands (must live here for generate_handler! macro) ───────────

#[tauri::command]
pub async fn automation_sync_workflows(
    state: State<'_, AutomationRuntimeState>,
    app: AppHandle,
    workflows: Vec<AutomationWorkflow>,
    settings: AutomationRuntimeSettings,
) -> Result<(), String> {
    {
        let mut inner = state
            .0
            .lock()
            .map_err(|_| "Automation runtime lock poisoned")?;
        let next_ids: HashSet<String> = workflows
            .iter()
            .map(|workflow| workflow.id.clone())
            .collect();
        let removed_ids: Vec<String> = inner
            .workflows
            .iter()
            .filter(|workflow| !next_ids.contains(&workflow.id))
            .map(|workflow| workflow.id.clone())
            .collect();
        inner.workflows = workflows;
        inner.settings = normalize_settings(settings);
        prune_scheduled_trigger_state(&mut inner);
        for workflow_id in &removed_ids {
            abort_workflow_locked(&mut inner, workflow_id, "deleted");
        }
        let disabled_ids: Vec<String> = inner
            .workflows
            .iter()
            .filter(|workflow| !workflow.enabled)
            .map(|workflow| workflow.id.clone())
            .collect();
        let enabled_ids: Vec<String> = inner
            .workflows
            .iter()
            .filter(|workflow| workflow.enabled)
            .map(|workflow| workflow.id.clone())
            .collect();
        for workflow_id in disabled_ids {
            inner.paused_workflow_ids.insert(workflow_id.clone());
            abort_workflow_locked(&mut inner, &workflow_id, "paused");
        }
        for workflow_id in enabled_ids {
            inner.paused_workflow_ids.remove(&workflow_id);
        }
        purge_deleted_workflows_locked(&mut inner, &removed_ids);
    }
    emit_runtime(&app, &state);
    emit_all_queue_stats(&app, &state);
    ensure_scheduled_trigger_scheduler(app.clone(), &state);
    schedule_live_traffic_queue(app);
    Ok(())
}

#[tauri::command]
pub async fn automation_update_settings(
    state: State<'_, AutomationRuntimeState>,
    app: AppHandle,
    settings: AutomationRuntimeSettings,
) -> Result<(), String> {
    {
        let mut inner = state
            .0
            .lock()
            .map_err(|_| "Automation runtime lock poisoned")?;
        inner.settings = normalize_settings(settings);
    }
    emit_all_queue_stats(&app, &state);
    ensure_scheduled_trigger_scheduler(app.clone(), &state);
    schedule_live_traffic_queue(app);
    Ok(())
}

#[tauri::command]
pub async fn automation_run_workflow(
    state: State<'_, AutomationRuntimeState>,
    app: AppHandle,
    workflow_id: String,
    context: Option<WorkflowContext>,
) -> Result<(), String> {
    let context = context.unwrap_or_default();
    let is_manual_run = context.trigger_type.as_deref() == Some("trigger:manual");
    let run_token = Uuid::new_v4().to_string();

    let workflow = {
        let mut inner = state
            .0
            .lock()
            .map_err(|_| "Automation runtime lock poisoned")?;
        let workflow = inner
            .workflows
            .iter()
            .find(|workflow| workflow.id == workflow_id)
            .cloned();
        if workflow.as_ref().is_some_and(|workflow| workflow.enabled) {
            if is_manual_run && inner.running_workflow_ids.contains(&workflow_id) {
                abort_workflow_locked(&mut inner, &workflow_id, "superseded by manual run");
            }
            inner
                .active_run_token_by_workflow_id
                .insert(workflow_id.clone(), run_token.clone());
        }
        workflow
    };

    let Some(workflow) = workflow else {
        return Err("Workflow is unavailable".to_string());
    };

    if !workflow.enabled {
        return Err("Workflow is paused".to_string());
    }

    let app_for_task = app.clone();
    tauri::async_runtime::spawn(async move {
        run_workflow_task(app_for_task, workflow, context, false, run_token).await;
    });
    Ok(())
}

#[tauri::command]
pub async fn automation_abort_workflow(
    state: State<'_, AutomationRuntimeState>,
    app: AppHandle,
    workflow_id: String,
    reason: Option<String>,
) -> Result<(), String> {
    {
        let mut inner = state
            .0
            .lock()
            .map_err(|_| "Automation runtime lock poisoned")?;
        abort_workflow_locked(
            &mut inner,
            &workflow_id,
            reason.as_deref().unwrap_or("stopped"),
        );
    }
    emit_runtime(&app, &state);
    emit_all_queue_stats(&app, &state);
    schedule_live_traffic_queue(app);
    Ok(())
}

#[tauri::command]
pub async fn automation_pause_workflow(
    state: State<'_, AutomationRuntimeState>,
    app: AppHandle,
    workflow_id: String,
) -> Result<(), String> {
    {
        let mut inner = state
            .0
            .lock()
            .map_err(|_| "Automation runtime lock poisoned")?;
        inner.paused_workflow_ids.insert(workflow_id.clone());
        abort_workflow_locked(&mut inner, &workflow_id, "paused");
    }
    emit_runtime(&app, &state);
    emit_all_queue_stats(&app, &state);
    schedule_live_traffic_queue(app);
    Ok(())
}

#[tauri::command]
pub async fn automation_resume_workflow(
    state: State<'_, AutomationRuntimeState>,
    app: AppHandle,
    workflow_id: String,
) -> Result<(), String> {
    {
        let mut inner = state
            .0
            .lock()
            .map_err(|_| "Automation runtime lock poisoned")?;
        inner.paused_workflow_ids.remove(&workflow_id);
    }
    emit_runtime(&app, &state);
    ensure_scheduled_trigger_scheduler(app.clone(), &state);
    schedule_live_traffic_queue(app);
    Ok(())
}

#[tauri::command]
pub async fn automation_clear_logs(
    state: State<'_, AutomationRuntimeState>,
    workflow_id: Option<String>,
) -> Result<(), String> {
    let mut inner = state
        .0
        .lock()
        .map_err(|_| "Automation runtime lock poisoned")?;
    if let Some(workflow_id) = workflow_id {
        inner.logs_by_workflow_id.remove(&workflow_id);
    } else {
        inner.logs_by_workflow_id.clear();
    }
    Ok(())
}

#[tauri::command]
pub async fn automation_clear_host_insights(
    state: State<'_, AutomationRuntimeState>,
    trigger_node_id: Option<String>,
) -> Result<(), String> {
    let mut inner = state
        .0
        .lock()
        .map_err(|_| "Automation runtime lock poisoned")?;
    if trigger_node_id.is_none() {
        inner.host_insight_ids.clear();
        inner.captured_host_ids.clear();
        return Ok(());
    }
    Ok(())
}

#[tauri::command]
pub async fn automation_ack_host_insight_batch(
    state: State<'_, AutomationRuntimeState>,
    app: AppHandle,
    batch_id: String,
) -> Result<(), String> {
    ack_ui_telemetry_batch(&app, &state, &batch_id);
    Ok(())
}
