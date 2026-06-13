import type {
  ActionConfig,
  AutomationNode,
  ConditionConfig,
  NodeConfig,
  TriggerConfig,
  WorkflowDef,
} from '../types';

export interface WorkflowReadiness {
  ready: boolean;
  reason: string | null;
}

function isBlank(value: unknown): boolean {
  return typeof value !== 'string' || value.trim().length === 0;
}

function getConfig(node: AutomationNode): NodeConfig | null {
  return (node.data?.config as NodeConfig | undefined) ?? null;
}

function getNodeIssue(node: AutomationNode): string | null {
  const config = getConfig(node);
  if (!config) return `${node.data?.label ?? 'Node'} is missing config`;

  if ('triggerType' in config) {
    const triggerConfig = config as TriggerConfig;
    if (triggerConfig.triggerType === 'trigger:scheduled' && isBlank(triggerConfig.schedule)) {
      return 'Scheduled trigger needs a cron schedule';
    }
    if (triggerConfig.triggerType === 'trigger:live-traffic-captured' && isBlank(triggerConfig.host)) {
      return 'Live Traffic Captured needs at least one host';
    }
    return null;
  }

  if ('conditionType' in config) {
    const conditionConfig = config as ConditionConfig;
    if (conditionConfig.conditionType !== 'condition:header-exists' && isBlank(conditionConfig.value)) {
      return `${node.data?.label ?? 'Condition'} needs a value`;
    }
    return null;
  }

  if ('actionType' in config) {
    const actionConfig = config as ActionConfig;
    const params = actionConfig.params ?? {};
    switch (actionConfig.actionType) {
      case 'action:send-to-repeater':
        return isBlank(params.tabName) ? 'Send to Repeater action needs a tab name' : null;
      case 'action:ai-analyze':
        return isBlank(params.prompt) ? 'AI Analyze action needs a prompt' : null;
      case 'action:create-finding':
        if (isBlank(params.title)) return 'Create Finding action needs a title';
        return isBlank(params.description) ? 'Create Finding action needs a description' : null;
      case 'action:send-webhook':
        return isBlank(params.url) ? 'Webhook action needs a URL' : null;
      case 'action:show-notification':
        return isBlank(params.title) ? 'Notification action needs a title' : null;
      case 'action:run-script':
        return isBlank(params.command) ? 'Run Script action needs a command' : null;
      case 'action:start-crawl':
        return isBlank(params.url) ? 'Start Crawl action needs a target URL' : null;
      case 'action:stop-crawl':
        return isBlank(params.crawlId) ? 'Stop Crawl action needs a crawl ID' : null;
      case 'action:port-scan':
        return isBlank(params.target) ? 'Port Scan action needs a target host' : null;
      case 'action:export-json':
        return isBlank(params.filename) ? 'Export JSON action needs a filename' : null;
      case 'action:create-document':
        return isBlank(params.title) ? 'Create Document action needs a title' : null;
      case 'action:add-to-report':
        return isBlank(params.content) ? 'Add to Report action needs content' : null;
      case 'action:add-to-document':
        if (isBlank(params.section)) return 'Add to Document action needs a section';
        return isBlank(params.content) ? 'Add to Document action needs content' : null;
      case 'action:connect-cdp':
        return isBlank(params.targetUrl) ? 'Connect Inspector action needs a target URL' : null;
      default:
        return null;
    }
  }

  return null;
}

export function getWorkflowReadiness(workflow: Pick<WorkflowDef, 'nodes' | 'edges'> | null | undefined): WorkflowReadiness {
  if (!workflow) return { ready: false, reason: 'Workflow is unavailable' };

  const nodes = (workflow.nodes ?? []) as AutomationNode[];
  const edges = workflow.edges ?? [];

  if (nodes.length === 0) {
    return { ready: false, reason: 'Add at least one node before running' };
  }

  const hasTrigger = nodes.some((node) => String(node.type ?? '').startsWith('trigger:'));
  if (!hasTrigger) {
    return { ready: false, reason: 'Add a trigger node before running' };
  }

  const targets = new Set(edges.map((edge) => edge.target));
  const hasStartNode = nodes.some((node) => !targets.has(node.id));
  if (!hasStartNode) {
    return { ready: false, reason: 'Add a starting node with no incoming edge' };
  }

  for (const node of nodes) {
    const issue = getNodeIssue(node);
    if (issue) return { ready: false, reason: issue };
  }

  return { ready: true, reason: null };
}
