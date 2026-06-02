'use client';

import { Bot } from 'lucide-react';
import { ChatMessage } from '@/components/ui/chat-message';

export function DashboardEmptyState() {
  return (
    <ChatMessage role="assistant">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 shrink-0" />
          <span className="min-w-0 truncate font-medium">AI chat</span>
        </div>
        <p className="text-sm leading-6">
          Ask a question, draft notes, or work through an AppRecon task with the provider configured in Settings.
        </p>
      </div>
    </ChatMessage>
  );
}
