use std::{
    collections::{HashSet, VecDeque},
    sync::Mutex,
    time::Duration,
};

use super::types::{AutomationRuntimeInner, QueueJob, TriggerQueueStats};

#[derive(Default)]
pub struct AutomationRuntimeState(pub(crate) Mutex<AutomationRuntimeInner>);

// ── Workflow lifecycle (locked) ───────────────────────────────────────────

pub(crate) fn abort_workflow_locked(
    inner: &mut AutomationRuntimeInner,
    workflow_id: &str,
    reason: &str,
) {
    inner
        .aborted_workflow_ids
        .insert(workflow_id.to_string(), reason.to_string());
    inner.active_run_token_by_workflow_id.remove(workflow_id);
    inner.running_workflow_ids.remove(workflow_id);
    if inner.active_run_workflow_id.as_deref() == Some(workflow_id) {
        inner.active_run_workflow_id = inner.running_workflow_ids.iter().next().cloned();
    }
    inner.executing_node_id = None;
    remove_queued_jobs_for_workflow_locked(inner, workflow_id);
}

pub(crate) fn purge_deleted_workflows_locked(
    inner: &mut AutomationRuntimeInner,
    workflow_ids: &[String],
) {
    let ids: HashSet<&str> = workflow_ids.iter().map(String::as_str).collect();
    inner
        .running_workflow_ids
        .retain(|id| !ids.contains(id.as_str()));
    inner
        .active_run_token_by_workflow_id
        .retain(|id, _| !ids.contains(id.as_str()));
    inner
        .logs_by_workflow_id
        .retain(|id, _| !ids.contains(id.as_str()));
    for workflow_id in workflow_ids {
        remove_queued_jobs_for_workflow_locked(inner, workflow_id);
    }
}

fn remove_queued_jobs_for_workflow_locked(inner: &mut AutomationRuntimeInner, workflow_id: &str) {
    let trigger_ids: Vec<String> = inner.trigger_queues.keys().cloned().collect();
    for trigger_id in trigger_ids {
        if let Some(queue) = inner.trigger_queues.get_mut(&trigger_id) {
            queue.retain(|job| job.workflow_id != workflow_id);
        }
    }
    inner.trigger_queues.retain(|_, queue| !queue.is_empty());
    inner
        .queue_order
        .retain(|trigger_id| inner.trigger_queues.contains_key(trigger_id));
}

// ── Queue management (locked) ─────────────────────────────────────────────

pub(crate) fn enqueue_live_traffic_job_locked(inner: &mut AutomationRuntimeInner, job: QueueJob) {
    let trigger_id = job.trigger_node_id.clone();
    let cap = job.cap;
    let queue = inner.trigger_queues.entry(trigger_id.clone()).or_default();
    queue.push_back(job);
    if !inner.queue_order.iter().any(|id| id == &trigger_id) {
        inner.queue_order.push_back(trigger_id.clone());
    }
    inner
        .queue_stats_by_trigger_id
        .entry(trigger_id.clone())
        .and_modify(|stats| stats.cap = cap)
        .or_insert_with(|| TriggerQueueStats::with_cap(cap));
}

pub(crate) fn pop_next_job_locked(inner: &mut AutomationRuntimeInner) -> Option<QueueJob> {
    let attempts = inner.queue_order.len();
    for _ in 0..attempts {
        let trigger_id = inner.queue_order.pop_front()?;
        let job = inner
            .trigger_queues
            .get_mut(&trigger_id)
            .and_then(VecDeque::pop_front);
        let has_more = inner
            .trigger_queues
            .get(&trigger_id)
            .map(|queue| !queue.is_empty())
            .unwrap_or(false);
        if has_more {
            inner.queue_order.push_back(trigger_id.clone());
        } else {
            inner.trigger_queues.remove(&trigger_id);
        }
        if job.is_some() {
            return job;
        }
    }
    None
}

pub(crate) fn pending_count_locked(inner: &AutomationRuntimeInner, trigger_node_id: &str) -> usize {
    inner
        .trigger_queues
        .get(trigger_node_id)
        .map(VecDeque::len)
        .unwrap_or(0)
}

pub(crate) fn prune_recent_matches_locked(inner: &mut AutomationRuntimeInner, ttl_ms: u64) {
    if ttl_ms == 0 {
        inner.recent_matches.clear();
        return;
    }
    let ttl = Duration::from_millis(ttl_ms);
    inner
        .recent_matches
        .retain(|_, matched_at| matched_at.elapsed() <= ttl);
}

pub(crate) fn cap_host_ids(ids: &mut VecDeque<String>, id: String, limit: usize) {
    ids.push_back(id);
    while ids.len() > limit {
        ids.pop_front();
    }
}
