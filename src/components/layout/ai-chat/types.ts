import type { UIMessage } from '@ai-sdk/react';

export type DashboardAiProvider = 'openai' | 'deepseek';

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
