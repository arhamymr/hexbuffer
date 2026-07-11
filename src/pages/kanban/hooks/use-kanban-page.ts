import { useState, useCallback, useMemo, useRef } from 'react';
import type { KanbanCard, KanbanColumn, GroupBy } from '../types';
import { STATUS_COLUMNS, PRIORITY_COLUMNS, SEED_CARDS } from '../constants';

function buildAssigneeColumns(cards: KanbanCard[]): KanbanColumn[] {
  const seen = new Set<string>();
  const cols: KanbanColumn[] = [];
  for (const c of cards) {
    const key = c.assignee ?? 'Unassigned';
    if (!seen.has(key)) {
      seen.add(key);
      cols.push({ id: key, title: key, color: c.assigneeColor ?? 'oklch(0.6 0.04 240)' });
    }
  }
  if (!seen.has('Unassigned')) {
    cols.push({ id: 'Unassigned', title: 'Unassigned', color: 'oklch(0.6 0.04 240)' });
  }
  return cols;
}

export function useKanbanPage() {
  const [cards, setCards] = useState<KanbanCard[]>(SEED_CARDS);
  const [groupBy, setGroupBy] = useState<GroupBy>('status');
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  // ponytail: ref so handleDrop always reads current draggingId, not stale closure
  const draggingIdRef = useRef<string | null>(null);

  const columns: KanbanColumn[] = useMemo(() => {
    if (groupBy === 'status')    return STATUS_COLUMNS;
    if (groupBy === 'priority')  return PRIORITY_COLUMNS;
    return buildAssigneeColumns(cards);
  }, [groupBy, cards]);

  const getColumnCards = useCallback((colId: string): KanbanCard[] => {
    if (groupBy === 'status')   return cards.filter((c) => c.columnId === colId);
    if (groupBy === 'priority') return cards.filter((c) => c.priority === colId);
    const key = colId === 'Unassigned' ? undefined : colId;
    return cards.filter((c) => c.assignee === key);
  }, [cards, groupBy]);

  // ponytail: optimistic drag-drop, no external library needed for column-to-column moves
  const handleDragStart = useCallback((cardId: string) => {
    draggingIdRef.current = cardId;
    setDraggingId(cardId);
  }, []);

  const handleDragOver = useCallback((colId: string) => {
    setDragOverCol(colId);
  }, []);

  const handleDrop = useCallback((targetColId: string) => {
    const id = draggingIdRef.current;
    if (!id) return;
    setCards((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        if (groupBy === 'status')   return { ...c, columnId: targetColId };
        if (groupBy === 'priority') return { ...c, priority: targetColId as KanbanCard['priority'] };
        const assignee = targetColId === 'Unassigned' ? undefined : targetColId;
        return { ...c, assignee };
      })
    );
    draggingIdRef.current = null;
    setDraggingId(null);
    setDragOverCol(null);
  }, [groupBy]);

  const handleDragEnd = useCallback(() => {
    draggingIdRef.current = null;
    setDraggingId(null);
    setDragOverCol(null);
  }, []);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeAddColumnId, setActiveAddColumnId] = useState<string>('todo');

  const openAddModal = useCallback((colId?: string) => {
    if (colId) {
      setActiveAddColumnId(colId);
    } else {
      setActiveAddColumnId('todo');
    }
    setIsAddModalOpen(true);
  }, []);

  const closeAddModal = useCallback(() => {
    setIsAddModalOpen(false);
  }, []);

  // ponytail: crypto.randomUUID() — no uuid lib needed
  const addCard = useCallback((cardData: Omit<KanbanCard, 'id'>) => {
    if (!cardData.title.trim()) return;
    setCards((prev) => [
      ...prev,
      {
        ...cardData,
        id: crypto.randomUUID(),
        title: cardData.title.trim(),
      },
    ]);
  }, []);

  const toggleSubtask = useCallback((cardId: string, subtaskId: string) => {
    setCards((prev) =>
      prev.map((c) =>
        c.id !== cardId ? c : {
          ...c,
          subtasks: c.subtasks.map((s) =>
            s.id !== subtaskId ? s : { ...s, done: !s.done }
          ),
        }
      )
    );
  }, []);

  const totalCards = cards.length;
  const doneCards  = cards.filter((c) => c.columnId === 'done').length;

  return {
    cards, columns, groupBy, setGroupBy,
    draggingId, dragOverCol,
    getColumnCards,
    handleDragStart, handleDragOver, handleDrop, handleDragEnd,
    toggleSubtask, addCard,
    isAddModalOpen, activeAddColumnId, openAddModal, closeAddModal,
    totalCards, doneCards,
  };
}
