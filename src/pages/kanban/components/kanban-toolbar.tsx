import type { GroupBy } from '../types';
import { GROUP_OPTIONS } from '../constants';
import { PlusIcon } from '@phosphor-icons/react';

interface Props {
  groupBy: GroupBy;
  onGroupByChange: (g: GroupBy) => void;
  totalCards: number;
  doneCards: number;
  onAddCardClick: () => void;
}

export function KanbanToolbar({ groupBy, onGroupByChange, totalCards, doneCards, onAddCardClick }: Props) {
  return (
    <div className="flex h-10 shrink-0 items-center justify-between border-b bg-muted/40 px-3">
      {/* Left: Stats */}
      <div className="flex items-center gap-3">
        <span className="text-[10px] font-mono text-muted-foreground">
          {doneCards}/{totalCards} done
        </span>
        {/* Overall progress mini-bar */}
        <div className="h-1 w-20 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: totalCards ? `${(doneCards / totalCards) * 100}%` : '0%' }}
          />
        </div>
      </div>

      {/* Right: Actions and Group by */}
      <div className="flex items-center gap-4">
        {/* Group by toggle */}
        <div className="flex items-center gap-1.5 border-r border-border/60 pr-4">
          <span className="text-[10px] font-mono text-muted-foreground mr-1">Group by:</span>
          {GROUP_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onGroupByChange(opt.value)}
              className={`rounded-sm px-2 py-0.5 text-[10px] font-semibold transition-colors duration-100 ${
                groupBy === opt.value
                  ? 'bg-muted/80 text-foreground border border-border/80'
                  : 'bg-transparent text-muted-foreground border border-transparent hover:bg-muted/40 hover:text-foreground'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Add Card Primary Button */}
        <button
          onClick={onAddCardClick}
          className="flex h-7 items-center gap-1 rounded bg-primary px-3 text-xs font-semibold text-background hover:bg-primary-dark transition-colors duration-150"
        >
          <PlusIcon className="h-3.5 w-3.5" weight="bold" />
          Add card
        </button>
      </div>
    </div>
  );
}
