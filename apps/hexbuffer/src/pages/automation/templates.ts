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
    id: 'api-error-triage',
    name: 'API Error Triage',
    description: 'Catch failing API responses, analyze them, and create a tracked finding',
    icon: 'Bug',
    category: 'monitoring',
    nodes: [
      {
        type: 'trigger:live-traffic-captured',
        position: { x: 100, y: 170 },
        configOverrides: { operator: 'contains', value: '/api' } as Partial<NodeConfig>,
      },
      {
        type: 'condition:status-code',
        position: { x: 380, y: 170 },
        configOverrides: { operator: 'gt', value: '499' } as Partial<NodeConfig>,
      },
      { type: 'action:ai-analyze', position: { x: 660, y: 90 } },
      {
        type: 'action:create-finding',
        position: { x: 940, y: 90 },
        configOverrides: {
          params: {
            title: 'API server error',
            severity: 'medium',
            description: 'Automation detected a failing API response.',
            evidenceSource: 'payload',
          },
        } as Partial<NodeConfig>,
      },
      {
        type: 'action:show-notification',
        position: { x: 660, y: 250 },
        configOverrides: {
          params: { title: 'API Error Captured', body: 'A failing API response needs review.' },
        } as Partial<NodeConfig>,
      },
    ],
    edges: [
      { sourceIndex: 0, targetIndex: 1 },
      { sourceIndex: 1, targetIndex: 2, sourceHandle: 'true' },
      { sourceIndex: 2, targetIndex: 3 },
      { sourceIndex: 1, targetIndex: 4, sourceHandle: 'true' },
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
  {
    id: 'exposed-service-review',
    name: 'Exposed Service Review',
    description: 'Review discovered admin or database ports and export supporting scan data',
    icon: 'Network',
    category: 'security',
    nodes: [
      { type: 'trigger:port-scan-result', position: { x: 100, y: 170 } },
      {
        type: 'condition:port-open',
        position: { x: 380, y: 100 },
        configOverrides: { operator: 'equals', value: '8080' } as Partial<NodeConfig>,
      },
      {
        type: 'condition:port-open',
        position: { x: 380, y: 260 },
        configOverrides: { operator: 'equals', value: '3306' } as Partial<NodeConfig>,
      },
      {
        type: 'action:create-finding',
        position: { x: 660, y: 100 },
        configOverrides: {
          params: {
            title: 'Admin service exposed',
            severity: 'medium',
            description: 'An administrative web service was discovered.',
            evidenceSource: 'payload',
          },
        } as Partial<NodeConfig>,
      },
      {
        type: 'action:export-json',
        position: { x: 660, y: 260 },
        configOverrides: {
          params: { filename: 'open-service-scan.json', format: 'pretty', source: 'payload' },
        } as Partial<NodeConfig>,
      },
    ],
    edges: [
      { sourceIndex: 0, targetIndex: 1 },
      { sourceIndex: 0, targetIndex: 2 },
      { sourceIndex: 1, targetIndex: 3, sourceHandle: 'true' },
      { sourceIndex: 2, targetIndex: 4, sourceHandle: 'true' },
    ],
  },
  {
    id: 'credential-leak-watch',
    name: 'Credential Leak Watch',
    description: 'Detect sensitive response patterns and append evidence to a report',
    icon: 'Shield',
    category: 'security',
    nodes: [
      { type: 'trigger:live-traffic-captured', position: { x: 100, y: 150 } },
      {
        type: 'condition:grep-match',
        position: { x: 380, y: 150 },
        configOverrides: {
          operator: 'regex',
          value: '(api[_-]?key|secret|token|password)',
        } as Partial<NodeConfig>,
      },
      { type: 'action:ai-analyze', position: { x: 660, y: 80 } },
      {
        type: 'action:add-to-report',
        position: { x: 940, y: 80 },
        configOverrides: {
          params: {
            section: 'Sensitive Data Exposure',
            title: 'Credential Leak Evidence',
            content: '{{payload}}',
            mode: 'append',
          },
        } as Partial<NodeConfig>,
      },
      { type: 'action:send-to-repeater', position: { x: 660, y: 240 } },
    ],
    edges: [
      { sourceIndex: 0, targetIndex: 1 },
      { sourceIndex: 1, targetIndex: 2, sourceHandle: 'true' },
      { sourceIndex: 2, targetIndex: 3 },
      { sourceIndex: 1, targetIndex: 4, sourceHandle: 'true' },
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
    id: 'crawl-error-capture',
    name: 'Crawl Error Capture',
    description: 'Capture crawl page errors, notify the tester, and export the crawl payload',
    icon: 'ScanLine',
    category: 'crawl',
    nodes: [
      { type: 'trigger:browser-page-crawled', position: { x: 100, y: 150 } },
      {
        type: 'condition:crawl-status',
        position: { x: 380, y: 150 },
        configOverrides: { operator: 'equals', value: 'error' } as Partial<NodeConfig>,
      },
      {
        type: 'action:show-notification',
        position: { x: 660, y: 80 },
        configOverrides: {
          params: { title: 'Crawl Error', body: 'A crawl page failed and was exported.' },
        } as Partial<NodeConfig>,
      },
      {
        type: 'action:export-json',
        position: { x: 660, y: 240 },
        configOverrides: {
          params: { filename: 'crawl-error.json', format: 'pretty', source: 'payload' },
        } as Partial<NodeConfig>,
      },
    ],
    edges: [
      { sourceIndex: 0, targetIndex: 1 },
      { sourceIndex: 1, targetIndex: 2, sourceHandle: 'true' },
      { sourceIndex: 1, targetIndex: 3, sourceHandle: 'true' },
    ],
  },
  {
    id: 'page-script-review',
    name: 'Page Script Review',
    description: 'Analyze JavaScript-heavy pages during crawl and document suspicious script behavior',
    icon: 'FileCode',
    category: 'crawl',
    nodes: [
      { type: 'trigger:browser-page-crawled', position: { x: 100, y: 150 } },
      {
        type: 'condition:content-type',
        position: { x: 380, y: 150 },
        configOverrides: { operator: 'contains', value: 'javascript' } as Partial<NodeConfig>,
      },
      { type: 'action:script-analyze', position: { x: 660, y: 80 } },
      {
        type: 'action:add-to-document',
        position: { x: 940, y: 80 },
        configOverrides: {
          params: {
            documentId: '',
            section: 'Client-side Script Review',
            content: '{{payload}}',
          },
        } as Partial<NodeConfig>,
      },
      { type: 'action:connect-cdp', position: { x: 660, y: 240 } },
    ],
    edges: [
      { sourceIndex: 0, targetIndex: 1 },
      { sourceIndex: 1, targetIndex: 2, sourceHandle: 'true' },
      { sourceIndex: 2, targetIndex: 3 },
      { sourceIndex: 1, targetIndex: 4, sourceHandle: 'true' },
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
  {
    id: 'manual-payload-lab',
    name: 'Manual Payload Lab',
    description: 'Run a request through repeater, encoding, hashing, and JSON export steps',
    icon: 'Code',
    category: 'general',
    nodes: [
      { type: 'trigger:manual', position: { x: 100, y: 180 } },
      { type: 'action:send-to-repeater', position: { x: 380, y: 80 } },
      {
        type: 'action:encode-decode',
        position: { x: 380, y: 220 },
        configOverrides: {
          params: { mode: 'encode', codec: 'url', sourceField: 'body' },
        } as Partial<NodeConfig>,
      },
      {
        type: 'action:hash-data',
        position: { x: 660, y: 220 },
        configOverrides: {
          params: { algorithm: 'sha256', sourceField: 'body' },
        } as Partial<NodeConfig>,
      },
      {
        type: 'action:export-json',
        position: { x: 940, y: 220 },
        configOverrides: {
          params: { filename: 'payload-lab.json', format: 'pretty', source: 'payload' },
        } as Partial<NodeConfig>,
      },
    ],
    edges: [
      { sourceIndex: 0, targetIndex: 1 },
      { sourceIndex: 0, targetIndex: 2 },
      { sourceIndex: 2, targetIndex: 3 },
      { sourceIndex: 3, targetIndex: 4 },
    ],
  },
  {
    id: 'websocket-token-review',
    name: 'WebSocket Token Review',
    description: 'Inspect WebSocket messages for token exposure and send matches to a webhook',
    icon: 'Radio',
    category: 'general',
    nodes: [
      {
        type: 'trigger:websocket-message',
        position: { x: 100, y: 150 },
        configOverrides: { direction: 'received', operator: 'contains', value: 'token' } as Partial<NodeConfig>,
      },
      {
        type: 'condition:body-contains',
        position: { x: 380, y: 150 },
        configOverrides: { operator: 'contains', value: 'token' } as Partial<NodeConfig>,
      },
      {
        type: 'action:send-webhook',
        position: { x: 660, y: 80 },
        configOverrides: { params: { url: '', method: 'POST' } } as Partial<NodeConfig>,
      },
      {
        type: 'action:show-notification',
        position: { x: 660, y: 240 },
        configOverrides: {
          params: { title: 'WebSocket Token Match', body: 'A token-like WebSocket message was captured.' },
        } as Partial<NodeConfig>,
      },
    ],
    edges: [
      { sourceIndex: 0, targetIndex: 1 },
      { sourceIndex: 1, targetIndex: 2, sourceHandle: 'true' },
      { sourceIndex: 1, targetIndex: 3, sourceHandle: 'true' },
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
