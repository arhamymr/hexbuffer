import type { AutomationEdge, AutomationNodeData, AutomationNodeType, NodeCategory } from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// Node Capability Catalog — the single file to map, inspect, and upgrade all
// automation node types. Add new nodes, flip capability flags, or update I/O
// schemas here to instantly propagate changes across every node component.
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AutomationNodeCapability {
  supported: boolean;
  reason: string | null;
}

export interface DataSchemaField {
  key: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
}

export interface NodeDataSchema {
  input: DataSchemaField[];
  output: DataSchemaField[];
}

export interface NodeProfile {
  type: AutomationNodeType;
  category: NodeCategory;
  wired: boolean;
  reason: string | null;
  sourceHandleIds: string[];
  sourceHandleLabels: Record<string, string>;
  targetHandleRequired: boolean;
  dataSchema: NodeDataSchema;
}

// ─── Shared Data Schema Fragments ─────────────────────────────────────────────

/** Standard HTTP/traffic context that flows through trigger → condition → action. */
const HTTP_CONTEXT_INPUT: DataSchemaField[] = [
  { key: 'url', label: 'URL', type: 'string', description: 'Full request URL' },
  { key: 'method', label: 'Method', type: 'string', description: 'HTTP method (GET, POST, …)' },
  { key: 'statusCode', label: 'Status Code', type: 'number', description: 'HTTP response status' },
  { key: 'host', label: 'Host', type: 'string', description: 'Target hostname' },
  { key: 'headers', label: 'Headers', type: 'object', description: 'Request / response headers' },
  { key: 'body', label: 'Body', type: 'string', description: 'Response body content' },
  { key: 'timestamp', label: 'Timestamp', type: 'string', description: 'When the event occurred' },
];

/** Condition nodes add a `match` boolean to the output. */
const CONDITION_OUTPUT: DataSchemaField[] = [
  ...HTTP_CONTEXT_INPUT,
  { key: 'match', label: 'Match', type: 'boolean', description: 'Whether the condition evaluated to true' },
];

/** Action nodes pass through the HTTP context and may add result fields. */
const ACTION_OUTPUT_BASE: DataSchemaField[] = [
  ...HTTP_CONTEXT_INPUT,
];

/** Empty schema for nodes with no input (triggers). */
const NO_INPUT: DataSchemaField[] = [];

/** Empty schema for nodes with no / manual-only output. */
const NO_OUTPUT: DataSchemaField[] = [];

// ─── Complete Node Type Map ───────────────────────────────────────────────────

