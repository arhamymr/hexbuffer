'use client';

import { Bot } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ChatMessage } from '@/components/ui/chat-message';
import { ChatMessageArea } from '@/components/ui/chat-message-area';
import type { DashboardChatMessage } from '../types';
import { DashboardEmptyState } from './empty-state';

interface DashboardThreadProps {
  error?: Error;
  messages: DashboardChatMessage[];
}

function getMessageText(message: DashboardChatMessage) {
  return message.parts
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('\n');
}

function providerLabel(message: DashboardChatMessage) {
  if (message.role !== 'assistant' || !message.metadata?.provider) {
    return null;
  }

  const provider = message.metadata.provider === 'deepseek' ? 'DeepSeek' : 'OpenAI';
  return [provider, message.metadata.model].filter(Boolean).join(' ');
}

export function DashboardThread({ error, messages }: DashboardThreadProps) {
  return (
    <div className="min-h-0 min-w-0 flex-1 overflow-y-auto rounded-sm border bg-card">
      <ChatMessageArea className="gap-3 p-2">
        {messages.length === 0 ? <DashboardEmptyState /> : null}

        {messages.map((message) => {
          const label = providerLabel(message);

          return (
            <ChatMessage key={message.id} role={message.role}>
              <div className="w-full min-w-0 space-y-2">
                {label ? (
                  <div className="flex min-w-0 items-center gap-2">
                    <Bot className="h-4 w-4 shrink-0" />
                    <Badge variant="outline" className="max-w-full truncate">
                      {label}
                    </Badge>
                  </div>
                ) : null}
                <p className="whitespace-pre-wrap break-words text-sm leading-6">
                  {getMessageText(message)}
                </p>
              </div>
            </ChatMessage>
          );
        })}

        {error ? (
          <ChatMessage role="assistant">
            <div className="break-words rounded-sm border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {error.message}
            </div>
          </ChatMessage>
        ) : null}
      </ChatMessageArea>
    </div>
  );
}
