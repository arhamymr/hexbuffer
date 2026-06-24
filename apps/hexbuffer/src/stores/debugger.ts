import { create } from 'zustand';

export type DebuggerEventType =
  | 'session_started'
  | 'session_finished'
  | 'session_failed'
  | 'page_discovered'
  | 'page_visited'
  | 'insight_created'
  | 'log_created'
  | 'human_input_requested'
  | 'chat_started'
  | 'chat_delta'
  | 'chat_action'
  | 'chat_finished'
  | 'chat_failed'
  | 'workflow_started'
  | 'workflow_step_started'
  | 'workflow_step_completed'
  | 'workflow_step_failed'
  | 'workflow_finished'
  | 'workflow_failed';

export interface DebuggerEntry {
  id: string;
  timestamp: string;
  eventType: DebuggerEventType;
  label: string;
  summary: string;
  payload: unknown;
  direction: 'input' | 'output';
}

interface DebuggerState {
  entries: DebuggerEntry[];
  selectedEntryId: string | null;
  paused: boolean;
  search: string;

  addEntry: (entry: Omit<DebuggerEntry, 'id'>) => void;
  selectEntry: (id: string | null) => void;
  togglePaused: () => void;
  setSearch: (value: string) => void;
  clearEntries: () => void;
}

let entryCounter = 0;

export const useDebuggerStore = create<DebuggerState>()((set) => ({
  entries: [],
  selectedEntryId: null,
  paused: false,
  search: '',

  addEntry: (entry) =>
    set((state) => {
      if (state.paused) return state;

      const id = `debug-${Date.now()}-${++entryCounter}`;
      const newEntry: DebuggerEntry = { ...entry, id };

      const entries = [...state.entries, newEntry];
      if (entries.length > 2000) {
        entries.splice(0, entries.length - 2000);
      }

      return { entries };
    }),

  selectEntry: (id) => set({ selectedEntryId: id }),

  togglePaused: () => set((state) => ({ paused: !state.paused })),

  setSearch: (value) => set({ search: value }),

  clearEntries: () => set({ entries: [], selectedEntryId: null }),
}));
