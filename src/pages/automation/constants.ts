import type { AutomationNodeType, NodeCategory, NodeConfig } from './types';

export interface NodeTypeDef {
  type: AutomationNodeType;
  label: string;
  category: NodeCategory;
  iconName: string;
  defaultConfig: NodeConfig;
  description: string;
}

export const NODE_TYPE_REGISTRY: Record<AutomationNodeType, NodeTypeDef> = {
  // ─── Triggers ──────────────────────────────────────────────────────────────
  'trigger:new-request': {
    type: 'trigger:new-request',
    label: 'New Request',
    category: 'trigger',
    iconName: 'Globe',
    description: 'Fires when a new HTTP request is captured',
    defaultConfig: { triggerType: 'trigger:new-request' },
  },
  'trigger:new-response': {
    type: 'trigger:new-response',
    label: 'New Response',
    category: 'trigger',
    iconName: 'Globe',
    description: 'Fires when a new HTTP response is received',
    defaultConfig: { triggerType: 'trigger:new-response' },
  },
  'trigger:finding-created': {
    type: 'trigger:finding-created',
    label: 'Finding Created',
    category: 'trigger',
    iconName: 'Bug',
    description: 'Fires when a vulnerability finding is created',
    defaultConfig: { triggerType: 'trigger:finding-created' },
  },
  'trigger:scan-completed': {
    type: 'trigger:scan-completed',
    label: 'Scan Completed',
    category: 'trigger',
    iconName: 'CheckCircle',
    description: 'Fires when a browser crawl finishes',
    defaultConfig: { triggerType: 'trigger:scan-completed' },
  },
  'trigger:scheduled': {
    type: 'trigger:scheduled',
    label: 'Scheduled',
    category: 'trigger',
    iconName: 'Clock',
    description: 'Runs on a cron schedule',
    defaultConfig: { triggerType: 'trigger:scheduled', schedule: '0 */6 * * *' },
  },
  'trigger:manual': {
    type: 'trigger:manual',
    label: 'Manual',
    category: 'trigger',
    iconName: 'Play',
    description: 'Run manually by clicking a button',
    defaultConfig: { triggerType: 'trigger:manual' },
  },
  'trigger:browser-page-crawled': {
    type: 'trigger:browser-page-crawled',
    label: 'Page Crawled',
    category: 'trigger',
    iconName: 'ScanLine',
    description: 'Fires when a browser page finishes crawling',
    defaultConfig: { triggerType: 'trigger:browser-page-crawled' },
  },
  'trigger:intercept-request': {
    type: 'trigger:intercept-request',
    label: 'Intercept Request',
    category: 'trigger',
    iconName: 'Shield',
    description: 'Fires when a request is intercepted by the proxy',
    defaultConfig: { triggerType: 'trigger:intercept-request' },
  },
  'trigger:websocket-message': {
    type: 'trigger:websocket-message',
    label: 'WebSocket Message',
    category: 'trigger',
    iconName: 'Radio',
    description: 'Fires when a WebSocket message is sent or received',
    defaultConfig: { triggerType: 'trigger:websocket-message' },
  },
  'trigger:port-scan-result': {
    type: 'trigger:port-scan-result',
    label: 'Port Scan Result',
    category: 'trigger',
    iconName: 'Network',
    description: 'Fires when a port scan discovers an open port',
    defaultConfig: { triggerType: 'trigger:port-scan-result' },
  },
  'trigger:inspector-connected': {
    type: 'trigger:inspector-connected',
    label: 'Inspector Connected',
    category: 'trigger',
    iconName: 'Plug',
    description: 'Fires when a CDP session connects to a browser',
    defaultConfig: { triggerType: 'trigger:inspector-connected' },
  },
  'trigger:live-traffic-captured': {
    type: 'trigger:live-traffic-captured',
    label: 'Live Traffic Captured',
    category: 'trigger',
    iconName: 'Activity',
    description: 'Fires when live traffic captures a new request',
    defaultConfig: {
      triggerType: 'trigger:live-traffic-captured',
      host: '',
      operator: 'contains',
      value: '',
    },
  },

  // ─── Conditions ─────────────────────────────────────────────────────────────
  'condition:status-code': {
    type: 'condition:status-code',
    label: 'Status Code',
    category: 'condition',
    iconName: 'Filter',
    description: 'Check if HTTP status code matches a value',
    defaultConfig: { conditionType: 'condition:status-code', operator: 'equals', value: '500' },
  },
  'condition:url-contains': {
    type: 'condition:url-contains',
    label: 'URL Contains',
    category: 'condition',
    iconName: 'Filter',
    description: 'Check if the URL contains a keyword',
    defaultConfig: { conditionType: 'condition:url-contains', operator: 'contains', value: '/api' },
  },
  'condition:body-contains': {
    type: 'condition:body-contains',
    label: 'Body Contains',
    category: 'condition',
    iconName: 'Filter',
    description: 'Check if response body contains text',
    defaultConfig: { conditionType: 'condition:body-contains', operator: 'contains', value: '' },
  },
  'condition:header-exists': {
    type: 'condition:header-exists',
    label: 'Header Exists',
    category: 'condition',
    iconName: 'Filter',
    description: 'Check if a specific header is present',
    defaultConfig: { conditionType: 'condition:header-exists', operator: 'equals', value: 'X-API-Key' },
  },
  'condition:severity': {
    type: 'condition:severity',
    label: 'Severity',
    category: 'condition',
    iconName: 'Filter',
    description: 'Check if finding severity matches',
    defaultConfig: { conditionType: 'condition:severity', operator: 'equals', value: 'high' },
  },
  'condition:ai-confidence': {
    type: 'condition:ai-confidence',
    label: 'AI Confidence',
    category: 'condition',
    iconName: 'Filter',
    description: 'Check if AI confidence is above threshold',
    defaultConfig: { conditionType: 'condition:ai-confidence', operator: 'gt', value: '80' },
  },
  'condition:method': {
    type: 'condition:method',
    label: 'HTTP Method',
    category: 'condition',
    iconName: 'Filter',
    description: 'Check if the HTTP method matches (GET, POST, PUT, etc.)',
    defaultConfig: { conditionType: 'condition:method', operator: 'equals', value: 'GET' },
  },
  'condition:content-type': {
    type: 'condition:content-type',
    label: 'Content-Type',
    category: 'condition',
    iconName: 'Filter',
    description: 'Check if Content-Type header matches',
    defaultConfig: { conditionType: 'condition:content-type', operator: 'contains', value: 'application/json' },
  },
  'condition:response-size': {
    type: 'condition:response-size',
    label: 'Response Size',
    category: 'condition',
    iconName: 'Filter',
    description: 'Check if response body size exceeds threshold (bytes)',
    defaultConfig: { conditionType: 'condition:response-size', operator: 'gt', value: '1024' },
  },
  'condition:crawl-status': {
    type: 'condition:crawl-status',
    label: 'Crawl Status',
    category: 'condition',
    iconName: 'Filter',
    description: 'Check crawl page status (queued, visited, error, blocked)',
    defaultConfig: { conditionType: 'condition:crawl-status', operator: 'equals', value: 'error' },
  },
  'condition:grep-match': {
    type: 'condition:grep-match',
    label: 'Grep Match',
    category: 'condition',
    iconName: 'Filter',
    description: 'Check if a grep pattern matches the response',
    defaultConfig: { conditionType: 'condition:grep-match', operator: 'regex', value: '' },
  },
  'condition:port-open': {
    type: 'condition:port-open',
    label: 'Port Open',
    category: 'condition',
    iconName: 'Filter',
    description: 'Check if a specific port was found open in scan results',
    defaultConfig: { conditionType: 'condition:port-open', operator: 'equals', value: '443' },
  },

  // ─── Actions ────────────────────────────────────────────────────────────────
  'action:send-to-repeater': {
    type: 'action:send-to-repeater',
    label: 'Send to Repeater',
    category: 'action',
    iconName: 'RefreshCw',
    description: 'Send the request to the Repeater tool',
    defaultConfig: { actionType: 'action:send-to-repeater', params: {} },
  },
  'action:ai-analyze': {
    type: 'action:ai-analyze',
    label: 'AI Analyze',
    category: 'action',
    iconName: 'Sparkles',
    description: 'Run AI analysis on the request/response',
    defaultConfig: { actionType: 'action:ai-analyze', params: {} },
  },
  'action:create-finding': {
    type: 'action:create-finding',
    label: 'Create Finding',
    category: 'action',
    iconName: 'Bug',
    description: 'Create a vulnerability finding',
    defaultConfig: { actionType: 'action:create-finding', params: { severity: 'medium' } },
  },
  'action:add-to-report': {
    type: 'action:add-to-report',
    label: 'Add to Report',
    category: 'action',
    iconName: 'FileText',
    description: 'Add findings to a document report',
    defaultConfig: {
      actionType: 'action:add-to-report',
      params: {
        section: '',
        title: 'Workflow Report',
        content: '',
        mode: 'append',
      },
    },
  },
  'action:send-webhook': {
    type: 'action:send-webhook',
    label: 'Send Webhook',
    category: 'action',
    iconName: 'Webhook',
    description: 'Send data to an external webhook URL',
    defaultConfig: { actionType: 'action:send-webhook', params: { url: '', method: 'POST' } },
  },
  'action:show-notification': {
    type: 'action:show-notification',
    label: 'Notification',
    category: 'action',
    iconName: 'Bell',
    description: 'Show a desktop notification',
    defaultConfig: { actionType: 'action:show-notification', params: { title: 'Workflow Alert', body: '' } },
  },
  'action:run-script': {
    type: 'action:run-script',
    label: 'Run Script',
    category: 'action',
    iconName: 'Terminal',
    description: 'Execute a custom shell script',
    defaultConfig: { actionType: 'action:run-script', params: { command: '' } },
  },
  'action:start-crawl': {
    type: 'action:start-crawl',
    label: 'Start Crawl',
    category: 'action',
    iconName: 'ScanLine',
    description: 'Start a browser crawl against the target URL',
    defaultConfig: { actionType: 'action:start-crawl', params: { url: '', maxDepth: '3' } },
  },
  'action:stop-crawl': {
    type: 'action:stop-crawl',
    label: 'Stop Crawl',
    category: 'action',
    iconName: 'Square',
    description: 'Stop the currently running browser crawl',
    defaultConfig: { actionType: 'action:stop-crawl', params: {} },
  },
  'action:send-to-intercept': {
    type: 'action:send-to-intercept',
    label: 'Send to Intercept',
    category: 'action',
    iconName: 'Shield',
    description: 'Send a request to the intercept queue',
    defaultConfig: { actionType: 'action:send-to-intercept', params: {} },
  },
  'action:start-invoker': {
    type: 'action:start-invoker',
    label: 'Start Invoker',
    category: 'action',
    iconName: 'Zap',
    description: 'Launch an Invoker attack against a target',
    defaultConfig: { actionType: 'action:start-invoker', params: { mode: 'sniper' } },
  },
  'action:port-scan': {
    type: 'action:port-scan',
    label: 'Port Scan',
    category: 'action',
    iconName: 'Network',
    description: 'Run a port scan against a target host',
    defaultConfig: { actionType: 'action:port-scan', params: { target: '', preset: 'web' } },
  },
  'action:encode-decode': {
    type: 'action:encode-decode',
    label: 'Encode / Decode',
    category: 'action',
    iconName: 'Code',
    description: 'Encode or decode data (URL, Base64, Hex)',
    defaultConfig: { actionType: 'action:encode-decode', params: { mode: 'encode', codec: 'url' } },
  },
  'action:hash-data': {
    type: 'action:hash-data',
    label: 'Hash Data',
    category: 'action',
    iconName: 'Hash',
    description: 'Hash input data (MD5, SHA-256, SHA-512, etc.)',
    defaultConfig: { actionType: 'action:hash-data', params: { algorithm: 'sha256' } },
  },
  'action:export-json': {
    type: 'action:export-json',
    label: 'Export JSON',
    category: 'action',
    iconName: 'Download',
    description: 'Export workflow data as a JSON file',
    defaultConfig: { actionType: 'action:export-json', params: { filename: '' } },
  },
  'action:create-document': {
    type: 'action:create-document',
    label: 'Create Document',
    category: 'action',
    iconName: 'FilePlus',
    description: 'Create a new document from a template',
    defaultConfig: { actionType: 'action:create-document', params: { template: 'blank' } },
  },
  'action:add-to-document': {
    type: 'action:add-to-document',
    label: 'Add to Document',
    category: 'action',
    iconName: 'FileText',
    description: 'Append data to an existing document section',
    defaultConfig: { actionType: 'action:add-to-document', params: { section: '' } },
  },
  'action:connect-cdp': {
    type: 'action:connect-cdp',
    label: 'Connect Inspector',
    category: 'action',
    iconName: 'Plug',
    description: 'Start a CDP session to inspect a browser tab',
    defaultConfig: { actionType: 'action:connect-cdp', params: {} },
  },
  'action:script-analyze': {
    type: 'action:script-analyze',
    label: 'Script Analyzer',
    category: 'action',
    iconName: 'FileCode',
    description: 'Analyze a shell script for security insights',
    defaultConfig: { actionType: 'action:script-analyze', params: {} },
  },
};

