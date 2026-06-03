export type CrawlStatus = 'idle' | 'running' | 'paused' | 'completed' | 'failed' | 'stopped';
export type CrawlStrategy = 'bfs';
export type CrawlPageStatus = 'queued' | 'current' | 'visited' | 'error' | 'blocked';
export type InsightSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical';
export type ActivityLogLevel = 'info' | 'warning' | 'error';
export type ActivityLogType =
  | 'session'
  | 'navigation'
  | 'extraction'
  | 'ai'
  | 'policy'
  | 'error'
  | 'queue';

export interface CrawlSetupConfig {
  targetUrl: string;
  strategy: CrawlStrategy;
  maxDepth: number;
  maxPages: number;
  sameDomainOnly: boolean;
  excludePaths: string;
  requestDelayMs: number;
  timeoutMs: number;
  enableAiInsights: boolean;
  networkSettleMs?: number;
  captureScreenshots: boolean;
  captureRenderedHtml: boolean;
}

export interface CrawlSession {
  id: string;
  targetUrl: string;
  status: CrawlStatus;
  strategy: CrawlStrategy;
  maxDepth: number;
  maxPages: number;
  startedAt?: string;
  finishedAt?: string;
}

export interface CrawlPage {
  id: string;
  sessionId: string;
  url: string;
  title?: string;
  status: CrawlPageStatus;
  depth: number;
  parentUrl?: string;
  httpStatus?: number;
  linksFound: number;
  formsFound: number;
  discoveredAt: string;
  visitedAt?: string;
  aiSummary?: string;
  aiUsedForAnalysis?: boolean;
  interesting?: boolean;
  screenshotPath?: string;
  renderedHtmlPath?: string;
}

export interface AIInsight {
  id: string;
  sessionId: string;
  pageId?: string;
  severity: InsightSeverity;
  type: string;
  title: string;
  description: string;
  url?: string;
  aiUsedForAnalysis?: boolean;
  reviewed: boolean;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  sessionId: string;
  level: ActivityLogLevel;
  type: ActivityLogType;
  message: string;
  url?: string;
  aiUsedForAnalysis?: boolean;
  createdAt: string;
}

export interface HumanInputRequest {
  id: string;
  sessionId: string;
  pageId?: string;
  url?: string;
  reason: string;
  requestedFields: string[];
  safeActions: Array<'continue' | 'skip-branch' | 'stop-crawl'>;
  aiUsedForAnalysis?: boolean;
  createdAt: string;
}

export interface CrawlOverview {
  sessionStatus: CrawlStatus;
  pagesVisited: number;
  urlsDiscovered: number;
  urlsQueued: number;
  currentDepth: number;
  errors: number;
  blockedPages: number;
  formsFound: number;
  durationSeconds: number;
}

export interface CrawlTreeNode extends CrawlPage {
  children: CrawlTreeNode[];
}
