import type { Node, Edge } from '@xyflow/react';

export type TriggerType =
  | 'trigger:scan-completed'
  | 'trigger:scheduled'
  | 'trigger:manual'
  | 'trigger:browser-page-crawled'
  | 'trigger:intercept-request'
  | 'trigger:websocket-message'
  | 'trigger:port-scan-result'
  | 'trigger:live-traffic-captured';

export type ConditionType =
  | 'condition:status-code'
  | 'condition:url-contains'
  | 'condition:body-contains'
  | 'condition:header-exists'
  | 'condition:severity'
  | 'condition:ai-confidence'
  | 'condition:method'
  | 'condition:content-type'
  | 'condition:response-size'
  | 'condition:crawl-status'
  | 'condition:grep-match'
  | 'condition:port-open';

export type ActionType =
  | 'action:send-to-repeater'
  | 'action:ai-analyze'
  | 'action:create-finding'
  | 'action:add-to-report'
  | 'action:send-webhook'
  | 'action:show-notification'
  | 'action:run-script'
  | 'action:start-crawl'
  | 'action:stop-crawl'
  | 'action:send-to-intercept'
  | 'action:start-invoker'
  | 'action:port-scan'
  | 'action:encode-decode'
  | 'action:hash-data'
  | 'action:export-json'
  | 'action:create-document'
  | 'action:add-to-document'
  | 'action:connect-cdp'
  | 'action:script-analyze';

export type AutomationNodeType = TriggerType | ConditionType | ActionType;

export type NodeCategory = 'trigger' | 'condition' | 'action';

export interface TriggerConfig {
  triggerType: TriggerType;
  schedule?: string;
  host?: string;
  method?: string;
  operator?: 'equals' | 'contains' | 'regex';
  value?: string;
  severity?: string;
  port?: string;
  direction?: 'sent' | 'received';
}

export interface ConditionConfig {
  conditionType: ConditionType;
  dataPath?: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'gt' | 'lt' | 'regex';
  value: string;
}

export interface ActionConfig {
  actionType: ActionType;
  params: Record<string, string>;
}

export type NodeConfig = TriggerConfig | ConditionConfig | ActionConfig;

export interface AutomationNodeData {
  [key: string]: unknown;
  label: string;
  nodeType: AutomationNodeType;
  category: NodeCategory;
  config: NodeConfig;
  iconName: string;
}

export type AutomationNode = Node<AutomationNodeData>;
export type AutomationEdge = Edge;

export interface WorkflowDef {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  nodes: AutomationNode[];
  edges: AutomationEdge[];
  createdAt: string;
  updatedAt: string;
}

export type RunStatus = 'running' | 'completed' | 'failed' | 'cancelled';
export type StepStatus = 'pending' | 'running' | 'passed' | 'failed' | 'skipped';

export interface WorkflowRun {
  id: string;
  workflowId: string;
  status: RunStatus;
  triggerEvent: string;
  triggerPayload: unknown;
  startedAt: string;
  finishedAt: string | null;
  error: string | null;
}

export interface WorkflowRunStep {
  id: string;
  runId: string;
  workflowId: string;
  nodeId: string;
  nodeType: AutomationNodeType;
  nodeLabel: string;
  status: StepStatus;
  inputJson: unknown;
  outputJson: unknown;
  error: string | null;
  startedAt: string | null;
  finishedAt: string | null;
}