export const NODE_CATEGORY_GROUPS: { category: NodeCategory; label: string }[] = [
  { category: 'trigger', label: 'Triggers' },
  { category: 'condition', label: 'Conditions' },
  { category: 'action', label: 'Actions' },
];

export const CATEGORY_BORDER: Record<NodeCategory, string> = {
  trigger: 'border-blue-500/50',
  condition: 'border-amber-500/50',
  action: 'border-emerald-500/50',
};

export const CATEGORY_BG: Record<NodeCategory, string> = {
  trigger: 'bg-background',
  condition: 'bg-background',
  action: 'bg-background',
};

export const CATEGORY_ICON_BG: Record<NodeCategory, string> = {
  trigger: 'bg-blue-500/20',
  condition: 'bg-amber-500/20',
  action: 'bg-emerald-500/20',
};

export const CATEGORY_ICON_TEXT: Record<NodeCategory, string> = {
  trigger: 'text-blue-600 dark:text-blue-400',
  condition: 'text-amber-600 dark:text-amber-400',
  action: 'text-emerald-600 dark:text-emerald-400',
};

export const CATEGORY_HANDLE: Record<NodeCategory, string> = {
  trigger: '!bg-blue-500 !border-background hover:!bg-blue-600',
  condition: '!bg-amber-500 !border-background hover:!bg-amber-600',
  action: '!bg-emerald-500 !border-background hover:!bg-emerald-600',
};

export const DEFAULT_WORKFLOW_NAME = 'Untitled Workflow';

let nodeCounter = 0;

export function makeNodeId(type: AutomationNodeType): string {
  return `${type.split(':')[1]}-${Date.now()}-${++nodeCounter}`;
}
