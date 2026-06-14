import * as React from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { TerminalSession } from '../types';

interface TerminalTabsProps {
  sessions: TerminalSession[];
  activeSessionId: string;
  onSelectSession: (sessionId: string) => void;
  onCreateSession: () => void;
  onRenameSession: (sessionId: string, title: string) => void;
  onCloseSession: (sessionId: string) => void;
}

const STATUS_CLASS: Record<TerminalSession['status'], string> = {
  loading: 'bg-yellow-500',
  ready: 'bg-emerald-500',
  exited: 'bg-muted-foreground',
  error: 'bg-red-500',
};

export function TerminalTabs({
  sessions,
  activeSessionId,
  onSelectSession,
  onCreateSession,
  onRenameSession,
  onCloseSession,
}: TerminalTabsProps) {
  const [editingSessionId, setEditingSessionId] = React.useState<string | null>(null);
  const [draftTitle, setDraftTitle] = React.useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!editingSessionId) return;

    const id = setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);

    return () => clearTimeout(id);
  }, [editingSessionId]);

  const startEditing = React.useCallback((session: TerminalSession) => {
    setEditingSessionId(session.id);
    setDraftTitle(session.title);
  }, []);

  const commitEditing = React.useCallback(() => {
    if (!editingSessionId) return;
    onRenameSession(editingSessionId, draftTitle);
    setEditingSessionId(null);
  }, [draftTitle, editingSessionId, onRenameSession]);

  const cancelEditing = React.useCallback(() => {
    setEditingSessionId(null);
    setDraftTitle('');
  }, []);

  return (
    <div className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
      <div className="flex min-w-0 flex-1 items-center overflow-x-auto">
        {sessions.map((session) => {
          const isActive = session.id === activeSessionId;
          const isEditing = session.id === editingSessionId;

          return (
            <div
              key={session.id}
              className={cn(
                'group flex h-6 min-w-32 max-w-52 shrink-0 items-center gap-1 border-r px-2 text-xs',
                isActive
                  ? 'bg-background text-foreground'
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
              )}
            >
              <div
                role="button"
                tabIndex={0}
                className="flex min-w-0 flex-1 items-center gap-1.5 text-left outline-none focus-visible:ring-1 focus-visible:ring-ring"
                onClick={() => onSelectSession(session.id)}
                onDoubleClick={() => startEditing(session)}
                onKeyDown={(event) => {
                  if (isEditing) return;
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelectSession(session.id);
                  }
                  if (event.key === 'F2') {
                    event.preventDefault();
                    startEditing(session);
                  }
                }}
                title={session.title}
              >
                <span className={cn('size-1.5 shrink-0 rounded-full', STATUS_CLASS[session.status])} />
                {isEditing ? (
                  <Input
                    ref={inputRef}
                    className="h-5 min-w-0 border-0 px-1 py-0 text-xs shadow-none focus-visible:ring-1"
                    value={draftTitle}
                    onChange={(event) => setDraftTitle(event.target.value)}
                    onBlur={commitEditing}
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') commitEditing();
                      if (event.key === 'Escape') cancelEditing();
                    }}
                  />
                ) : (
                  <span className="truncate">{session.title}</span>
                )}
              </div>
              <button
                type="button"
                className="flex size-4 shrink-0 items-center justify-center rounded-sm text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100"
                onClick={(event) => {
                  event.stopPropagation();
                  onCloseSession(session.id);
                }}
                aria-label={`Close ${session.title}`}
                title="Close terminal"
              >
                <X className="size-3" />
              </button>
            </div>
          );
        })}
      </div>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="size-6 shrink-0 rounded-sm"
            onClick={onCreateSession}
            aria-label="New terminal"
          >
            <Plus className="size-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">New Terminal</TooltipContent>
      </Tooltip>
    </div>
  );
}
