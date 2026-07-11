import type { KanbanColumn, KanbanCard } from '../types';
import { KanbanCardItem } from './kanban-card-item';
import { WarningIcon, PlusIcon } from '@phosphor-icons/react';

interface Props {
  column: KanbanColumn;
  cards: KanbanCard[];
  draggingId: string | null;
  isDragOver: boolean;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onDragOver: (colId: string) => void;
  onDrop: (colId: string) => void;
  onToggleSubtask: (cardId: string, subtaskId: string) => void;
  onAddCardClick: (colId: string) => void;
}

export function KanbanColumnPanel({
  column, cards, draggingId, isDragOver,
  onDragStart, onDragEnd, onDragOver, onDrop, onToggleSubtask, onAddCardClick,
}: Props) {
  const wipViolation = column.wipLimit !== undefined && cards.length > column.wipLimit;

  return (
    <div
      className="kanban-col flex h-full min-h-0 w-[280px] shrink-0 flex-col"
      onDragOver={(e) => { e.preventDefault(); onDragOver(column.id); }}
      onDrop={(e) => { e.preventDefault(); onDrop(column.id); }}
    >
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
        className={`flex-1 min-h-0 overflow-y-auto overflow-x-hidden rounded-md border px-2 py-2 space-y-2 scrollbar-thin transition-colors duration-150 ${
          isDragOver
            ? 'border-primary/40 bg-primary/5'
            : 'border-border/40 bg-muted/10'
        }`}
      >
        {cards.map((card) => (
          <KanbanCardItem
            key={card.id}
            card={card}
            isDragging={draggingId === card.id}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onToggleSubtask={onToggleSubtask}
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
