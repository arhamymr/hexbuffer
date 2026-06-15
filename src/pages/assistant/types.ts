import type { UIMessage } from '@ai-sdk/react';


export type DashboardAiProvider = 'deepseek';

export interface DashboardAiSettings {
  provider: DashboardAiProvider;
  model: string;
  hasApiKey: boolean;
  allowThirdPartyAiSharing: boolean;
}

export interface DashboardChatMetadata {
  model?: string;
  provider?: DashboardAiProvider;
}

export type DashboardChatMessage = UIMessage<DashboardChatMetadata>;

export interface CrawlHumanInputRequest {
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

export interface CrawlCompletedEvent {
  sessionId: string;
  targetUrl: string;
  status: string;
  pagesVisited: number;
  insightsFound: number;
  insightTitles: string[];
  pageUrls: string[];
}

export interface HumanSelectionOption {
  label: string;
  value: string;
  description?: string;
}

export interface HumanSelectionRequest {
  id: string;
  question: string;
  options: HumanSelectionOption[];
  multiSelect: boolean;
  createdAt: string;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessageRecord {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
}
