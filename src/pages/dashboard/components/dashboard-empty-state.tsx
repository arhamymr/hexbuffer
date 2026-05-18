'use client';

import { ChatMessage } from '@/components/ui/chat-message';
import type { Target } from '@/types';

interface DashboardEmptyStateProps {
  selectedTarget: Target | null;
}

export function DashboardEmptyState({ selectedTarget }: DashboardEmptyStateProps) {
  return (
    <ChatMessage role="assistant">
      <div className="space-y-2">
        <p className="text-sm leading-6">
          No analysis yet. The dummy library is loaded automatically when the real target library is empty, so this page is never blank.
        </p>
        {selectedTarget ? (
          <div className="rounded-sm border bg-background p-3">
            <p className="text-sm font-medium">{selectedTarget.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {selectedTarget.description || 'No description yet.'}
            </p>
          </div>
        ) : null}
      </div>
    </ChatMessage>
  );
}
