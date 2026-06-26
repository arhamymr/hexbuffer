import { create } from 'zustand';
import type { TerminalPanelHandle } from '@/layout/terminal';

interface GlobalTerminalState {
  /** The imperative handle to the global footer TerminalPanel (set by AppLayout). */
  terminalHandle: TerminalPanelHandle | null;
  setTerminalHandle: (handle: TerminalPanelHandle | null) => void;

  /** Whether the terminal panel is currently visible. */
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;

  /**
   * Request the global terminal to open (e.g. from automation triggers).
   * AppLayout watches this flag and opens the panel when it becomes true.
   */
  requestOpenFlag: boolean;
  requestOpen: () => void;
  clearRequest: () => void;

  /** Imperative write helpers that delegate to terminalHandle. */
  write: (data: string) => void;
  writeln: (data: string) => void;
  clear: () => void;
}

export const useGlobalTerminalStore = create<GlobalTerminalState>()((set, get) => ({
  terminalHandle: null,
  setTerminalHandle: (handle) => set({ terminalHandle: handle }),

  isOpen: false,
  setIsOpen: (open) => set({ isOpen: open }),

  requestOpenFlag: false,
  requestOpen: () => set({ requestOpenFlag: true }),
  clearRequest: () => set({ requestOpenFlag: false }),

  write: (data) => {
    get().terminalHandle?.write(data);
  },
  writeln: (data) => {
    get().terminalHandle?.writeln(data);
  },
  clear: () => {
    get().terminalHandle?.clear();
  },
}));
