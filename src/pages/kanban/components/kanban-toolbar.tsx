import type { GroupBy } from '../types';
import { GROUP_OPTIONS } from '../constants';
import { PlusIcon } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
        <div className="flex items-center gap-1 border-r border-border/60 pr-4">
          <span className="text-[10px] font-mono text-muted-foreground mr-2">Group by:</span>
          <Tabs value={groupBy} onValueChange={(val) => onGroupByChange(val as GroupBy)}>
            <TabsList>
              {GROUP_OPTIONS.map((opt) => (
                <TabsTrigger key={opt.value} value={opt.value}>
                  {opt.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Add Card Primary Button */}
        <Button
          onClick={onAddCardClick}
          className="h-7"
        >
          <PlusIcon className="h-3.5 w-3.5" weight="bold" />
          Add card
        </Button>
      </div>
    </div>
  );
}
