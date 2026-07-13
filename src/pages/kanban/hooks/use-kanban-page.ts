import { useState, useCallback, useMemo } from 'react';
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

  // ponytail: @dnd-kit simplifies drag handlers. PointerSensor distance constraint bypasses mouse-drag vs click collision.
  const handleDragStart = useCallback((cardId: string) => {
    setDraggingId(cardId);
  }, []);

  const handleDragEnd = useCallback((cardId: string, targetColId: string | null) => {
    if (targetColId) {
      setCards((prev) =>
        prev.map((c) => {
          if (c.id !== cardId) return c;
          if (groupBy === 'status')   return { ...c, columnId: targetColId };
          if (groupBy === 'priority') return { ...c, priority: targetColId as KanbanCard['priority'] };
          const assignee = targetColId === 'Unassigned' ? undefined : targetColId;
          return { ...c, assignee };
        })
      );
    }
    setDraggingId(null);
  }, [groupBy]);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeAddColumnId, setActiveAddColumnId] = useState<string>('todo');

  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  const openDetailModal = useCallback((cardId: string) => {
    setSelectedCardId(cardId);
  }, []);

  const closeDetailModal = useCallback(() => {
    setSelectedCardId(null);
  }, []);

  const updateCard = useCallback((cardId: string, updatedFields: Partial<KanbanCard>) => {
    setCards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, ...updatedFields } : c))
    );
  }, []);

  const deleteCard = useCallback((cardId: string) => {
    setCards((prev) => prev.filter((c) => c.id !== cardId));
    setSelectedCardId(null);
  }, []);

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
    draggingId,
    getColumnCards,
    handleDragStart, handleDragEnd,
    toggleSubtask, addCard,
    isAddModalOpen, activeAddColumnId, openAddModal, closeAddModal,
    selectedCardId, openDetailModal, closeDetailModal, updateCard, deleteCard,
    totalCards, doneCards,
  };
}