const NODE_PROFILE_MAP: Record<AutomationNodeType, NodeProfile> = {
  // ═══════════════════════════════════════════════════════════════════════════
  // Triggers — produce data, no input
  // ═══════════════════════════════════════════════════════════════════════════
  'trigger:manual': {
    type: 'trigger:manual',
    category: 'trigger',
    wired: true,
    reason: null,
    sourceHandleIds: [],
    sourceHandleLabels: {},
    targetHandleRequired: false,
    dataSchema: {
      input: NO_INPUT,
      output: [
        { key: 'timestamp', label: 'Timestamp', type: 'string', description: 'When the trigger was fired' },
      ],
    },
  },
  'trigger:live-traffic-captured': {
    type: 'trigger:live-traffic-captured',
    category: 'trigger',
    wired: true,
    reason: null,
    sourceHandleIds: [],
    sourceHandleLabels: {},
    targetHandleRequired: false,
    dataSchema: {
      input: NO_INPUT,
      output: HTTP_CONTEXT_INPUT,
    },
  },
  'trigger:browser-page-crawled': {
    type: 'trigger:browser-page-crawled',
    category: 'trigger',
    wired: true,
    reason: null,
    sourceHandleIds: [],
    sourceHandleLabels: {},
    targetHandleRequired: false,
    dataSchema: {
      input: NO_INPUT,
      output: [
        { key: 'url', label: 'URL', type: 'string', description: 'Crawled page URL' },
        { key: 'title', label: 'Title', type: 'string', description: 'Page title' },
        { key: 'host', label: 'Host', type: 'string', description: 'Target hostname' },
        { key: 'html', label: 'HTML', type: 'string', description: 'Full page HTML content' },
        { key: 'statusCode', label: 'Status Code', type: 'number', description: 'HTTP response status' },
        { key: 'timestamp', label: 'Timestamp', type: 'string', description: 'When the page was crawled' },
      ],
    },
  },
  'trigger:scan-completed': {
    type: 'trigger:scan-completed',
    category: 'trigger',
    wired: false,
    reason: 'This trigger has setup UI, but no real event source is wired yet.',
    sourceHandleIds: [],
    sourceHandleLabels: {},
    targetHandleRequired: false,
    dataSchema: {
      input: NO_INPUT,
      output: [
        { key: 'scanId', label: 'Scan ID', type: 'string', description: 'Identifier of the completed scan' },
        { key: 'findings', label: 'Findings', type: 'array', description: 'Discovered security findings' },
        { key: 'host', label: 'Host', type: 'string', description: 'Scanned host' },
        { key: 'timestamp', label: 'Timestamp', type: 'string', description: 'Scan completion time' },
      ],
    },
  },
  'trigger:scheduled': {
    type: 'trigger:scheduled',
    category: 'trigger',
    wired: true,
    reason: null,
    sourceHandleIds: [],
    sourceHandleLabels: {},
    targetHandleRequired: false,
    dataSchema: {
      input: NO_INPUT,
      output: [
        { key: 'schedule', label: 'Schedule', type: 'string', description: 'Cron expression that fired' },
        { key: 'timestamp', label: 'Timestamp', type: 'string', description: 'When the schedule triggered' },
      ],
    },
  },
  'trigger:intercept-request': {
    type: 'trigger:intercept-request',
    category: 'trigger',
    wired: true,
    reason: null,
    sourceHandleIds: [],
    sourceHandleLabels: {},
    targetHandleRequired: false,
    dataSchema: {
      input: NO_INPUT,
      output: [
        { key: 'url', label: 'URL', type: 'string', description: 'Intercepted request URL' },
        { key: 'method', label: 'Method', type: 'string', description: 'HTTP method' },
        { key: 'headers', label: 'Headers', type: 'object', description: 'Request headers' },
        { key: 'body', label: 'Body', type: 'string', description: 'Request body' },
        { key: 'host', label: 'Host', type: 'string', description: 'Target hostname' },
        { key: 'timestamp', label: 'Timestamp', type: 'string', description: 'When intercepted' },
      ],
    },
  },
  'trigger:websocket-message': {
    type: 'trigger:websocket-message',
    category: 'trigger',
    wired: false,
    reason: 'This trigger has setup UI, but no real event source is wired yet.',
    sourceHandleIds: [],
    sourceHandleLabels: {},
    targetHandleRequired: false,
    dataSchema: {
      input: NO_INPUT,
      output: [
        { key: 'message', label: 'Message', type: 'string', description: 'WebSocket message content' },
        { key: 'data', label: 'Data', type: 'object', description: 'Parsed message payload' },
        { key: 'host', label: 'Host', type: 'string', description: 'WebSocket endpoint host' },
        { key: 'timestamp', label: 'Timestamp', type: 'string', description: 'When the message arrived' },
      ],
    },
  },
  'trigger:port-scan-result': {
    type: 'trigger:port-scan-result',
    category: 'trigger',
    wired: true,
    reason: null,
    sourceHandleIds: [],
    sourceHandleLabels: {},
    targetHandleRequired: false,
    dataSchema: {
      input: NO_INPUT,
      output: [
        { key: 'host', label: 'Host', type: 'string', description: 'Scanned host' },
        { key: 'ports', label: 'Ports', type: 'array', description: 'Open ports discovered' },
        { key: 'timestamp', label: 'Timestamp', type: 'string', description: 'When scan completed' },
      ],
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Conditions — receive upstream data, output + match boolean
  // ═══════════════════════════════════════════════════════════════════════════
  'condition:status-code': {
    type: 'condition:status-code',
    category: 'condition',
    wired: true,
    reason: null,
    sourceHandleIds: ['true', 'false'],
    sourceHandleLabels: { true: 'True', false: 'False' },
    targetHandleRequired: true,
    dataSchema: {
      input: HTTP_CONTEXT_INPUT,
      output: CONDITION_OUTPUT,
    },
  },
  'condition:url-contains': {
    type: 'condition:url-contains',
    category: 'condition',
    wired: true,
    reason: null,
    sourceHandleIds: ['true', 'false'],
    sourceHandleLabels: { true: 'True', false: 'False' },
    targetHandleRequired: true,
    dataSchema: {
      input: HTTP_CONTEXT_INPUT,
      output: CONDITION_OUTPUT,
    },
  },
  'condition:body-contains': {
    type: 'condition:body-contains',
    category: 'condition',
    wired: true,
    reason: null,
    sourceHandleIds: ['true', 'false'],
    sourceHandleLabels: { true: 'True', false: 'False' },
    targetHandleRequired: true,
    dataSchema: {
      input: HTTP_CONTEXT_INPUT,
      output: CONDITION_OUTPUT,
    },
  },
  'condition:header-exists': {
    type: 'condition:header-exists',
    category: 'condition',
    wired: true,
    reason: null,
    sourceHandleIds: ['true', 'false'],
    sourceHandleLabels: { true: 'True', false: 'False' },
    targetHandleRequired: true,
    dataSchema: {
      input: HTTP_CONTEXT_INPUT,
      output: CONDITION_OUTPUT,
    },
  },
  'condition:severity': {
    type: 'condition:severity',
    category: 'condition',
    wired: true,
    reason: null,
    sourceHandleIds: ['true', 'false'],
    sourceHandleLabels: { true: 'True', false: 'False' },
    targetHandleRequired: true,
    dataSchema: {
      input: [
        { key: 'severity', label: 'Severity', type: 'string', description: 'Finding severity (info, low, medium, high, critical)' },
        { key: 'host', label: 'Host', type: 'string', description: 'Target host' },
        { key: 'url', label: 'URL', type: 'string', description: 'Related URL' },
        { key: 'timestamp', label: 'Timestamp', type: 'string', description: 'When the finding was created' },
      ],
      output: [
        { key: 'severity', label: 'Severity', type: 'string', description: 'Finding severity' },
        { key: 'host', label: 'Host', type: 'string', description: 'Target host' },
        { key: 'url', label: 'URL', type: 'string', description: 'Related URL' },
        { key: 'timestamp', label: 'Timestamp', type: 'string', description: 'When the finding was created' },
        { key: 'match', label: 'Match', type: 'boolean', description: 'Whether severity matched threshold' },
      ],
    },
  },
  'condition:ai-confidence': {
    type: 'condition:ai-confidence',
    category: 'condition',
    wired: true,
    reason: null,
    sourceHandleIds: ['true', 'false'],
    sourceHandleLabels: { true: 'True', false: 'False' },
    targetHandleRequired: true,
    dataSchema: {
      input: [
        { key: 'confidence', label: 'Confidence', type: 'number', description: 'AI confidence score (0–1)' },
        { key: 'url', label: 'URL', type: 'string', description: 'Analyzed URL' },
        { key: 'host', label: 'Host', type: 'string', description: 'Target host' },
        { key: 'timestamp', label: 'Timestamp', type: 'string', description: 'When analysis completed' },
      ],
      output: [
        { key: 'confidence', label: 'Confidence', type: 'number', description: 'AI confidence score' },
        { key: 'url', label: 'URL', type: 'string', description: 'Analyzed URL' },
        { key: 'host', label: 'Host', type: 'string', description: 'Target host' },
        { key: 'timestamp', label: 'Timestamp', type: 'string', description: 'When analysis completed' },
        { key: 'match', label: 'Match', type: 'boolean', description: 'Whether confidence met threshold' },
      ],
    },
  },
  'condition:method': {
    type: 'condition:method',
    category: 'condition',
    wired: true,
    reason: null,
    sourceHandleIds: ['true', 'false'],
    sourceHandleLabels: { true: 'True', false: 'False' },
    targetHandleRequired: true,
    dataSchema: {
      input: HTTP_CONTEXT_INPUT,
      output: CONDITION_OUTPUT,
    },
  },
  'condition:content-type': {
    type: 'condition:content-type',
    category: 'condition',
    wired: true,
    reason: null,
    sourceHandleIds: ['true', 'false'],
    sourceHandleLabels: { true: 'True', false: 'False' },
    targetHandleRequired: true,
    dataSchema: {
      input: HTTP_CONTEXT_INPUT,
      output: CONDITION_OUTPUT,
    },
  },
  'condition:response-size': {
    type: 'condition:response-size',
    category: 'condition',
    wired: true,
    reason: null,
    sourceHandleIds: ['true', 'false'],
    sourceHandleLabels: { true: 'True', false: 'False' },
    targetHandleRequired: true,
    dataSchema: {
      input: HTTP_CONTEXT_INPUT,
      output: CONDITION_OUTPUT,
    },
  },
  'condition:crawl-status': {
    type: 'condition:crawl-status',
    category: 'condition',
    wired: true,
    reason: null,
    sourceHandleIds: ['true', 'false'],
    sourceHandleLabels: { true: 'True', false: 'False' },
    targetHandleRequired: true,
    dataSchema: {
      input: [
        { key: 'url', label: 'URL', type: 'string', description: 'Crawled page URL' },
        { key: 'statusCode', label: 'Status Code', type: 'number', description: 'HTTP response status' },
        { key: 'host', label: 'Host', type: 'string', description: 'Target hostname' },
        { key: 'timestamp', label: 'Timestamp', type: 'string', description: 'When page was crawled' },
      ],
      output: [
        { key: 'url', label: 'URL', type: 'string', description: 'Crawled page URL' },
        { key: 'statusCode', label: 'Status Code', type: 'number', description: 'HTTP response status' },
        { key: 'host', label: 'Host', type: 'string', description: 'Target hostname' },
        { key: 'timestamp', label: 'Timestamp', type: 'string', description: 'When page was crawled' },
        { key: 'match', label: 'Match', type: 'boolean', description: 'Whether crawl status matched' },
      ],
    },
  },
  'condition:grep-match': {
    type: 'condition:grep-match',
    category: 'condition',
    wired: true,
    reason: null,
    sourceHandleIds: ['true', 'false'],
    sourceHandleLabels: { true: 'True', false: 'False' },
    targetHandleRequired: true,
    dataSchema: {
      input: [
        { key: 'body', label: 'Body', type: 'string', description: 'Text content to search' },
        { key: 'url', label: 'URL', type: 'string', description: 'Source URL' },
        { key: 'host', label: 'Host', type: 'string', description: 'Target host' },
        { key: 'timestamp', label: 'Timestamp', type: 'string', description: 'When data was received' },
      ],
      output: [
        { key: 'body', label: 'Body', type: 'string', description: 'Searched text content' },
        { key: 'url', label: 'URL', type: 'string', description: 'Source URL' },
        { key: 'host', label: 'Host', type: 'string', description: 'Target host' },
        { key: 'timestamp', label: 'Timestamp', type: 'string', description: 'When data was received' },
        { key: 'match', label: 'Match', type: 'boolean', description: 'Whether grep pattern was found' },
      ],
    },
  },
  'condition:port-open': {
    type: 'condition:port-open',
    category: 'condition',
    wired: true,
    reason: null,
    sourceHandleIds: ['true', 'false'],
    sourceHandleLabels: { true: 'True', false: 'False' },
    targetHandleRequired: true,
    dataSchema: {
      input: [
        { key: 'host', label: 'Host', type: 'string', description: 'Target host' },
        { key: 'ports', label: 'Ports', type: 'array', description: 'Discovered open ports' },
        { key: 'timestamp', label: 'Timestamp', type: 'string', description: 'When scan completed' },
      ],
      output: [
        { key: 'host', label: 'Host', type: 'string', description: 'Target host' },
        { key: 'ports', label: 'Ports', type: 'array', description: 'Discovered open ports' },
        { key: 'timestamp', label: 'Timestamp', type: 'string', description: 'When scan completed' },
        { key: 'match', label: 'Match', type: 'boolean', description: 'Whether any port matched the condition' },
      ],
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Actions — receive upstream data, produce action-specific results
  // ═══════════════════════════════════════════════════════════════════════════
  'action:add-to-report': {
    type: 'action:add-to-report',
    category: 'action',
    wired: true,
    reason: null,
    sourceHandleIds: [],
    sourceHandleLabels: {},
    targetHandleRequired: true,
    dataSchema: {
      input: HTTP_CONTEXT_INPUT,
      output: [
        ...ACTION_OUTPUT_BASE,
        { key: 'reportId', label: 'Report ID', type: 'string', description: 'ID of the report the data was added to' },
        { key: 'sectionId', label: 'Section ID', type: 'string', description: 'Section the content was appended to' },
      ],
    },
  },
  'action:send-to-repeater': {
    type: 'action:send-to-repeater',
    category: 'action',
    wired: true,
    reason: null,
    sourceHandleIds: [],
    sourceHandleLabels: {},
    targetHandleRequired: true,
    dataSchema: {
      input: HTTP_CONTEXT_INPUT,
      output: [
        ...ACTION_OUTPUT_BASE,
        { key: 'repeaterId', label: 'Repeater ID', type: 'string', description: 'ID of the created repeater tab' },
      ],
    },
  },
  'action:ai-analyze': {
    type: 'action:ai-analyze',
    category: 'action',
    wired: true,
    reason: null,
    sourceHandleIds: [],
    sourceHandleLabels: {},
    targetHandleRequired: true,
    dataSchema: {
      input: HTTP_CONTEXT_INPUT,
      output: [
        ...ACTION_OUTPUT_BASE,
        { key: 'analysis', label: 'Analysis', type: 'string', description: 'AI-generated analysis result' },
        { key: 'confidence', label: 'Confidence', type: 'number', description: 'AI confidence score (0–1)' },
      ],
    },
  },
  'action:create-finding': {
    type: 'action:create-finding',
    category: 'action',
    wired: true,
    reason: null,
    sourceHandleIds: [],
    sourceHandleLabels: {},
    targetHandleRequired: true,
    dataSchema: {
      input: HTTP_CONTEXT_INPUT,
      output: [
        ...ACTION_OUTPUT_BASE,
        { key: 'findingId', label: 'Finding ID', type: 'string', description: 'ID of the created finding' },
        { key: 'severity', label: 'Severity', type: 'string', description: 'Assigned severity level' },
      ],
    },
  },
  'action:send-webhook': {
    type: 'action:send-webhook',
    category: 'action',
    wired: true,
    reason: null,
    sourceHandleIds: [],
    sourceHandleLabels: {},
    targetHandleRequired: true,
    dataSchema: {
      input: HTTP_CONTEXT_INPUT,
      output: [
        ...ACTION_OUTPUT_BASE,
        { key: 'webhookStatus', label: 'Webhook Status', type: 'number', description: 'HTTP status from webhook delivery' },
        { key: 'webhookResponse', label: 'Response', type: 'string', description: 'Webhook response body' },
      ],
    },
  },
  'action:show-notification': {
    type: 'action:show-notification',
    category: 'action',
    wired: true,
    reason: null,
    sourceHandleIds: [],
    sourceHandleLabels: {},
    targetHandleRequired: true,
    dataSchema: {
      input: HTTP_CONTEXT_INPUT,
      output: [
        ...ACTION_OUTPUT_BASE,
        { key: 'notified', label: 'Notified', type: 'boolean', description: 'Whether notification was shown' },
      ],
    },
  },
  'action:run-script': {
    type: 'action:run-script',
    category: 'action',
    wired: true,
    reason: null,
    sourceHandleIds: [],
    sourceHandleLabels: {},
    targetHandleRequired: true,
    dataSchema: {
      input: HTTP_CONTEXT_INPUT,
      output: [
        ...ACTION_OUTPUT_BASE,
        { key: 'exitCode', label: 'Exit Code', type: 'number', description: 'Script exit code' },
        { key: 'stdout', label: 'Stdout', type: 'string', description: 'Standard output from script' },
        { key: 'stderr', label: 'Stderr', type: 'string', description: 'Standard error from script' },
      ],
    },
  },
  'action:start-crawl': {
    type: 'action:start-crawl',
    category: 'action',
    wired: true,
    reason: null,
    sourceHandleIds: [],
    sourceHandleLabels: {},
    targetHandleRequired: true,
    dataSchema: {
      input: [
        { key: 'url', label: 'URL', type: 'string', description: 'Start URL for crawl' },
        { key: 'host', label: 'Host', type: 'string', description: 'Target hostname' },
      ],
      output: [
        ...ACTION_OUTPUT_BASE,
        { key: 'crawlId', label: 'Crawl ID', type: 'string', description: 'ID of the started crawl session' },
      ],
    },
  },
  'action:stop-crawl': {
    type: 'action:stop-crawl',
    category: 'action',
    wired: true,
    reason: null,
    sourceHandleIds: [],
    sourceHandleLabels: {},
    targetHandleRequired: true,
    dataSchema: {
      input: [
        { key: 'crawlId', label: 'Crawl ID', type: 'string', description: 'ID of the crawl to stop' },
        { key: 'host', label: 'Host', type: 'string', description: 'Target hostname' },
      ],
      output: [
        ...ACTION_OUTPUT_BASE,
        { key: 'stopped', label: 'Stopped', type: 'boolean', description: 'Whether crawl was stopped' },
      ],
    },
  },
  'action:send-to-intercept': {
    type: 'action:send-to-intercept',
    category: 'action',
    wired: true,
    reason: null,
    sourceHandleIds: [],
    sourceHandleLabels: {},
    targetHandleRequired: true,
    dataSchema: {
      input: HTTP_CONTEXT_INPUT,
      output: [
        ...ACTION_OUTPUT_BASE,
        { key: 'interceptId', label: 'Intercept ID', type: 'string', description: 'ID of the intercept session' },
      ],
    },
  },
  'action:start-invoker': {
    type: 'action:start-invoker',
    category: 'action',
    wired: true,
    reason: null,
    sourceHandleIds: [],
    sourceHandleLabels: {},
    targetHandleRequired: true,
    dataSchema: {
      input: HTTP_CONTEXT_INPUT,
      output: [
        ...ACTION_OUTPUT_BASE,
        { key: 'invokerId', label: 'Invoker ID', type: 'string', description: 'ID of the invoker session' },
      ],
    },
  },
  'action:port-scan': {
    type: 'action:port-scan',
    category: 'action',
    wired: true,
    reason: null,
    sourceHandleIds: [],
    sourceHandleLabels: {},
    targetHandleRequired: true,
    dataSchema: {
      input: [
        { key: 'host', label: 'Host', type: 'string', description: 'Target host to scan' },
        { key: 'url', label: 'URL', type: 'string', description: 'Related URL' },
      ],
      output: [
        ...ACTION_OUTPUT_BASE,
        { key: 'ports', label: 'Ports', type: 'array', description: 'Discovered open ports' },
      ],
    },
  },
  'action:encode-decode': {
    type: 'action:encode-decode',
    category: 'action',
    wired: true,
    reason: null,
    sourceHandleIds: [],
    sourceHandleLabels: {},
    targetHandleRequired: true,
    dataSchema: {
      input: [
        { key: 'body', label: 'Body', type: 'string', description: 'Content to encode or decode' },
        { key: 'url', label: 'URL', type: 'string', description: 'Source URL' },
      ],
      output: [
        ...ACTION_OUTPUT_BASE,
        { key: 'result', label: 'Result', type: 'string', description: 'Encoded / decoded output' },
      ],
    },
  },
  'action:hash-data': {
    type: 'action:hash-data',
    category: 'action',
    wired: true,
    reason: null,
    sourceHandleIds: [],
    sourceHandleLabels: {},
    targetHandleRequired: true,
    dataSchema: {
      input: [
        { key: 'body', label: 'Body', type: 'string', description: 'Content to hash' },
        { key: 'url', label: 'URL', type: 'string', description: 'Source URL' },
      ],
      output: [
        ...ACTION_OUTPUT_BASE,
        { key: 'hash', label: 'Hash', type: 'string', description: 'Computed hash digest' },
        { key: 'algorithm', label: 'Algorithm', type: 'string', description: 'Hash algorithm used' },
      ],
    },
  },
  'action:export-json': {
    type: 'action:export-json',
    category: 'action',
    wired: true,
    reason: null,
    sourceHandleIds: [],
    sourceHandleLabels: {},
    targetHandleRequired: true,
    dataSchema: {
      input: HTTP_CONTEXT_INPUT,
      output: [
        ...ACTION_OUTPUT_BASE,
        { key: 'exportPath', label: 'Export Path', type: 'string', description: 'File path where JSON was written' },
      ],
    },
  },
  'action:create-document': {
    type: 'action:create-document',
    category: 'action',
    wired: true,
    reason: null,
    sourceHandleIds: [],
    sourceHandleLabels: {},
    targetHandleRequired: true,
    dataSchema: {
      input: [
        { key: 'url', label: 'URL', type: 'string', description: 'Related URL' },
        { key: 'host', label: 'Host', type: 'string', description: 'Target host' },
      ],
      output: [
        ...ACTION_OUTPUT_BASE,
        { key: 'documentId', label: 'Document ID', type: 'string', description: 'ID of the created document' },
      ],
    },
  },
  'action:add-to-document': {
    type: 'action:add-to-document',
    category: 'action',
    wired: true,
    reason: null,
    sourceHandleIds: [],
    sourceHandleLabels: {},
    targetHandleRequired: true,
    dataSchema: {
      input: HTTP_CONTEXT_INPUT,
      output: [
        ...ACTION_OUTPUT_BASE,
        { key: 'documentId', label: 'Document ID', type: 'string', description: 'ID of the updated document' },
        { key: 'sectionId', label: 'Section ID', type: 'string', description: 'Section the content was added to' },
      ],
    },
  },
  'action:connect-cdp': {
    type: 'action:connect-cdp',
    category: 'action',
    wired: false,
    reason: 'This action has setup UI, but real action execution is not wired yet.',
    sourceHandleIds: [],
    sourceHandleLabels: {},
    targetHandleRequired: true,
    dataSchema: {
      input: [
        { key: 'url', label: 'URL', type: 'string', description: 'Page URL to connect to' },
        { key: 'host', label: 'Host', type: 'string', description: 'Target host' },
      ],
      output: [
        ...ACTION_OUTPUT_BASE,
        { key: 'cdpEndpoint', label: 'CDP Endpoint', type: 'string', description: 'Chrome DevTools Protocol WebSocket URL' },
      ],
    },
  },
  'action:script-analyze': {
    type: 'action:script-analyze',
    category: 'action',
    wired: true,
    reason: null,
    sourceHandleIds: [],
    sourceHandleLabels: {},
    targetHandleRequired: true,
    dataSchema: {
      input: [
        { key: 'body', label: 'Body', type: 'string', description: 'Response body containing scripts' },
        { key: 'url', label: 'URL', type: 'string', description: 'Page URL' },
        { key: 'host', label: 'Host', type: 'string', description: 'Target host' },
      ],
      output: [
        ...ACTION_OUTPUT_BASE,
        { key: 'scripts', label: 'Scripts', type: 'array', description: 'Extracted script URLs and inline scripts' },
      ],
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// Public API
// ═══════════════════════════════════════════════════════════════════════════════

/** Get the full profile for any node type. */
export function getNodeProfile(nodeType: AutomationNodeType): NodeProfile {
  return NODE_PROFILE_MAP[nodeType];
}

/** Get all profiles. Useful for bulk operations like mapping over all nodes. */
export function getAllNodeProfiles(): NodeProfile[] {
  return Object.values(NODE_PROFILE_MAP);
}

/** Check whether a node is wired (backwards-compatible). */
export function getAutomationNodeCapability(
  nodeData: AutomationNodeData
): AutomationNodeCapability {
  const profile = getNodeProfile(nodeData.nodeType);
  if (!profile) {
    return { supported: false, reason: 'Unknown node type.' };
  }
  return { supported: profile.wired, reason: profile.reason };
}

/**
 * Delete all wires (edges) connected to a specific node.
 * Call this from any node's delete handler to clean up its connections.
 */
export function deleteConnectedWires(
  nodeId: string,
  edges: AutomationEdge[]
): AutomationEdge[] {
  return edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId);
}

/**
 * Delete wires connected to multiple nodes at once.
 */
export function deleteConnectedWiresForNodes(
  nodeIds: string[],
  edges: AutomationEdge[]
): AutomationEdge[] {
  const idSet = new Set(nodeIds);
  return edges.filter((edge) => !idSet.has(edge.source) && !idSet.has(edge.target));
}

/** Get the source handle IDs for a node (e.g. ["true", "false"] for conditions). */
export function getNodeSourceHandles(nodeType: AutomationNodeType): string[] {
  return getNodeProfile(nodeType)?.sourceHandleIds ?? [];
}

/** Check if a node type is a condition (has true/false branches). */
export function isConditionNode(nodeType: AutomationNodeType): boolean {
  const profile = getNodeProfile(nodeType);
  return profile?.category === 'condition';
}

/** Get all wired (fully implemented) node types. */
export function getWiredNodeTypes(): AutomationNodeType[] {
  return getAllNodeProfiles()
    .filter((p) => p.wired)
    .map((p) => p.type);
}

/** Get all node types that are not yet wired. */
export function getUnwiredNodeTypes(): AutomationNodeType[] {
  return getAllNodeProfiles()
    .filter((p) => !p.wired)
    .map((p) => p.type);
}

/** Get the data schema for a node type. */
export function getNodeDataSchema(nodeType: AutomationNodeType): NodeDataSchema | null {
  return getNodeProfile(nodeType)?.dataSchema ?? null;
}
