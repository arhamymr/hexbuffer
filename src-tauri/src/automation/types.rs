use std::{
    collections::{HashMap, HashSet, VecDeque},
    time::Instant,
};

use serde::{Deserialize, Serialize};
use serde_json::Value;

use super::events::ExecutionLogEvent;

pub(crate) const LIVE_TRAFFIC_TRIGGER_TYPE: &str = "trigger:live-traffic-captured";
pub(crate) const SCHEDULED_TRIGGER_TYPE: &str = "trigger:scheduled";
pub(crate) const AUTOMATION_LOG_LIMIT: usize = 500;
pub(crate) const LIVE_TRAFFIC_HOST_INSIGHT_LIMIT: usize = 200;
pub(crate) const LIVE_TRAFFIC_UI_TELEMETRY_BATCH_LIMIT: usize = 20;
pub(crate) const AUTOMATION_UI_TELEMETRY_THROTTLE_MS: u64 = 1000;

// ── Settings ──────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AutomationRuntimeSettings {
    #[serde(default = "default_live_traffic_concurrency")]
    pub live_traffic_concurrency: usize,
    #[serde(default = "default_filtered_trigger_queue_cap")]
    pub filtered_trigger_queue_cap: usize,
    #[serde(default = "default_catch_all_trigger_queue_cap")]
    pub catch_all_trigger_queue_cap: usize,
    #[serde(default = "default_recent_match_dedupe_ttl_ms")]
    pub recent_match_dedupe_ttl_ms: u64,
    #[serde(default)]
    pub allow_run_script_actions: bool,
}

impl Default for AutomationRuntimeSettings {
    fn default() -> Self {
        Self {
            live_traffic_concurrency: default_live_traffic_concurrency(),
            filtered_trigger_queue_cap: default_filtered_trigger_queue_cap(),
            catch_all_trigger_queue_cap: default_catch_all_trigger_queue_cap(),
            recent_match_dedupe_ttl_ms: default_recent_match_dedupe_ttl_ms(),
            allow_run_script_actions: false,
        }
    }
}

fn default_live_traffic_concurrency() -> usize {
    1
}

fn default_filtered_trigger_queue_cap() -> usize {
    100
}

fn default_catch_all_trigger_queue_cap() -> usize {
    25
}

fn default_recent_match_dedupe_ttl_ms() -> u64 {
    2000
}

// ── Workflow / Node / Edge ────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct AutomationWorkflow {
    pub id: String,
    pub name: String,
    #[serde(default = "default_workflow_enabled")]
    pub enabled: bool,
    #[serde(default)]
    pub nodes: Vec<AutomationNode>,
    #[serde(default)]
    pub edges: Vec<AutomationEdge>,
}

