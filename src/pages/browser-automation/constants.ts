import type {
  ActivityLogType,
  CrawlPageStatus,
  CrawlSetupConfig,
  InsightSeverity,
} from './types';

export const DEFAULT_CRAWL_SETUP: CrawlSetupConfig = {
  targetUrl: 'https://example.com',
  strategy: 'bfs',
  maxDepth: 5,
  maxPages: 500,
  sameDomainOnly: true,
  includePaths: '/app/*, /dashboard/*',
  excludePaths: '/logout, /delete, /billing',
  requestDelayMs: 500,
  timeoutMs: 30000,
  captureScreenshots: true,
  enableAiInsights: true,
};

export const PAGE_STATUS_LABELS: Record<CrawlPageStatus, string> = {
  queued: 'Queued',
  current: 'Current',
  visited: 'Visited',
  error: 'Error',
  blocked: 'Blocked',
};

export const PAGE_STATUS_MARKERS: Record<CrawlPageStatus, string> = {
  queued: '○',
  current: '●',
  visited: '✓',
  error: '!',
  blocked: '×',
};

export const INSIGHT_SEVERITIES: InsightSeverity[] = ['info', 'low', 'medium', 'high', 'critical'];

export const LOG_TYPES: ActivityLogType[] = [
  'session',
  'navigation',
  'extraction',
  'ai',
  'policy',
  'error',
  'screenshot',
  'queue',
];

export const INSIGHT_TYPES = [
  'authentication',
  'login-form',
  'upload-form',
  'admin-route',
  'hidden-route',
  'javascript-route',
  'error-page',
  'interesting-page',
];
