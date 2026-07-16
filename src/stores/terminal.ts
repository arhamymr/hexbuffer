import { create } from 'zustand';
import { spawn } from 'tauri-pty';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { toast } from 'sonner';

export interface TerminalSessionState {
  id: string;
  name: string;
  shell: string;
  pid: number;
  status: 'spawning' | 'ready' | 'exited';
}

export interface TerminalSessionInstances {
  pty: any;
  term: Terminal;
  fitAddon: FitAddon;
}

// Module-level map to store active instances that persist for the lifetime of the app
export const terminalInstances = new Map<string, TerminalSessionInstances>();

const STORAGE_KEYS = {
  FONT_SIZE: 'apprecon:terminal:font-size',
  SHELL_PATH: 'apprecon:terminal:shell-path',
};

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

interface TerminalState {
  sessions: TerminalSessionState[];
  activeId: string | null;
  fontSize: number;
  shellPath: string;
  
  setFontSize: (size: number) => void;
  setShellPath: (path: string) => void;
  setActiveId: (id: string | null) => void;
  
  createSession: () => Promise<void>;
  closeSession: (id: string) => void;
  renameSession: (id: string, name: string) => void;
  closeTabsToLeft: (id: string) => void;
  closeTabsToRight: (id: string) => void;
  clearActiveSessionBuffer: () => void;
  recentCommands: string[];
  addRecentCommand: (cmd: string) => void;
  clearRecentCommands: () => void;
  runCommand: (cmd: string) => void;
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  initSavedSessions: () => Promise<void>;
  restartSession: (id: string) => Promise<void>;
  logHistory: string[];
  log: (msg: string) => void;
}

