import type { AutomationNodeType } from '../types';
import type { NodeProfile } from './node-capability-types';
import {
  ACTION_OUTPUT_BASE,
  CONDITION_OUTPUT,
  HTTP_CONTEXT_INPUT,
  NO_INPUT,
  NO_OUTPUT,
} from './node-schema-fragments';

export const ACTION_NODE_PROFILES: Partial<Record<AutomationNodeType, NodeProfile>> = {
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
  }
};