fn default_workflow_enabled() -> bool {
    true
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct AutomationNode {
    pub id: String,
    #[serde(default, rename = "type")]
    pub node_type: Option<String>,
    #[serde(default)]
    pub data: AutomationNodeData,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct AutomationNodeData {
    #[serde(default)]
    pub label: Option<String>,
    #[serde(default)]
    pub node_type: Option<String>,
    #[serde(default)]
    pub config: Value,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct AutomationEdge {
    pub source: String,
    pub target: String,
    #[serde(default)]
    pub source_handle: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct WorkflowContext {
    #[serde(default)]
    pub trigger_type: Option<String>,
    #[serde(default)]
    pub trigger_node_id: Option<String>,
    #[serde(default)]
    pub data: Value,
}

// ── Node helpers ──────────────────────────────────────────────────────────

pub(crate) fn node_effective_type(node: &AutomationNode) -> String {
    node.data
        .node_type
        .clone()
        .or_else(|| node.node_type.clone())
        .unwrap_or_default()
}

pub(crate) fn node_label(node: &AutomationNode) -> String {
    node.data
        .label
        .clone()
        .unwrap_or_else(|| node_effective_type(node))
        .trim()
        .to_string()
}

pub(crate) fn config_string(config: &Value, key: &str) -> String {
    config
        .get(key)
        .and_then(Value::as_str)
        .unwrap_or_default()
        .to_string()
}

// ── Events ────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct NodeRuntimeEvent {
    pub node_id: String,
    pub workflow_id: String,
    pub status: String,
    pub message: String,
    pub updated_at: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub input_data: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub output_data: Option<Value>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct WorkflowRuntimeEvent {
    pub running_workflow_ids: Vec<String>,
    pub active_run_workflow_id: Option<String>,
    pub executing_node_id: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct LiveTrafficHostInsightEvent {
    pub id: String,
    pub workflow_id: String,
    pub workflow_name: String,
    pub trigger_node_id: String,
    pub trigger_node_label: String,
    pub host: String,
    pub method: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub status: Option<u16>,
    pub path: String,
    pub matched_at: String,
}

#[derive(Debug, Clone)]
pub(crate) enum AutomationUiTelemetryItem {
    HostInsight(LiveTrafficHostInsightEvent),
    CapturedHost(LiveTrafficHostInsightEvent),
    RemoveHostInsight(String),
    ExecutionLog(ExecutionLogEvent),
    NodeRuntime(NodeRuntimeEvent),
    WorkflowRuntime(WorkflowRuntimeEvent),
    WorkflowRuntimeClear(String),
    QueueStats(LiveTrafficQueueStatsEvent),
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct AutomationUiTelemetryBatchEvent {
    pub batch_id: String,
    pub host_insights: Vec<LiveTrafficHostInsightEvent>,
    pub captured_hosts: Vec<LiveTrafficHostInsightEvent>,
    pub remove_host_insight_ids: Vec<String>,
    pub logs: Vec<ExecutionLogEvent>,
    pub node_runtimes: Vec<NodeRuntimeEvent>,
    pub workflow_runtimes: Vec<WorkflowRuntimeEvent>,
    pub workflow_runtime_clear_ids: Vec<String>,
    pub queue_stats: Vec<LiveTrafficQueueStatsEvent>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct LiveTrafficQueueStatsEvent {
    pub trigger_node_id: String,
    pub pending: usize,
    pub dropped: usize,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_dropped_at: Option<String>,
    pub cap: usize,
}

// ── Queue ─────────────────────────────────────────────────────────────────

#[derive(Debug, Clone)]
pub(crate) struct QueueJob {
    pub id: String,
    pub workflow_id: String,
    pub trigger_node_id: String,
    pub trigger_node_label: String,
    pub cap: usize,
    pub context: WorkflowContext,
}

#[derive(Debug, Clone)]
pub(crate) struct TriggerQueueStats {
    pub dropped: usize,
    pub last_dropped_at: Option<String>,
    pub cap: usize,
}

impl TriggerQueueStats {
    pub fn with_cap(cap: usize) -> Self {
        Self {
            dropped: 0,
            last_dropped_at: None,
            cap,
        }
    }
}

// ── Runtime inner state ───────────────────────────────────────────────────

#[derive(Default)]
pub(crate) struct AutomationRuntimeInner {
    pub workflows: Vec<AutomationWorkflow>,
    pub settings: AutomationRuntimeSettings,
    pub running_workflow_ids: HashSet<String>,
    pub active_run_token_by_workflow_id: HashMap<String, String>,
    pub active_run_workflow_id: Option<String>,
    pub executing_node_id: Option<String>,
    pub aborted_workflow_ids: HashMap<String, String>,
    pub paused_workflow_ids: HashSet<String>,
    pub trigger_queues: HashMap<String, VecDeque<QueueJob>>,
    pub queue_order: VecDeque<String>,
    pub active_live_traffic_jobs: usize,
    pub queue_stats_by_trigger_id: HashMap<String, TriggerQueueStats>,
    pub recent_matches: HashMap<String, Instant>,
    pub scheduled_last_run_by_trigger_id: HashMap<String, Instant>,
    pub scheduled_scheduler_started: bool,
    pub logs_by_workflow_id: HashMap<String, VecDeque<ExecutionLogEvent>>,
    pub host_insight_ids: VecDeque<String>,
    pub captured_host_ids: VecDeque<String>,
    pub ui_telemetry_queue: VecDeque<AutomationUiTelemetryItem>,
    pub ui_telemetry_in_flight_batch_id: Option<String>,
    pub ui_telemetry_last_emit_at: Option<Instant>,
    pub ui_telemetry_emit_scheduled: bool,
}

pub(crate) fn normalize_settings(settings: AutomationRuntimeSettings) -> AutomationRuntimeSettings {
    AutomationRuntimeSettings {
        live_traffic_concurrency: settings.live_traffic_concurrency.clamp(1, 8),
        filtered_trigger_queue_cap: settings.filtered_trigger_queue_cap.clamp(1, 1000),
        catch_all_trigger_queue_cap: settings.catch_all_trigger_queue_cap.clamp(1, 250),
        recent_match_dedupe_ttl_ms: settings.recent_match_dedupe_ttl_ms.min(10000),
        allow_run_script_actions: settings.allow_run_script_actions,
    }
}
