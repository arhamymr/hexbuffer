import React, { useEffect, useRef, useCallback } from 'react';
import { useTerminalStore, terminalInstances } from '@/stores/terminal';
import { useTheme } from '@/components/theme-provider';
import {
  createTerminalSession,
  closeTerminalSession,
  renameTerminalSession,
  closeTerminalTabsToLeft,
  closeTerminalTabsToRight,
  clearActiveTerminalSessionBuffer,
  setTerminalFontSize,
  setTerminalShellPath,
  clearRecentTerminalCommands,
  runTerminalCommand,
  toggleTerminalSidebar,
  restartTerminalSession,
  setActiveTerminalId,
} from '@/triggers';

const LIGHT_THEME = {
  background: '#fafafa',
  foreground: '#18181b',
  cursor: '#10b981',
  selectionBackground: '#e4e4e7',
  black: '#18181b',
  red: '#e11d48',
  green: '#16a34a',
  yellow: '#d97706',
  blue: '#2563eb',
  magenta: '#c026d3',
  cyan: '#0891b2',
  white: '#f4f4f5',
  brightBlack: '#71717a',
  brightRed: '#f43f5e',
  brightGreen: '#22c55e',
  brightYellow: '#eab308',
  brightBlue: '#3b82f6',
  brightMagenta: '#d946ef',
  brightCyan: '#06b6d4',
  brightWhite: '#18181b',
};

const DARK_THEME = {
  background: '#09090b',
  foreground: '#f4f4f5',
  cursor: '#00c96b',
  selectionBackground: '#27272a',
  black: '#09090b',
  red: '#f43f5e',
  green: '#10b981',
  yellow: '#f59e0b',
  blue: '#3b82f6',
  magenta: '#d946ef',
  cyan: '#06b6d4',
  white: '#f4f4f5',
  brightBlack: '#71717a',
  brightRed: '#fda4af',
  brightGreen: '#6ee7b7',
  brightYellow: '#fde047',
  brightBlue: '#93c5fd',
  brightMagenta: '#f5d0fe',
  brightCyan: '#67e8f9',
  brightWhite: '#ffffff',
};

