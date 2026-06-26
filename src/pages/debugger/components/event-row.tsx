import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import type { DebuggerEntry } from '@/stores/debugger';
import { EVENT_COLORS } from '../constants';
import { formatTimestamp } from '../lib/format-timestamp';

export function EventRow({
  entry,
  isSelected,
  onClick,
}: {
  entry: DebuggerEntry;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <div
      className={cn(
        'flex items-start gap-2 py-1.5 px-2 border-b border-border cursor-pointer text-xs transition-colors',
        isSelected ? 'bg-accent' : 'hover:bg-muted/50'
      )}
      onClick={onClick}
    >
      <span className="text-muted-foreground text-[10px] font-mono shrink-0 w-[84px]">
        {formatTimestamp(entry.timestamp)}
      </span>

      <span className="shrink-0 mt-px">
        {entry.direction === 'input' ? (
          <ArrowRight className="size-3 text-blue-500" />
        ) : (
          <ArrowLeft className="size-3 text-emerald-500" />
        )}
      </span>

      <Badge
        variant="outline"
        className={cn(
          'text-[10px] px-1 py-0 h-4 shrink-0',
          EVENT_COLORS[entry.eventType] ?? ''
        )}
      >
        {entry.label}
      </Badge>

      <span className="truncate flex-1 min-w-0">{entry.summary}</span>
    </div>
  );
}
