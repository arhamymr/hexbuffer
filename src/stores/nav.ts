import { create } from 'zustand';

// ponytail: keep state in nav store as minimal coordinates and window frames
export interface WindowState {
  id: string; // e.g., '/repeater'
  title: string;
  isOpen: boolean;
  isMinimized: boolean;
  isMaximized: boolean;
  position: { x: number; y: number };
  size: { width: number; height: number };
  zIndex: number;
}

interface NavState {
  blinkingItems: Set<string>;
  triggerNavBlink: (href: string) => void;
  overviewSearchQuery: string;
  setOverviewSearchQuery: (query: string) => void;

  // Window Manager
  windows: WindowState[];
  activeWindowId: string | null;
  openWindow: (id: string, title: string) => void;
  closeWindow: (id: string, navigate?: (path: string) => void) => void;
  minimizeWindow: (id: string, navigate?: (path: string) => void) => void;
  maximizeWindow: (id: string) => void;
  focusWindow: (id: string, navigate?: (path: string) => void) => void;
  updateWindowPosition: (id: string, position: { x: number; y: number }) => void;
  updateWindowSize: (id: string, size: { width: number; height: number }) => void;
  closeAllWindows: (navigate?: (path: string) => void) => void;
}

export const useNavStore = create<NavState>()((set, get) => ({
  blinkingItems: new Set(),
  overviewSearchQuery: '',
  setOverviewSearchQuery: (overviewSearchQuery) => set({ overviewSearchQuery }),
  triggerNavBlink: (href: string) => {
    const current = get().blinkingItems;
    const next = new Set(current);
    next.add(href);
    set({ blinkingItems: next });

    setTimeout(() => {
      const updated = new Set(get().blinkingItems);
      updated.delete(href);
      set({ blinkingItems: updated });
    }, 6000);
  },

  // Window manager implementation
  windows: [],
  activeWindowId: null,

  openWindow: (id, title) => {
    // Overview is the desktop background, not a window
    if (id === '/') {
      set({ activeWindowId: null });
      return;
    }

    const { windows, activeWindowId } = get();
    const existing = windows.find((w) => w.id === id);
    const maxZ = windows.reduce((max, w) => Math.max(max, w.zIndex), 0);

    // Guard: do nothing if window is already open, active, and is the top window
    if (existing && existing.isOpen && !existing.isMinimized && activeWindowId === id) {
      const isTopWindow = windows.filter((w) => w.isOpen && !w.isMinimized).every((w) => w.id === id || w.zIndex <= existing.zIndex);
      if (isTopWindow) {
        return;
      }
    }

    if (existing) {
      set({
        windows: windows.map((w) =>
          w.id === id
            ? { ...w, isOpen: true, isMinimized: false, zIndex: maxZ + 1 }
            : w
        ),
        activeWindowId: id,
      });
    } else {
      // Cascading offsets so windows don't overlap completely
      const openCount = windows.filter((w) => w.isOpen).length;
      const x = 80 + (openCount % 8) * 30;
      const y = 60 + (openCount % 8) * 30;

      let width = Math.min(1000, window.innerWidth - 160);
      const height = Math.min(700, window.innerHeight - 200);

      if (id === '/assistant') {
        width = width / 2;
      }

      const newWindow: WindowState = {
        id,
        title,
        isOpen: true,
        isMinimized: false,
        isMaximized: false,
        position: { x, y },
        size: { width, height },
        zIndex: maxZ + 1,
      };

      set({
        windows: [...windows, newWindow],
        activeWindowId: id,
      });
    }
  },

  closeWindow: (id, navigate) => {
    const { windows, activeWindowId } = get();
    // Filter out the closed window to reset its size and position next time it is opened
    const updated = windows.filter((w) => w.id !== id);
    set({ windows: updated });

    if (activeWindowId === id) {
      // Find the next window to focus (highest zIndex that is open and not minimized)
      const nextFocus = updated
        .filter((w) => w.isOpen && !w.isMinimized)
        .sort((a, b) => b.zIndex - a.zIndex)[0];

      if (nextFocus) {
        set({ activeWindowId: nextFocus.id });
        if (navigate) navigate(nextFocus.id);
      } else {
        set({ activeWindowId: null });
        if (navigate) navigate('/');
      }
    }
  },

  minimizeWindow: (id, navigate) => {
    const { windows, activeWindowId } = get();
    const updated = windows.map((w) =>
      w.id === id ? { ...w, isMinimized: true } : w
    );
    set({ windows: updated });

    if (activeWindowId === id) {
      const nextFocus = updated
        .filter((w) => w.isOpen && !w.isMinimized)
        .sort((a, b) => b.zIndex - a.zIndex)[0];

      if (nextFocus) {
        set({ activeWindowId: nextFocus.id });
        if (navigate) navigate(nextFocus.id);
      } else {
        set({ activeWindowId: null });
        if (navigate) navigate('/');
      }
    }
  },

  maximizeWindow: (id) => {
    const { windows } = get();
    set({
      windows: windows.map((w) =>
        w.id === id ? { ...w, isMaximized: !w.isMaximized } : w
      ),
    });
  },

  focusWindow: (id, navigate) => {
    const { windows, activeWindowId } = get();
    const existing = windows.find((w) => w.id === id);
    const maxZ = windows.reduce((max, w) => Math.max(max, w.zIndex), 0);

    // Guard: if already active, not minimized, and at top zIndex, do nothing
    if (existing && !existing.isMinimized && activeWindowId === id) {
      const isTopWindow = windows.filter((w) => w.isOpen && !w.isMinimized).every((w) => w.id === id || w.zIndex <= existing.zIndex);
      if (isTopWindow) {
        if (navigate) navigate(id);
        return;
      }
    }

    set({
      windows: windows.map((w) =>
        w.id === id ? { ...w, isMinimized: false, zIndex: maxZ + 1 } : w
      ),
      activeWindowId: id,
    });

    if (navigate) {
      navigate(id);
    }
  },

  updateWindowPosition: (id, position) => {
    const { windows } = get();
    set({
      windows: windows.map((w) => (w.id === id ? { ...w, position } : w)),
    });
  },

  updateWindowSize: (id, size) => {
    const { windows } = get();
    set({
      windows: windows.map((w) => (w.id === id ? { ...w, size } : w)),
    });
  },

  closeAllWindows: (navigate) => {
    // ponytail: wipe all window entries so they reset on next open
    set({ windows: [], activeWindowId: null });
    if (navigate) navigate('/');
  },
}));

