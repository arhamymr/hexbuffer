import { platform } from '@tauri-apps/plugin-os';
import { FitAddon } from '@xterm/addon-fit';
import { SearchAddon, type ISearchOptions } from '@xterm/addon-search';
import { Terminal } from '@xterm/xterm';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { spawn } from 'tauri-pty';
import { getTerminalOptions, getTerminalTheme } from '../terminal-config';
import { getHomeDirectory, getShellInfo } from '../lib/shell';
import {
  FIT_DEBOUNCE_MS,
  PTY_RESIZE_DEBOUNCE_MS,
  fitTerminal,
} from '../lib/terminal-fit';
import { useTheme } from '@/components/theme-provider';
import type { TerminalInstanceHandle, TerminalStatus } from '../types';

interface UseTerminalInstanceArgs {
  isActive: boolean;
  onStatusChange?: (status: TerminalStatus, error?: string) => void;
}

interface UseTerminalInstanceReturn {
  containerRef: React.RefObject<HTMLDivElement | null>;
  handle: TerminalInstanceHandle;
  status: TerminalStatus;
  errorMsg: string;
  bgColor: string;
}

const SEARCH_OPTIONS: ISearchOptions = {
  decorations: {
    matchBackground: '#775f00',
    matchBorder: '#d29922',
    matchOverviewRuler: '#d29922',
    activeMatchBackground: '#0969da',
    activeMatchBorder: '#58a6ff',
    activeMatchColorOverviewRuler: '#58a6ff',
  },
};

interface GlobalTerminalState {
  term: Terminal | null;
  fitAddon: FitAddon | null;
  searchAddon: SearchAddon | null;
  pty: ReturnType<typeof spawn> | null;
  cleanupFns: Array<() => void>;
  status: TerminalStatus;
  errorMsg: string;
}

const globalState: GlobalTerminalState = {
  term: null,
  fitAddon: null,
  searchAddon: null,
  pty: null,
  cleanupFns: [],
  status: 'loading',
  errorMsg: '',
};

const statusListeners = new Set<(status: TerminalStatus, errorMsg: string) => void>();

function setGlobalTerminalStatus(nextStatus: TerminalStatus, error?: string) {
  globalState.status = nextStatus;
  globalState.errorMsg = error ?? '';
  for (const listener of statusListeners) {
    try {
      listener(nextStatus, globalState.errorMsg);
    } catch (err) {
      console.error('[Terminal] Status listener error:', err);
    }
  }
}

function cleanupGlobalTerminal() {
  if (globalState.pty) {
    try {
      globalState.pty.kill();
    } catch {
      // ignore cleanup failures
    }
    globalState.pty = null;
  }

  for (const fn of globalState.cleanupFns) {
    try {
      fn();
    } catch {
      // ignore cleanup failures
    }
  }
  globalState.cleanupFns = [];

  try {
    globalState.searchAddon?.dispose();
  } catch {
    // ignore cleanup failures
  }
  globalState.searchAddon = null;

  try {
    globalState.term?.dispose();
  } catch {
    // ignore cleanup failures
  }
  globalState.term = null;
  globalState.fitAddon = null;
}