export function useTerminalPage() {
  const { theme } = useTheme();

  const sessions = useTerminalStore((s) => s.sessions);
  const activeId = useTerminalStore((s) => s.activeId);
  const fontSize = useTerminalStore((s) => s.fontSize);
  const shellPath = useTerminalStore((s) => s.shellPath);
  const recentCommands = useTerminalStore((s) => s.recentCommands);
  const isSidebarOpen = useTerminalStore((s) => s.isSidebarOpen);
  const logHistory = useTerminalStore((s) => s.logHistory);

  console.log('[Terminal Hook] Rendered hook. sessions:', sessions.length, 'activeId:', activeId, 'cached instances:', terminalInstances.size);

  const workspaceRef = useRef<HTMLDivElement | null>(null);
  const lastDimensionsRef = useRef({ width: 0, height: 0 });

  // Focus and fit current active terminal on activeId changes
  useEffect(() => {
    if (activeId) {
      console.log('[Terminal Hook] activeId changed. Focusing and fitting:', activeId);
      const session = terminalInstances.get(activeId);
      if (session) {
        setTimeout(() => {
          try {
            session.fitAddon.fit();
            session.term.focus();
          } catch (err) {
            console.warn('Deferred fit failed:', err);
          }
        }, 30);
      }
    }
  }, [activeId]);

  // Resize observer to handle panel and window resizing dynamically
  useEffect(() => {
    if (!workspaceRef.current || !activeId) return;

    const activeSession = terminalInstances.get(activeId);
    if (!activeSession) return;

    lastDimensionsRef.current = {
      width: workspaceRef.current.clientWidth,
      height: workspaceRef.current.clientHeight,
    };

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (Math.abs(width - lastDimensionsRef.current.width) > 1 || Math.abs(height - lastDimensionsRef.current.height) > 1) {
          lastDimensionsRef.current = { width, height };
          try {
            activeSession.fitAddon.fit();
          } catch (err) {
            console.warn('Failed to dynamically fit terminal layout:', err);
          }
        }
      }
    });

    resizeObserver.observe(workspaceRef.current);
    return () => {
      resizeObserver.disconnect();
    };
  }, [activeId]);

  // Track which xterm instances have already been opened on an element to prevent double open() calls
  const mountedTermsRef = React.useRef<WeakMap<object, HTMLDivElement>>(new WeakMap());

  // Callback ref to handle binding containers to DOM elements
  const registerContainer = useCallback((id: string, el: HTMLDivElement | null) => {
    console.log('[Terminal Hook] registerContainer called. id:', id, 'hasElement:', !!el);
    if (!el) return;
    const session = terminalInstances.get(id);
    if (!session) {
      console.log('[Terminal Hook] registerContainer: no active session cached for id:', id);
      return;
    }

    // If this exact xterm instance is already mounted on this exact element, skip
    if (mountedTermsRef.current.get(session.term) === el) {
      console.log('[Terminal Hook] registerContainer: already mounted on this element:', id);
      return;
    }

    try {
      console.log('[Terminal Hook] registerContainer: calling term.open and fitting:', id);
      session.term.open(el);
      mountedTermsRef.current.set(session.term, el);
      // Deferred fit so the DOM has painted and has real dimensions
      setTimeout(() => {
        try {
          session.fitAddon.fit();
          session.term.focus();
        } catch (err) {
          console.warn('Deferred fit after open failed:', err);
        }
      }, 50);
    } catch (err) {
      console.error('Failed to initialize xterm element mount:', err);
    }
  }, []);

  // Spawn initial terminal on first mount if none exist, or restore saved sessions
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    console.log('[Terminal Hook] Spawn check. sessions.length:', sessions.length);
    if (sessions.length === 0) {
      console.log('[Terminal Hook] No sessions found. Spawning initial session.');
      createTerminalSession();
    } else if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      console.log('[Terminal Hook] Restoring saved sessions.');
      const store = useTerminalStore.getState();
      store.initSavedSessions().then(() => {
        // ponytail: auto wake up the active terminal on mount if its process has exited
        const activeSession = store.sessions.find((s) => s.id === store.activeId);
        if (activeSession && activeSession.status === 'exited') {
          console.log('[Terminal Hook] Auto-waking up inactive active session on mount:', store.activeId);
          restartTerminalSession(store.activeId!);
        }
      });
    }
  }, [sessions.length]);

  // Dynamically sync terminal colors when application theme toggles
  useEffect(() => {
    const activeTheme = theme === 'dark' ? DARK_THEME : LIGHT_THEME;
    terminalInstances.forEach((session) => {
      session.term.options.theme = activeTheme;
    });
  }, [theme]);

  const isSessionReady = useCallback((id: string) => {
    return terminalInstances.has(id);
  }, []);

  return {
    sessions,
    activeId,
    setActiveId: setActiveTerminalId,
    createSession: createTerminalSession,
    closeSession: closeTerminalSession,
    renameSession: renameTerminalSession,
    closeTabsToLeft: closeTerminalTabsToLeft,
    closeTabsToRight: closeTerminalTabsToRight,
    registerContainer,
    clearActiveSessionBuffer: clearActiveTerminalSessionBuffer,
    workspaceRef,
    fontSize,
    setFontSize: setTerminalFontSize,
    shellPath,
    setShellPath: setTerminalShellPath,
    recentCommands,
    clearRecentCommands: clearRecentTerminalCommands,
    runCommand: runTerminalCommand,
    isSidebarOpen,
    toggleSidebar: toggleTerminalSidebar,
    isSessionReady,
    restartSession: restartTerminalSession,
    logHistory,
  };
}

