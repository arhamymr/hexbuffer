import type { KanbanColumn, KanbanCard } from '../types';
import { KanbanCardItem } from './kanban-card-item';
import { WarningIcon, PlusIcon } from '@phosphor-icons/react';
import { useDroppable } from '@dnd-kit/core';

interface Props {
  column: KanbanColumn;
  cards: KanbanCard[];
  draggingId: string | null;
  onToggleSubtask: (cardId: string, subtaskId: string) => void;
  onAddCardClick: (colId: string) => void;
  onCardClick: (id: string) => void;
}

export function KanbanColumnPanel({
  column, cards, draggingId, onToggleSubtask, onAddCardClick, onCardClick,
}: Props) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  const wipViolation = column.wipLimit !== undefined && cards.length > column.wipLimit;

  return (
    <div ref={setNodeRef} className="kanban-col flex h-full min-h-0 w-[280px] shrink-0 flex-col">
      {/* Column header */}
      <div className="mb-3 flex items-center gap-2 px-1">
        <span
          className="h-2 w-2 rounded-full shrink-0"
          style={{ backgroundColor: column.color }}
        />
        <span className="text-xs font-semibold text-foreground flex-1">{column.title}</span>

        {/* Card count + WIP limit */}
        <div className="flex items-center gap-1">
          {wipViolation && (
            <WarningIcon className="h-3 w-3 text-orange-400" aria-label="WIP limit exceeded" />
          )}
          <span
            className={`text-[10px] font-mono tabular-nums ${
              wipViolation ? 'text-orange-400' : 'text-muted-foreground'
            }`}
          >
            {cards.length}
            {column.wipLimit !== undefined && (
              <span className="text-muted-foreground/50">/{column.wipLimit}</span>
            )}
          </span>
        </div>
      </div>

      {/* Drop zone */}
      <div
        className={`flex-1 min-h-0 overflow-y-auto overflow-x-hidden rounded-md border px-2 py-2 space-y-2 scrollbar-thin transition-all duration-200 ${
          isOver
            ? 'border-primary/60 bg-primary/5 ring-2 ring-primary/10 shadow-sm'
            : draggingId
            ? 'border-dashed border-primary/30 bg-primary/2' // ponytail: highlight drop zones when dragging
            : 'border-border/40 bg-muted/10'
        }`}
      >
        {cards.map((card) => (
          <KanbanCardItem
            key={card.id}
            card={card}
            isDragging={draggingId === card.id}
            onToggleSubtask={onToggleSubtask}
            onClick={onCardClick}
          />
        ))}

        {cards.length === 0 && (
          <div className="flex h-20 items-center justify-center rounded border border-dashed border-border/30">
            <span className="text-[11px] text-muted-foreground/50">Drop cards here</span>
          </div>
        )}
      </div>

      {/* Add-card area */}
      <button
        onClick={() => onAddCardClick(column.id)}
        className="mt-2 flex w-full items-center gap-1.5 rounded border border-dashed border-border/20 px-2 py-1.5 text-[11px] text-muted-foreground/60 hover:bg-muted/40 hover:text-muted-foreground hover:border-border/50 transition-colors"
      >
        <PlusIcon className="h-3.5 w-3.5" />
        Add card
      </button>
    </div>
  );
}