export function useTerminalInstance({
  isActive,
  onStatusChange,
}: UseTerminalInstanceArgs): UseTerminalInstanceReturn {
  const containerRef = useRef<HTMLDivElement>(null);
  const hookCleanupFnsRef = useRef<Array<() => void>>([]);
  const disposedRef = useRef(false);
  const initInProgressRef = useRef(false);

  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const isDarkRef = useRef(isDark);
  isDarkRef.current = isDark;
  const isActiveRef = useRef(isActive);
  isActiveRef.current = isActive;

  const [status, setStatus] = useState<TerminalStatus>(globalState.status);
  const [errorMsg, setErrorMsg] = useState(globalState.errorMsg);

  const fitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ptyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastContainerWidthRef = useRef(0);
  const lastContainerHeightRef = useRef(0);
  const lastColsRef = useRef(0);
  const lastRowsRef = useRef(0);

  const onStatusChangeRef = useRef(onStatusChange);
  onStatusChangeRef.current = onStatusChange;

  useEffect(() => {
    const listener = (newStatus: TerminalStatus, newError: string) => {
      setStatus(newStatus);
      setErrorMsg(newError);
      onStatusChangeRef.current?.(newStatus, newError);
    };
    statusListeners.add(listener);

    // Sync state
    setStatus(globalState.status);
    setErrorMsg(globalState.errorMsg);

    return () => {
      statusListeners.delete(listener);
    };
  }, []);

  const setTerminalStatus = useCallback(
    (nextStatus: TerminalStatus, error?: string) => {
      setGlobalTerminalStatus(nextStatus, error);
    },
    [],
  );

  const isDisposed = useCallback(() => disposedRef.current, []);

  const resizePty = useCallback((cols: number, rows: number): void => {
    if (cols === lastColsRef.current && rows === lastRowsRef.current) return;

    const pty = globalState.pty;
    if (!pty) return;

    lastColsRef.current = cols;
    lastRowsRef.current = rows;
    pty.resize(cols, rows);
  }, []);

  const performFit = useCallback(
    (force = false): boolean => {
      const result = fitTerminal({
        fitAddon: globalState.fitAddon,
        terminal: globalState.term,
        container: containerRef.current,
        lastWidth: lastContainerWidthRef.current,
        lastHeight: lastContainerHeightRef.current,
        force,
      });

      if (!result.didFit) return false;

      lastContainerWidthRef.current = result.width;
      lastContainerHeightRef.current = result.height;
      return true;
    },
    [],
  );

  const performFitRef = useRef(performFit);
  performFitRef.current = performFit;

  const syncPtySize = useCallback(
    (force = false) => {
      const didFit = performFitRef.current(force);
      if (!didFit && !force) return;

      const term = globalState.term;
      if (!term) return;

      resizePty(term.cols, term.rows);
    },
    [resizePty],
  );

  const handleResize = useCallback((): void => {
    if (fitTimerRef.current) clearTimeout(fitTimerRef.current);

    fitTimerRef.current = setTimeout(() => {
      fitTimerRef.current = null;

      const didFit = performFitRef.current(false);
      if (!didFit) return;

      const term = globalState.term;
      if (!term) return;

      const cols = term.cols;
      const rows = term.rows;
      if (cols === lastColsRef.current && rows === lastRowsRef.current) return;

      if (ptyTimerRef.current) clearTimeout(ptyTimerRef.current);

      ptyTimerRef.current = setTimeout(() => {
        ptyTimerRef.current = null;
        resizePty(cols, rows);
      }, PTY_RESIZE_DEBOUNCE_MS);
    }, FIT_DEBOUNCE_MS);
  }, [resizePty]);

  const handleResizeRef = useRef(handleResize);
  handleResizeRef.current = handleResize;

  const initTerminal = useCallback(async () => {
    if (!containerRef.current) return;
    if (initInProgressRef.current) return;

    // 1. Re-use existing session if active and not exited/errored
    if (globalState.term && globalState.pty && globalState.status !== 'exited' && globalState.status !== 'error') {
      try {
        const term = globalState.term;
        term.open(containerRef.current);

        if (isActiveRef.current) {
          try {
            term.focus();
          } catch {
            // ignore focus errors
          }
        }

        // Set up ResizeObserver for this mount
        const observer = new ResizeObserver(() => {
          if (isActiveRef.current) handleResizeRef.current();
        });
        observer.observe(containerRef.current);
        hookCleanupFnsRef.current.push(() => observer.disconnect());

        // Perform fit to sync sizes
        syncPtySize(true);
        return;
      } catch (err) {
        console.error('[Terminal] Failed to attach to existing terminal, recreating:', err);
        cleanupGlobalTerminal();
        // and fall through to create a new one...
      }
    }

    initInProgressRef.current = true;
    setTerminalStatus('loading');

    try {
      cleanupGlobalTerminal();

      const os = platform();
      const termOptions = getTerminalOptions(os === 'windows' ? 'Win32' : os, isDarkRef.current);
      const term = new Terminal(termOptions);
      globalState.term = term;

      const fitAddon = new FitAddon();
      globalState.fitAddon = fitAddon;
      term.loadAddon(fitAddon);

      const searchAddon = new SearchAddon({ highlightLimit: 1000 });
      globalState.searchAddon = searchAddon;
      term.loadAddon(searchAddon);

      term.open(containerRef.current);

      term.attachCustomKeyEventHandler((event) => {
        if (event.type !== 'keydown') return true;

        if (event.key === 'Backspace') {
          event.preventDefault();
          globalState.pty?.write('\x7f');
          return false;
        }

        return true;
      });

      if (isActiveRef.current) {
        try {
          term.focus();
        } catch {
          // focus can fail before the terminal receives layout.
        }
      }

      if (containerRef.current) {
        const observer = new ResizeObserver(() => {
          if (isActiveRef.current) handleResizeRef.current();
        });
        observer.observe(containerRef.current);
        hookCleanupFnsRef.current.push(() => observer.disconnect());
      }

      const proposed = fitAddon.proposeDimensions();
      const cols = proposed && proposed.cols > 0 ? proposed.cols : 80;
      const rows = proposed && proposed.rows > 0 ? proposed.rows : 24;

      const ptyPromise = (async () => {
        const [shellInfo, cwd] = await Promise.all([getShellInfo(), getHomeDirectory()]);
        if (isDisposed()) return null;

        const pty = spawn(shellInfo.path, shellInfo.args, { cols, rows, cwd });
        if (isDisposed()) {
          try {
            pty.kill();
          } catch {
            // ignore cleanup failures
          }
          return null;
        }

        globalState.pty = pty;
        return pty;
      })();

      const pty = await ptyPromise;

      if (!pty || disposedRef.current) {
        if (pty) {
          try {
            pty.kill();
          } catch {
            // ignore cleanup failures
          }
        } else if (!disposedRef.current) {
          const msg = 'Failed to spawn terminal shell';
          setTerminalStatus('error', msg);
          term.writeln(`\r\n\x1b[31m[Error] ${msg}\x1b[0m`);
        }
        return;
      }

      const onDataDisposable = pty.onData((data: Uint8Array) => {
        if (!data || data.length === 0) return;
        term.write(data);
      });
      globalState.cleanupFns.push(() => {
        try {
          onDataDisposable.dispose();
        } catch {
          // ignore cleanup failures
        }
      });

      const onExitDisposable = pty.onExit(({ exitCode }: { exitCode: number }) => {
        term.writeln(`\r\n\x1b[90m[Process exited with code ${exitCode}]\x1b[0m`);
        term.options.disableStdin = true;
        setTerminalStatus('exited');
      });
      globalState.cleanupFns.push(() => {
        try {
          onExitDisposable.dispose();
        } catch {
          // ignore cleanup failures
        }
      });

      const termDataDisposable = term.onData((data: string) => {
        globalState.pty?.write(data);
      });
      globalState.cleanupFns.push(() => {
        try {
          termDataDisposable.dispose();
        } catch {
          // ignore cleanup failures
        }
      });

      if (!disposedRef.current) {
        setTerminalStatus('ready');
        syncPtySize(true);
      }
    } catch (err) {
      if (!disposedRef.current) {
        const msg = `Terminal initialization failed: ${err}`;
        setTerminalStatus('error', msg);
        console.error('[Terminal]', msg);
      }
    } finally {
      initInProgressRef.current = false;
    }
  }, [isDisposed, setTerminalStatus, syncPtySize]);

  useEffect(() => {
    disposedRef.current = false;
    initInProgressRef.current = false;
    initTerminal();

    return () => {
      disposedRef.current = true;
      initInProgressRef.current = false;

      if (fitTimerRef.current) clearTimeout(fitTimerRef.current);
      if (ptyTimerRef.current) clearTimeout(ptyTimerRef.current);

      for (const fn of hookCleanupFnsRef.current) {
        try {
          fn();
        } catch {
          // ignore cleanup failures
        }
      }
      hookCleanupFnsRef.current = [];
    };
  }, [initTerminal]);

  useEffect(() => {
    if (globalState.term) {
      globalState.term.options.theme = getTerminalTheme(isDark);
    }
  }, [isDark]);

  useEffect(() => {
    if (!isActive) return;

    const id = setTimeout(() => {
      syncPtySize(true);
      globalState.term?.focus();
    }, 0);

    return () => clearTimeout(id);
  }, [isActive, syncPtySize]);

  const handle = useMemo<TerminalInstanceHandle>(
    () => ({
      write(data: string) {
        globalState.term?.write(data);
      },
      writeln(data: string) {
        globalState.term?.writeln(data);
      },
      clear() {
        globalState.term?.clear();
      },
      focus() {
        globalState.term?.focus();
      },
      findNext(query: string) {
        if (!query) return false;
        return globalState.searchAddon?.findNext(query, SEARCH_OPTIONS) ?? false;
      },
      findPrevious(query: string) {
        if (!query) return false;
        return globalState.searchAddon?.findPrevious(query, SEARCH_OPTIONS) ?? false;
      },
      clearSearch() {
        globalState.searchAddon?.clearDecorations();
        globalState.term?.clearSelection();
      },
    }),
    [],
  );

  const bgColor = useMemo(() => (isDark ? 'bg-[#0d1117]' : 'bg-[#f6f8fa]'), [isDark]);

  return { containerRef, handle, status, errorMsg, bgColor };
}
