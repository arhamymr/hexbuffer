import type { AutomationNodeType } from '../types';
import type { NodeProfile } from './node-capability-types';
import {
  ACTION_OUTPUT_BASE,
  CONDITION_OUTPUT,
  HTTP_CONTEXT_INPUT,
  NO_INPUT,
  NO_OUTPUT,
} from './node-schema-fragments';

export const TRIGGER_NODE_PROFILES: Partial<Record<AutomationNodeType, NodeProfile>> = {
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
        { key: 'crawlId', label: 'Crawl ID', type: 'string', description: 'Browser crawl session id' },
        { key: 'pageId', label: 'Page ID', type: 'string', description: 'Crawled page id' },
        { key: 'url', label: 'URL', type: 'string', description: 'Crawled page URL' },
        { key: 'path', label: 'Path', type: 'string', description: 'Crawled page path' },
        { key: 'title', label: 'Title', type: 'string', description: 'Page title' },
        { key: 'host', label: 'Host', type: 'string', description: 'Target hostname' },
        { key: 'status', label: 'Status', type: 'string', description: 'Crawl page status' },
        { key: 'statusCode', label: 'Status Code', type: 'number', description: 'HTTP response status' },
        { key: 'depth', label: 'Depth', type: 'number', description: 'Crawl depth for the page' },
        { key: 'linksFound', label: 'Links Found', type: 'number', description: 'Links found on the page' },
        { key: 'formsFound', label: 'Forms Found', type: 'number', description: 'Forms found on the page' },
        { key: 'screenshotPath', label: 'Screenshot Path', type: 'string', description: 'Saved screenshot path' },
        { key: 'renderedHtmlPath', label: 'Rendered HTML Path', type: 'string', description: 'Saved rendered HTML path' },
        { key: 'timestamp', label: 'Timestamp', type: 'string', description: 'When the page was crawled' },
      ],
    },
  },
  'trigger:scan-completed': {
    type: 'trigger:scan-completed',
    category: 'trigger',
    wired: true,
    reason: null,
    sourceHandleIds: [],
    sourceHandleLabels: {},
    targetHandleRequired: false,
    dataSchema: {
      input: NO_INPUT,
      output: [
        { key: 'scanId', label: 'Scan ID', type: 'string', description: 'Identifier of the completed scan' },
        { key: 'crawlId', label: 'Crawl ID', type: 'string', description: 'Browser crawl session id' },
        { key: 'targetUrl', label: 'Target URL', type: 'string', description: 'Original crawl target URL' },
        { key: 'host', label: 'Host', type: 'string', description: 'Scanned host' },
        { key: 'status', label: 'Status', type: 'string', description: 'Completed crawl status' },
        { key: 'pagesVisited', label: 'Pages Visited', type: 'number', description: 'Visited or interesting pages' },
        { key: 'pagesTotal', label: 'Pages Total', type: 'number', description: 'Total pages tracked in the crawl' },
        { key: 'insightsFound', label: 'Insights Found', type: 'number', description: 'Number of crawl insights created' },
        { key: 'pageUrls', label: 'Page URLs', type: 'array', description: 'Visited page URLs' },
        { key: 'insightTitles', label: 'Insight Titles', type: 'array', description: 'Compact insight summaries' },
        { key: 'finishedAt', label: 'Finished At', type: 'string', description: 'Crawl completion time' },
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
    wired: true,
    reason: null,
    sourceHandleIds: [],
    sourceHandleLabels: {},
    targetHandleRequired: false,
    dataSchema: {
      input: NO_INPUT,
      output: [
        { key: 'message', label: 'Message', type: 'string', description: 'WebSocket message content' },
        { key: 'data', label: 'Data', type: 'object', description: 'Parsed message payload' },
        { key: 'url', label: 'URL', type: 'string', description: 'WebSocket endpoint URL' },
        { key: 'path', label: 'Path', type: 'string', description: 'WebSocket endpoint path' },
        { key: 'host', label: 'Host', type: 'string', description: 'WebSocket endpoint host' },
        { key: 'direction', label: 'Direction', type: 'string', description: 'sent or received' },
        { key: 'messageType', label: 'Message TextT', type: 'string', description: 'text, binary, ping, pong, or close' },
        { key: 'payloadSize', label: 'Payload Size', type: 'number', description: 'Payload size in bytes' },
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
  }
};
