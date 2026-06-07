import { invoke } from '@tauri-apps/api/core';
import { createUIMessageStream, type ChatTransport } from 'ai';
import type { DashboardAiSettings, DashboardChatMessage } from '../types';

interface DashboardChatBody {
  aiSettings?: DashboardAiSettings;
}

interface AiChatAction {
  action: string;
  payload: Record<string, unknown>;
  result: string | null;
}

interface AiChatResponse {
  provider: DashboardAiSettings['provider'];
  model: string;
  content: string;
  actions?: AiChatAction[];
}

function getMessageText(message: DashboardChatMessage) {
  return message.parts
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('\n')
    .trim();
}

function toProviderMessages(messages: DashboardChatMessage[]) {
  return messages
    .filter((message) => message.role === 'user' || message.role === 'assistant')
    .map((message) => ({
      role: message.role,
      content: getMessageText(message),
    }))
    .filter((message) => message.content.length > 0);
}

function fallbackContent(aiSettings: DashboardAiSettings | undefined, error?: unknown) {
  if (!aiSettings?.hasApiKey) {
    return 'Add an API key in Settings to start chatting with the configured AI provider.';
  }
  if (!aiSettings.allowThirdPartyAiSharing) {
    return 'Enable third-party AI sharing in Settings before sending chat messages or app context to the configured AI provider.';
  }

  return `I could not reach ${aiSettings.provider === 'deepseek' ? 'DeepSeek' : 'OpenAI'} right now: ${
    error instanceof Error ? error.message : String(error)
  }`;
}

export class DashboardSettingsChatTransport implements ChatTransport<DashboardChatMessage> {
  async sendMessages({
    body,
    messages,
  }: Parameters<ChatTransport<DashboardChatMessage>['sendMessages']>[0]) {
    const requestBody = body as DashboardChatBody | undefined;
    const aiSettings = requestBody?.aiSettings;

    return createUIMessageStream<DashboardChatMessage>({
      originalMessages: messages,
      execute: async ({ writer }) => {
        let provider = aiSettings?.provider;
        let model = aiSettings?.model;
        let content = '';

        try {
          if (!aiSettings?.hasApiKey || !aiSettings.allowThirdPartyAiSharing) {
            content = fallbackContent(aiSettings);
          } else {
            const response = await invoke<AiChatResponse>('send_ai_chat_message', {
              request: {
                messages: toProviderMessages(messages),
              },
            });
            provider = response.provider;
            model = response.model;
            content = response.content;
          }
        } catch (error) {
          content = fallbackContent(aiSettings, error);
        }

        const textId = `response-${Date.now()}`;

        writer.write({
          type: 'start',
          messageMetadata: {
            model,
            provider,
          },
        });
        writer.write({ type: 'text-start', id: textId });
        writer.write({ type: 'text-delta', id: textId, delta: content });
        writer.write({ type: 'text-end', id: textId });
        writer.write({ type: 'finish', finishReason: 'stop' });
      },
    });
  }

  async reconnectToStream() {
    return null;
  }
}
