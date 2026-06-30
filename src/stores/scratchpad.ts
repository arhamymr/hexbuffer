import { create } from 'zustand';

export interface Scratchpad {
  id: string;
  name: string;
  note: string;
}

interface ScratchpadState {
  scratchpads: Scratchpad[];
  activeId: string;
  note: string; // for backward compatibility
  setNote: (note: string) => void;
  addScratchpad: () => void;
  deleteScratchpad: (id: string) => void;
  setActiveId: (id: string) => void;
  renameScratchpad: (id: string, name: string) => void;
}

// ponytail: keep initial state loading simple and self-contained
const getInitialState = () => {
  const savedScratchpads = localStorage.getItem('desktop-scratchpads');
  const savedActiveId = localStorage.getItem('desktop-scratchpad-active-id');
  const legacyNote = localStorage.getItem('desktop-scratchpad') ?? '';

  let scratchpads: Scratchpad[] = [];
  if (savedScratchpads) {
    try {
      scratchpads = JSON.parse(savedScratchpads);
    } catch (e) {
      // Ignore parsing errors and fallback
    }
  }

  if (!scratchpads || scratchpads.length === 0) {
    scratchpads = [{ id: '1', name: 'Scratchpad 1', note: legacyNote }];
  }

  const activeId = savedActiveId && scratchpads.some(s => s.id === savedActiveId)
    ? savedActiveId
    : scratchpads[0].id;

  const activePad = scratchpads.find(s => s.id === activeId) || scratchpads[0];

  return {
    scratchpads,
    activeId,
    note: activePad.note,
  };
};

const initialState = getInitialState();

export const useScratchpadStore = create<ScratchpadState>()((set, get) => ({
  ...initialState,

  setNote: (note) => {
    const { scratchpads, activeId } = get();
    const updated = scratchpads.map((s) => (s.id === activeId ? { ...s, note } : s));
    localStorage.setItem('desktop-scratchpads', JSON.stringify(updated));
    localStorage.setItem('desktop-scratchpad', note);
    set({ scratchpads: updated, note });
  },

  addScratchpad: () => {
    const { scratchpads } = get();
    if (scratchpads.length >= 6) return;

    let index = 1;
    while (scratchpads.some((s) => s.name === `Scratchpad ${index}`)) {
      index++;
    }
    const newPad: Scratchpad = {
      id: Date.now().toString(),
      name: `Scratchpad ${index}`,
      note: '',
    };

    const updated = [...scratchpads, newPad];
    localStorage.setItem('desktop-scratchpads', JSON.stringify(updated));
    localStorage.setItem('desktop-scratchpad-active-id', newPad.id);
    localStorage.setItem('desktop-scratchpad', '');
    set({ scratchpads: updated, activeId: newPad.id, note: '' });
  },

  deleteScratchpad: (id) => {
    const { scratchpads, activeId } = get();
    if (scratchpads.length <= 1) return;

    const updated = scratchpads.filter((s) => s.id !== id);
    let nextActiveId = activeId;
    
    if (activeId === id) {
      const deletedIndex = scratchpads.findIndex((s) => s.id === id);
      const nextIndex = deletedIndex > 0 ? deletedIndex - 1 : 0;
      nextActiveId = updated[nextIndex]?.id || updated[0].id;
    }

    const activePad = updated.find((s) => s.id === nextActiveId) || updated[0];

    localStorage.setItem('desktop-scratchpads', JSON.stringify(updated));
    localStorage.setItem('desktop-scratchpad-active-id', nextActiveId);
    localStorage.setItem('desktop-scratchpad', activePad.note);
    set({ scratchpads: updated, activeId: nextActiveId, note: activePad.note });
  },

  setActiveId: (id) => {
    const { scratchpads } = get();
    const activePad = scratchpads.find((s) => s.id === id);
    if (!activePad) return;

    localStorage.setItem('desktop-scratchpad-active-id', id);
    localStorage.setItem('desktop-scratchpad', activePad.note);
    set({ activeId: id, note: activePad.note });
  },

  renameScratchpad: (id, name) => {
    const { scratchpads, activeId } = get();
    const trimmed = name.trim();
    if (!trimmed) return;

    const updated = scratchpads.map((s) => (s.id === id ? { ...s, name: trimmed } : s));
    localStorage.setItem('desktop-scratchpads', JSON.stringify(updated));
    
    const activePad = updated.find((s) => s.id === activeId);
    set({ scratchpads: updated, note: activePad ? activePad.note : get().note });
  },
}));