export const useTerminalStore = create<TerminalState>((set, get) => ({
  sessions: (() => {
    try {
      const saved = localStorage.getItem('apprecon:terminal:saved-sessions');
      console.log('[Terminal Store] Initial sessions load from storage:', saved);
      if (saved) {
        const parsed = JSON.parse(saved) as TerminalSessionState[];
        // On app boot, force status to 'spawning' so they will re-initialize
        return parsed.map((s) => ({ ...s, status: 'spawning' as const }));
      }
      return [];
    } catch (e) {
      console.error('[Terminal Store] Failed to parse saved sessions from localStorage:', e);
      return [];
    }
  })(),
  activeId: (() => {
    try {
      const saved = localStorage.getItem('apprecon:terminal:saved-sessions');
      if (saved) {
        const parsed = JSON.parse(saved) as TerminalSessionState[];
        if (parsed.length > 0) {
          console.log('[Terminal Store] Restoring activeId on startup:', parsed[parsed.length - 1].id);
          return parsed[parsed.length - 1].id;
        }
      }
    } catch (e) {
      console.error('[Terminal Store] Failed to parse activeId on startup:', e);
    }
    return null;
  })(),
  fontSize: (() => {
    const saved = localStorage.getItem(STORAGE_KEYS.FONT_SIZE);
    return saved ? parseInt(saved, 10) : 13;
  })(),
  shellPath: (() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SHELL_PATH);
    return saved || '/bin/zsh';
  })(),
  recentCommands: (() => {
    const saved = localStorage.getItem('apprecon:terminal:recent-commands');
    return saved ? JSON.parse(saved) : [];
  })(),

  setFontSize: (size) => {
    const clamped = Math.max(10, Math.min(24, size));
    set({ fontSize: clamped });
    localStorage.setItem(STORAGE_KEYS.FONT_SIZE, clamped.toString());

    // Apply font size to all running terminals
    terminalInstances.forEach((session) => {
      session.term.options.fontSize = clamped;
      try {
        session.fitAddon.fit();
      } catch (err) {
        // Ignore if element is hidden
      }
    });
  },

  setShellPath: (path) => {
    set({ shellPath: path });
    localStorage.setItem(STORAGE_KEYS.SHELL_PATH, path);
  },

  setActiveId: (activeId) => {
    set({ activeId });
    if (activeId) {
      // ponytail: lazy-load process on active tab focus if not yet initialized
      const { sessions, restartSession } = get();
      const s = sessions.find((item) => item.id === activeId);
      if (s && s.status === 'spawning') {
        console.log('[Terminal Store] Lazy-spawning shell process for focused active tab:', activeId);
        restartSession(activeId);
      }
    }
  },

  createSession: async () => {
    const { sessions, fontSize, shellPath } = get();

    if (terminalInstances.size >= 10) {
      toast.error('Maximum limit of 10 terminal tabs reached.');
      return;
    }

    const id = Math.random().toString(36).substring(2, 11);
    const label = `Terminal (${shellPath.split('/').pop()})`;

    // Step 1: Add new session as 'spawning' in the state
    const newSessionMeta: TerminalSessionState = {
      id,
      name: label,
      shell: shellPath,
      pid: 0,
      status: 'spawning',
    };
    
    const initialSessions = [...sessions, newSessionMeta];
    set({
      sessions: initialSessions,
      activeId: id,
    });
    localStorage.setItem('apprecon:terminal:saved-sessions', JSON.stringify(initialSessions));

    try {
      const isDark = document.documentElement.classList.contains('dark');
      
      const term = new Terminal({
        cursorBlink: true,
        fontSize: fontSize,
        fontFamily: 'Geist Mono, Menlo, Monaco, Courier New, monospace',
        theme: isDark ? DARK_THEME : LIGHT_THEME,
        allowProposedApi: true,
      });

      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);

      const pty = spawn(shellPath, [], {
        cols: 80,
        rows: 24,
      });

      const pid = pty.pid;

      pty.onData((data) => {
        term.write(data);
      });

      let currentLine = '';
      term.onData((data) => {
        pty.write(data);

        // ponytail: parse user input characters to capture typed commands in history list
        for (let i = 0; i < data.length; i++) {
          const char = data[i];
          if (char === '\r' || char === '\n') {
            const cmd = currentLine.trim();
            if (cmd) {
              get().addRecentCommand(cmd);
            }
            currentLine = '';
          } else if (char === '\x7f' || char === '\b') {
            currentLine = currentLine.slice(0, -1);
          } else if (char === '\x03') {
            currentLine = '';
          } else if (char.charCodeAt(0) >= 32 && char.charCodeAt(0) <= 126) {
            currentLine += char;
          }
        }
      });

      term.onResize((size) => {
        pty.resize(size.cols, size.rows);
      });

      pty.onExit(({ exitCode }) => {
        term.write(`\r\n[Process completed with exit code ${exitCode}]\r\n`);
        const current = get().sessions.map((s) => s.id === id ? { ...s, status: 'exited' as const } : s);
        set({ sessions: current });
        localStorage.setItem('apprecon:terminal:saved-sessions', JSON.stringify(current));
      });

      terminalInstances.set(id, { pty, term, fitAddon });
      console.log('[Terminal Store] Spawned PTY for new session:', id, 'PID:', pid);

      // Step 2: Update status to 'ready' and fill pid
      const readySessions = get().sessions.map((s) => 
        s.id === id ? { ...s, pid: pid || 0, status: 'ready' as const } : s
      );
      set({ sessions: readySessions });
      localStorage.setItem('apprecon:terminal:saved-sessions', JSON.stringify(readySessions));
      console.log('[Terminal Store] Saved session list updated in localStorage. length:', readySessions.length);

    } catch (error) {
      console.error('Failed to spawn terminal process:', error);
      const failedSessions = get().sessions.map((s) => 
        s.id === id ? { ...s, status: 'exited' as const } : s
      );
      set({ sessions: failedSessions });
    }
  },

  closeSession: (id) => {
    const { sessions, activeId } = get();
    const session = terminalInstances.get(id);

    if (session) {
      try {
        console.log('[Terminal Store] Sending SIGKILL to PTY process:', id, 'PID:', session.pty.pid);
        session.pty.kill('SIGKILL');
      } catch (e) {
        console.error('[Terminal Store] Error sending SIGKILL to PTY process:', id, e);
      }
      try {
        session.term.dispose();
      } catch (e) {}
      terminalInstances.delete(id);
    }

    const filtered = sessions.filter((s) => s.id !== id);
    let nextActiveId = activeId;
    if (activeId === id) {
      nextActiveId = filtered.length > 0 ? filtered[filtered.length - 1].id : null;
    }

    set({
      sessions: filtered,
      activeId: nextActiveId,
    });
    localStorage.setItem('apprecon:terminal:saved-sessions', JSON.stringify(filtered));
  },

  renameSession: (id, newName) => {
    const { sessions } = get();
    const updated = sessions.map((s) => (s.id === id ? { ...s, name: newName } : s));
    set({
      sessions: updated,
    });
    localStorage.setItem('apprecon:terminal:saved-sessions', JSON.stringify(updated));
  },

  closeTabsToLeft: (id) => {
    const { sessions, activeId } = get();
    const index = sessions.findIndex((s) => s.id === id);
    if (index <= 0) return;

    const toClose = sessions.slice(0, index);
    toClose.forEach((s) => {
      const session = terminalInstances.get(s.id);
      if (session) {
        try {
          console.log('[Terminal Store] Sending SIGKILL to left-tab PTY process:', s.id, 'PID:', session.pty.pid);
          session.pty.kill('SIGKILL');
        } catch (e) {
          console.error('[Terminal Store] Error sending SIGKILL to left-tab PTY process:', s.id, e);
        }
        try { session.term.dispose(); } catch (e) {}
        terminalInstances.delete(s.id);
      }
    });

    const remaining = sessions.slice(index);
    let nextActiveId = activeId;
    if (activeId && !remaining.some((s) => s.id === activeId)) {
      nextActiveId = id;
    }

    set({
      sessions: remaining,
      activeId: nextActiveId,
    });
    localStorage.setItem('apprecon:terminal:saved-sessions', JSON.stringify(remaining));
  },

  closeTabsToRight: (id) => {
    const { sessions, activeId } = get();
    const index = sessions.findIndex((s) => s.id === id);
    if (index === -1 || index === sessions.length - 1) return;

    const toClose = sessions.slice(index + 1);
    toClose.forEach((s) => {
      const session = terminalInstances.get(s.id);
      if (session) {
        try {
          console.log('[Terminal Store] Sending SIGKILL to right-tab PTY process:', s.id, 'PID:', session.pty.pid);
          session.pty.kill('SIGKILL');
        } catch (e) {
          console.error('[Terminal Store] Error sending SIGKILL to right-tab PTY process:', s.id, e);
        }
        try { session.term.dispose(); } catch (e) {}
        terminalInstances.delete(s.id);
      }
    });

    const remaining = sessions.slice(0, index + 1);
    let nextActiveId = activeId;
    if (activeId && !remaining.some((s) => s.id === activeId)) {
      nextActiveId = id;
    }

    set({
      sessions: remaining,
      activeId: nextActiveId,
    });
    localStorage.setItem('apprecon:terminal:saved-sessions', JSON.stringify(remaining));
  },

  clearActiveSessionBuffer: () => {
    const { activeId } = get();
    if (!activeId) return;
    const session = terminalInstances.get(activeId);
    if (session) {
      session.term.clear();
    }
  },

  addRecentCommand: (cmd) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;
    const { recentCommands } = get();
    const filtered = recentCommands.filter((c) => c !== trimmed);
    const updated = [trimmed, ...filtered].slice(0, 15);
    set({ recentCommands: updated });
    localStorage.setItem('apprecon:terminal:recent-commands', JSON.stringify(updated));
  },

  clearRecentCommands: () => {
    set({ recentCommands: [] });
    localStorage.removeItem('apprecon:terminal:recent-commands');
  },

  runCommand: (cmd) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;
    const { activeId, addRecentCommand } = get();
    if (!activeId) return;
    const session = terminalInstances.get(activeId);
    if (session) {
      session.pty.write(trimmed + '\r');
      session.term.focus();
      addRecentCommand(trimmed);
    }
  },

  isSidebarOpen: (() => {
    const saved = localStorage.getItem('apprecon:terminal:sidebar-open');
    return saved === null ? true : saved === 'true';
  })(),

  toggleSidebar: () => {
    const next = !get().isSidebarOpen;
    set({ isSidebarOpen: next });
    localStorage.setItem('apprecon:terminal:sidebar-open', next.toString());
  },

  initSavedSessions: async () => {
    const { sessions, activeId } = get();
    console.log('[Terminal Store] initSavedSessions called. Saved sessions count:', sessions.length);
    if (sessions.length === 0) return;

    // ponytail: only restore the process for the active tab to save CPU/memory on startup
    const targetId = activeId || sessions[0].id;

    for (const s of sessions) {
      if (s.id !== targetId) {
        s.status = 'spawning';
        continue;
      }

      if (terminalInstances.has(s.id)) {
        console.log('[Terminal Store] Session is already initialized in cache, skipping:', s.id);
        continue;
      }

      console.log('[Terminal Store] Restoring active PTY process for session:', s.id, 'Shell:', s.shell);
      try {
        const isDark = document.documentElement.classList.contains('dark');
        const term = new Terminal({
          cursorBlink: true,
          fontSize: get().fontSize,
          fontFamily: 'Geist Mono, Menlo, Monaco, Courier New, monospace',
          theme: isDark ? DARK_THEME : LIGHT_THEME,
          allowProposedApi: true,
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);

        const pty = spawn(s.shell, [], {
          cols: 80,
          rows: 24,
        });

        pty.onData((data) => {
          term.write(data);
        });

        let currentLine = '';
        term.onData((data) => {
          pty.write(data);
          for (let i = 0; i < data.length; i++) {
            const char = data[i];
            if (char === '\r' || char === '\n') {
              const cmd = currentLine.trim();
              if (cmd) get().addRecentCommand(cmd);
              currentLine = '';
            } else if (char === '\x7f' || char === '\b') {
              currentLine = currentLine.slice(0, -1);
            } else if (char === '\x03') {
              currentLine = '';
            } else if (char.charCodeAt(0) >= 32 && char.charCodeAt(0) <= 126) {
              currentLine += char;
            }
          }
        });

        term.onResize((size) => {
          pty.resize(size.cols, size.rows);
        });

        pty.onExit(({ exitCode }) => {
          term.write(`\r\n[Process completed with exit code ${exitCode}]\r\n`);
          const current = get().sessions.map((item) => item.id === s.id ? { ...item, status: 'exited' as const } : item);
          set({ sessions: current });
          localStorage.setItem('apprecon:terminal:saved-sessions', JSON.stringify(current));
        });

        s.pid = pty.pid || 0;
        s.status = 'ready';
        terminalInstances.set(s.id, { pty, term, fitAddon });
        console.log('[Terminal Store] Successfully spawned and cached PTY for restored active session:', s.id, 'PID:', s.pid);
      } catch (err) {
        console.error('[Terminal Store] Failed to restore saved session PTY:', s.id, err);
        s.status = 'exited';
      }
    }

    set({ sessions: [...sessions] });
    console.log('[Terminal Store] initSavedSessions finished. Triggered re-render.');
  },

  restartSession: async (id) => {
    const { sessions, shellPath, fontSize, log } = get();
    const s = sessions.find((item) => item.id === id);
    if (!s) {
      log(`[Restart] Session not found for id: ${id}`);
      return;
    }

    log(`[Restart] Restarting terminal session: ${id} (${s.name}) using shell: ${s.shell}`);

    // Clean up old instance if it exists in cache
    const oldSession = terminalInstances.get(id);
    if (oldSession) {
      try { 
        log(`[Restart] Killing old process for session: ${id}, PID: ${oldSession.pty.pid}`);
        oldSession.pty.kill('SIGKILL'); 
      } catch (e: any) {
        log(`[Restart] Error killing old PTY: ${e.message || e}`);
      }
      try { oldSession.term.dispose(); } catch (e) {}
      terminalInstances.delete(id);
    }

    // Set state status to 'spawning'
    const spawningSessions = get().sessions.map((item) => 
      item.id === id ? { ...item, status: 'spawning' as const, pid: 0 } : item
    );
    set({ sessions: spawningSessions });

    try {
      const isDark = document.documentElement.classList.contains('dark');
      const term = new Terminal({
        cursorBlink: true,
        fontSize: fontSize,
        fontFamily: 'Geist Mono, Menlo, Monaco, Courier New, monospace',
        theme: isDark ? DARK_THEME : LIGHT_THEME,
        allowProposedApi: true,
      });

      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);

      log(`[Restart] Spawning PTY process for: ${s.shell}`);
      const pty = spawn(s.shell, [], {
        cols: 80,
        rows: 24,
      });

      pty.onData((data) => {
        term.write(data);
      });

      let currentLine = '';
      term.onData((data) => {
        pty.write(data);
        for (let i = 0; i < data.length; i++) {
          const char = data[i];
          if (char === '\r' || char === '\n') {
            const cmd = currentLine.trim();
            if (cmd) get().addRecentCommand(cmd);
            currentLine = '';
          } else if (char === '\x7f' || char === '\b') {
            currentLine = currentLine.slice(0, -1);
          } else if (char === '\x03') {
            currentLine = '';
          } else if (char.charCodeAt(0) >= 32 && char.charCodeAt(0) <= 126) {
            currentLine += char;
          }
        }
      });

      term.onResize((size) => {
        pty.resize(size.cols, size.rows);
      });

      pty.onExit(({ exitCode }) => {
        term.write(`\r\n[Process completed with exit code ${exitCode}]\r\n`);
        const current = get().sessions.map((item) => item.id === id ? { ...item, status: 'exited' as const } : item);
        set({ sessions: current });
        localStorage.setItem('apprecon:terminal:saved-sessions', JSON.stringify(current));
      });

      terminalInstances.set(id, { pty, term, fitAddon });

      // Update state status to 'ready'
      const readySessions = get().sessions.map((item) => 
        item.id === id ? { ...item, pid: pty.pid || 0, status: 'ready' as const } : item
      );
      set({ sessions: readySessions });
      localStorage.setItem('apprecon:terminal:saved-sessions', JSON.stringify(readySessions));
      log(`[Restart] Successfully restarted session: ${id}. PID: ${pty.pid}`);
    } catch (error: any) {
      const errMsg = error?.message || String(error);
      log(`[Restart] Failed to restart terminal process: ${errMsg}`);
      toast.error('Failed to wake up terminal: ' + errMsg);
      const exitedSessions = get().sessions.map((item) => 
        item.id === id ? { ...item, status: 'exited' as const } : item
      );
      set({ sessions: exitedSessions });
    }
  },

  logHistory: [],
  log: (msg) => {
    const formatted = `[${new Date().toLocaleTimeString()}] ${msg}`;
    console.log(formatted);
    set((state) => ({ logHistory: [...state.logHistory.slice(-20), formatted] }));
  },
}));
