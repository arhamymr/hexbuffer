import type { AutomationNode, AutomationEdge, AutomationNodeType, NodeConfig } from './types';
import { NODE_TYPE_REGISTRY } from './constants';
import { buildAutomationEdge } from './lib/edges';

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'monitoring' | 'security' | 'crawl' | 'general';
  nodes: TemplateNode[];
  edges: TemplateEdge[];
}

interface TemplateNode {
  type: AutomationNodeType;
  position: { x: number; y: number };
  configOverrides?: Partial<NodeConfig>;
}

interface TemplateEdge {
  sourceIndex: number;
  targetIndex: number;
  sourceHandle?: string;
}

function buildFromTemplate(
  template: WorkflowTemplate
): { nodes: AutomationNode[]; edges: AutomationEdge[] } {
  const nodes: AutomationNode[] = template.nodes.map((tn) => {
    const def = NODE_TYPE_REGISTRY[tn.type];
    return {
      id: crypto.randomUUID(),
      type: tn.type,
      position: tn.position,
      data: {
        label: def.label,
        nodeType: tn.type,
        category: def.category,
        config: { ...def.defaultConfig, ...tn.configOverrides } as NodeConfig,
        iconName: def.iconName,
      },
    };
  });

  const edges: AutomationEdge[] = template.edges.map((te) =>
    buildAutomationEdge({
      id: crypto.randomUUID(),
      source: nodes[te.sourceIndex].id,
      target: nodes[te.targetIndex].id,
      sourceHandle: te.sourceHandle,
    })
  );

  return { nodes, edges };
}

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  // ── Monitoring ─────────────────────────────────────────────────────────────
  {
    id: 'live-traffic-alert',
    name: 'Live Traffic Alert',
    description: 'Monitor live traffic and alert when server errors (5xx) are detected',
    icon: 'Zap',
    category: 'monitoring',
    nodes: [
      { type: 'trigger:live-traffic-captured', position: { x: 100, y: 150 } },
      {
        type: 'condition:status-code',
        position: { x: 380, y: 150 },
        configOverrides: { operator: 'equals', value: '500' } as Partial<NodeConfig>,
      },
      {
        type: 'action:show-notification',
        position: { x: 660, y: 80 },
        configOverrides: {
          params: { title: 'Server Error Detected', body: 'A 5xx response was captured' },
        } as Partial<NodeConfig>,
      },
      { type: 'action:send-to-repeater', position: { x: 660, y: 240 } },
    ],
    edges: [
      { sourceIndex: 0, targetIndex: 1 },
      { sourceIndex: 1, targetIndex: 2, sourceHandle: 'true' },
      { sourceIndex: 1, targetIndex: 3, sourceHandle: 'false' },
    ],
  },
  {
    id: 'port-scan-notify',
    name: 'Port Scan Alert',
    description: 'Send alerts when web ports (80, 443) are discovered during scanning',
    icon: 'Radio',
    category: 'security',
    nodes: [
      { type: 'trigger:port-scan-result', position: { x: 100, y: 150 } },
      {
        type: 'condition:port-open',
        position: { x: 380, y: 100 },
        configOverrides: { operator: 'equals', value: '443' } as Partial<NodeConfig>,
      },
      {
        type: 'condition:port-open',
        position: { x: 380, y: 260 },
        configOverrides: { operator: 'equals', value: '80' } as Partial<NodeConfig>,
      },
      {
        type: 'action:show-notification',
        position: { x: 660, y: 100 },
        configOverrides: {
          params: { title: 'Open Port Found', body: 'A web port was discovered' },
        } as Partial<NodeConfig>,
      },
      {
        type: 'action:send-webhook',
        position: { x: 660, y: 260 },
        configOverrides: { params: { url: '', method: 'POST' } } as Partial<NodeConfig>,
      },
    ],
    edges: [
      { sourceIndex: 0, targetIndex: 1 },
      { sourceIndex: 0, targetIndex: 2 },
      { sourceIndex: 1, targetIndex: 3 },
      { sourceIndex: 2, targetIndex: 4 },
    ],
  },

  // ── Crawl ──────────────────────────────────────────────────────────────────
  {
    id: 'scheduled-crawl',
    name: 'Scheduled Crawl',
    description: 'Run browser crawls on a recurring schedule and notify on initiation',
    icon: 'Clock',
    category: 'crawl',
    nodes: [
      {
        type: 'trigger:scheduled',
        position: { x: 100, y: 150 },
        configOverrides: { schedule: '0 */6 * * *' } as Partial<NodeConfig>,
      },
      { type: 'action:start-crawl', position: { x: 380, y: 80 } },
      { type: 'action:connect-cdp', position: { x: 380, y: 240 } },
      {
        type: 'action:show-notification',
        position: { x: 660, y: 150 },
        configOverrides: {
          params: { title: 'Crawl Started', body: 'Scheduled crawl has been initiated' },
        } as Partial<NodeConfig>,
      },
    ],
    edges: [
      { sourceIndex: 0, targetIndex: 1 },
      { sourceIndex: 0, targetIndex: 2 },
      { sourceIndex: 1, targetIndex: 3 },
      { sourceIndex: 2, targetIndex: 3 },
    ],
  },

  {
    id: 'intercept-review',
    name: 'Smart Intercept Review',
    description: 'Filter intercepted API requests and send them to repeater for manual analysis',
    icon: 'Search',
    category: 'general',
    nodes: [
      { type: 'trigger:intercept-request', position: { x: 100, y: 150 } },
      {
        type: 'condition:url-contains',
        position: { x: 380, y: 150 },
        configOverrides: { operator: 'contains', value: '/api' } as Partial<NodeConfig>,
      },
      { type: 'action:send-to-repeater', position: { x: 660, y: 80 } },
      { type: 'action:ai-analyze', position: { x: 660, y: 240 } },
    ],
    edges: [
      { sourceIndex: 0, targetIndex: 1 },
      { sourceIndex: 1, targetIndex: 2, sourceHandle: 'true' },
      { sourceIndex: 1, targetIndex: 3, sourceHandle: 'false' },
    ],
  },
];

export function createWorkflowFromTemplate(templateId: string): {
  name: string;
  description: string;
  nodes: AutomationNode[];
  edges: AutomationEdge[];
} | null {
  const template = WORKFLOW_TEMPLATES.find((t) => t.id === templateId);
  if (!template) return null;

  const { nodes, edges } = buildFromTemplate(template);
  return {
    name: template.name,
    description: template.description,
    nodes,
    edges,
  };
}
