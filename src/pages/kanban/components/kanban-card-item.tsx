import {
  CalendarBlankIcon,
  CircleNotchIcon,
  CheckCircleIcon,
  DotsSixVerticalIcon,
  TagIcon,
} from '@phosphor-icons/react';
import type { KanbanCard } from '../types';
import { PRIORITY_CONFIG } from '../constants';

interface Props {
  card: KanbanCard;
  isDragging: boolean;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onToggleSubtask: (cardId: string, subtaskId: string) => void;
}

export function KanbanCardItem({ card, isDragging, onDragStart, onDragEnd, onToggleSubtask }: Props) {
  const priority = PRIORITY_CONFIG[card.priority];
  const doneSubs  = card.subtasks.filter((s) => s.done).length;
  const totalSubs = card.subtasks.length;
  const progress  = totalSubs > 0 ? (doneSubs / totalSubs) * 100 : 0;

  const isOverdue = card.dueDate && new Date(card.dueDate) < new Date();

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        onDragStart(card.id);
      }}
      onDragEnd={onDragEnd}
      className={`kanban-card group select-none rounded-md border border-border bg-card p-3 cursor-grab active:cursor-grabbing transition-all duration-150 ${
        isDragging ? 'opacity-40 scale-[0.97] border-primary/40' : 'hover:border-border/80 hover:bg-card/80'
      }`}
    >
      {/* Priority dot + Title */}
      <div className="flex items-start gap-2">
        <span
          title={priority.label}
          className={`mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full ${priority.dot}`}
        />
        <span className="flex-1 text-[13px] font-medium leading-snug text-foreground">
          {card.title}
        </span>
        <DotsSixVerticalIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-60 transition-opacity duration-150" />
      </div>

      {/* Description */}
      {card.description && (
        <p className="mt-1.5 ml-[18px] text-[11px] leading-relaxed text-muted-foreground line-clamp-2">
          {card.description}
        </p>
      )}

      {/* Tags */}
      {card.tags && card.tags.length > 0 && (
        <div className="mt-2 ml-[18px] flex flex-wrap gap-1">
          {card.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-0.5 rounded px-1.5 py-px text-[10px] font-medium bg-muted text-muted-foreground"
            >
              <TagIcon className="h-2.5 w-2.5" />
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Subtask progress bar */}
      {totalSubs > 0 && (
        <div className="mt-2.5 ml-[18px] space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              {doneSubs === totalSubs ? (
                <CheckCircleIcon className="h-3 w-3 text-primary" />
              ) : (
                <CircleNotchIcon className="h-3 w-3" />
              )}
              <span>{doneSubs}/{totalSubs} subtasks</span>
            </div>
          </div>
          <div className="h-0.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Footer: assignee + due date */}
      <div className="mt-2.5 ml-[18px] flex items-center gap-2">
        {card.assignee && (
          <span
            className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold text-black shrink-0"
            style={{ backgroundColor: card.assigneeColor ?? '#00c950' }}
            title={card.assignee}
          >
            {card.assignee.slice(0, 2).toUpperCase()}
          </span>
        )}
        {card.dueDate && (
          <span
            className={`inline-flex items-center gap-1 text-[10px] font-mono ${
              isOverdue ? 'text-red-400' : 'text-muted-foreground'
            }`}
          >
            <CalendarBlankIcon className="h-2.5 w-2.5" />
            {card.dueDate}
          </span>
        )}
      </div>
    </div>
  );
}
