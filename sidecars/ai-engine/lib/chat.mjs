import { ToolLoopAgent, stepCountIs, tool } from 'ai';
import { z } from 'zod';

import { emit } from './events.mjs';
import { providerModel } from './provider.mjs';
import { runRedactionWorkflow } from './privacy/redaction.mjs';

function toChatMessages(messages) {
  return messages
    .filter((message) => ['user', 'assistant', 'system'].includes(message.role) && message.content?.trim())
    .map((message) => ({
      role: message.role,
      content: message.content,
    }));
}

export async function runChat() {
  const request = JSON.parse(process.env['0XBUFFER_AI_CHAT_REQUEST_JSON'] || '{"messages":[]}');
  const context = JSON.parse(process.env['0XBUFFER_AI_CONTEXT_JSON'] || '{}');
  const provider = process.env.XBUFFER_AI_PROVIDER || 'deepseek';
  const model = process.env['0XBUFFER_AI_MODEL'] || 'deepseek-chat';
  emit({ type: 'chat_started', provider, model, createdAt: new Date().toISOString() });

  try {
    const redactedRequest = runRedactionWorkflow(request).redactedValue;
    const redactedContext = runRedactionWorkflow(context).redactedValue;
    const agent = new ToolLoopAgent({
      id: '0xbuffer-chat-agent',
      model: providerModel(),
      instructions: [
        'You are the 0xbuffer AI chat assistant.',
        'Be concise, practical, and focused on web security reconnaissance.',
        'Use read-only 0xbuffer context tools when they help answer the user.',
        'Do not claim you performed scans or actions that are not present in context.',
      ].join('\n'),
      stopWhen: stepCountIs(6),
      tools: {
        listCrawlSessions: tool({
          description: 'List recent AI browser crawl sessions available in context.',
          inputSchema: z.object({}),
          execute: async () => redactedContext.crawlSessions || [],
        }),
        getCrawlContext: tool({
          description: 'Read crawl pages, insights, and logs from the latest crawl context.',
          inputSchema: z.object({
            sessionId: z.string().optional(),
          }),
          execute: async ({ sessionId }) => {
            const targetId = sessionId || redactedContext.latestCrawl?.session?.id;
            if (!targetId || redactedContext.latestCrawl?.session?.id !== targetId) {
              return { session: null, pages: [], insights: [], logs: [] };
            }
            return redactedContext.latestCrawl;
          },
        }),
        getProxySummary: tool({
          description: 'Read recent HTTP proxy summary context.',
          inputSchema: z.object({}),
          execute: async () => redactedContext.proxySummary || [],
        }),
        getRecentInsights: tool({
          description: 'Read recent reconnaissance insights.',
          inputSchema: z.object({}),
          execute: async () => redactedContext.latestCrawl?.insights || [],
        }),
      },
    });
    const result = await agent.stream({
      messages: toChatMessages(redactedRequest.messages),
    });

    let content = '';
    for await (const delta of result.textStream) {
      content += delta;
      emit({ type: 'chat_delta', delta });
    }
    emit({
      type: 'chat_finished',
      provider,
      model,
      content,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    emit({
      type: 'chat_failed',
      provider,
      model,
      message: error.message,
      createdAt: new Date().toISOString(),
    });
    process.exitCode = 1;
  }
}
