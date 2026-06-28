import { ChatCircleDotsIcon, TrashIcon } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ChatSession } from '../types';

interface ChatSessionListProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelect: (sessionId: string) => void;
  onDelete: (sessionId: string) => void;
  onCreate: () => void;
}

export function ChatSessionList({
  sessions,
  activeSessionId,
  onSelect,
  onDelete,
  onCreate,
}: ChatSessionListProps) {
  return (
    <div className="flex h-full flex-col border-r bg-muted/30">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b px-2 py-1.5">
        <span className="text-xs font-medium text-muted-foreground">Chats</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onCreate}
          title="New chat"
        >
          <ChatCircleDotsIcon className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto">
        {sessions.length === 0 ? (
          <div className="p-3 text-center text-xs text-muted-foreground">
            No chats yet
          </div>
        ) : (
          <div className="flex flex-col gap-0.5 p-1">
            {sessions.map((session) => {
              const isActive = session.id === activeSessionId;
              return (
                <div
                  key={session.id}
                  className={cn(
                    'group flex cursor-pointer items-center rounded-md px-2 py-1.5 text-xs transition-colors',
                    isActive
                      ? 'bg-accent text-accent-foreground'
                      : 'hover:bg-accent/50 text-muted-foreground',
                  )}
                  onClick={() => onSelect(session.id)}
                >
                  <span className="flex-1 truncate">{session.title}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      'h-5 w-5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100',
                      isActive && 'opacity-100',
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(session.id);
                    }}
                    title="Delete chat"
                  >
                    <TrashIcon className="h-3 w-3" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
