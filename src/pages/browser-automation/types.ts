export type CrawlStatus = 'idle' | 'running' | 'paused' | 'completed' | 'failed' | 'stopped';
export type CrawlStrategy = 'bfs' | 'dfs';
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
  | 'screenshot'
  | 'queue';

export interface CrawlSetupConfig {
  targetUrl: string;
  strategy: CrawlStrategy;
  maxDepth: number;
  maxPages: number;
  sameDomainOnly: boolean;
  includePaths: string;
  excludePaths: string;
  requestDelayMs: number;
  timeoutMs: number;
  captureScreenshots: boolean;
  enableAiInsights: boolean;
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
  screenshotPath?: string;
  discoveredAt: string;
  visitedAt?: string;
  aiSummary?: string;
  interesting?: boolean;
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
  screenshotsCaptured: number;
  durationSeconds: number;
}

export interface CrawlTreeNode extends CrawlPage {
  children: CrawlTreeNode[];
}
