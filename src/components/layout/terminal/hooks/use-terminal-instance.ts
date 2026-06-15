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

export function useTerminalInstance({
  isActive,
  onStatusChange,
}: UseTerminalInstanceArgs): UseTerminalInstanceReturn {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const searchAddonRef = useRef<SearchAddon | null>(null);
  const ptyRef = useRef<ReturnType<typeof spawn> | null>(null);
  const cleanupFnsRef = useRef<Array<() => void>>([]);
  const disposedRef = useRef(false);
  const initInProgressRef = useRef(false);

  // Use ref for onStatusChange to avoid destabilizing the init effect.
  // Without this, an inline onStatusChange prop causes initTerminal to change
  // identity on every render, which tears down and re-creates the terminal.
  const onStatusChangeRef = useRef(onStatusChange);
  onStatusChangeRef.current = onStatusChange;

  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const isDarkRef = useRef(isDark);
  isDarkRef.current = isDark;
  const isActiveRef = useRef(isActive);
  isActiveRef.current = isActive;

  const [status, setStatus] = useState<TerminalStatus>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  const fitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ptyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastContainerWidthRef = useRef(0);
  const lastContainerHeightRef = useRef(0);
  const lastColsRef = useRef(0);
  const lastRowsRef = useRef(0);

  const setTerminalStatus = useCallback(
    (nextStatus: TerminalStatus, error?: string) => {
      setStatus(nextStatus);
      setErrorMsg(error ?? '');
      onStatusChangeRef.current?.(nextStatus, error);
    },
    [],
  );

  const isDisposed = useCallback(() => disposedRef.current, []);

  const resizePty = useCallback((cols: number, rows: number): void => {
    if (cols === lastColsRef.current && rows === lastRowsRef.current) return;

    const pty = ptyRef.current;
    if (!pty) return;

    lastColsRef.current = cols;
    lastRowsRef.current = rows;
    pty.resize(cols, rows);
  }, []);

  const performFit = useCallback(
    (force = false): boolean => {
      const result = fitTerminal({
        fitAddon: fitAddonRef.current,
        terminal: termRef.current,
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

      const term = termRef.current;
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

      const term = termRef.current;
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

    initInProgressRef.current = true;

    try {
      const os = platform();
      const termOptions = getTerminalOptions(os === 'windows' ? 'Win32' : os, isDarkRef.current);
      const term = new Terminal(termOptions);
      termRef.current = term;

      const fitAddon = new FitAddon();
      fitAddonRef.current = fitAddon;
      term.loadAddon(fitAddon);

      const searchAddon = new SearchAddon({ highlightLimit: 1000 });
      searchAddonRef.current = searchAddon;
      term.loadAddon(searchAddon);

      term.open(containerRef.current);

      term.attachCustomKeyEventHandler((event) => {
        if (event.type !== 'keydown') return true;

        if (event.key === 'Backspace') {
          event.preventDefault();
          ptyRef.current?.write('\x7f');
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
        cleanupFnsRef.current.push(() => observer.disconnect());
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

        ptyRef.current = pty;
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
        if (!data || data.length === 0 || disposedRef.current) return;
        term.write(data);
      });
      cleanupFnsRef.current.push(() => {
        try {
          onDataDisposable.dispose();
        } catch {
          // ignore cleanup failures
        }
      });

      const onExitDisposable = pty.onExit(({ exitCode }: { exitCode: number }) => {
        if (!disposedRef.current) {
          term.writeln(`\r\n\x1b[90m[Process exited with code ${exitCode}]\x1b[0m`);
          term.options.disableStdin = true;
          setTerminalStatus('exited');
        }
      });
      cleanupFnsRef.current.push(() => {
        try {
          onExitDisposable.dispose();
        } catch {
          // ignore cleanup failures
        }
      });

      const termDataDisposable = term.onData((data: string) => {
        ptyRef.current?.write(data);
      });
      cleanupFnsRef.current.push(() => {
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

      try {
        ptyRef.current?.kill();
      } catch {
        // ignore cleanup failures
      }
      ptyRef.current = null;

      for (const fn of cleanupFnsRef.current) {
        try {
          fn();
        } catch {
          // ignore cleanup failures
        }
      }
      cleanupFnsRef.current = [];

      try {
        searchAddonRef.current?.dispose();
      } catch {
        // ignore cleanup failures
      }
      searchAddonRef.current = null;

      try {
        termRef.current?.dispose();
      } catch {
        // ignore cleanup failures
      }
      termRef.current = null;
      fitAddonRef.current = null;
    };
  }, [initTerminal]);

  useEffect(() => {
    if (termRef.current) {
      termRef.current.options.theme = getTerminalTheme(isDark);
    }
  }, [isDark]);

  useEffect(() => {
    if (!isActive) return;

    const id = setTimeout(() => {
      syncPtySize(true);
      termRef.current?.focus();
    }, 0);

    return () => clearTimeout(id);
  }, [isActive, syncPtySize]);

  const handle = useMemo<TerminalInstanceHandle>(
    () => ({
      write(data: string) {
        termRef.current?.write(data);
      },
      writeln(data: string) {
        termRef.current?.writeln(data);
      },
      clear() {
        termRef.current?.clear();
      },
      focus() {
        termRef.current?.focus();
      },
      findNext(query: string) {
        if (!query) return false;
        return searchAddonRef.current?.findNext(query, SEARCH_OPTIONS) ?? false;
      },
      findPrevious(query: string) {
        if (!query) return false;
        return searchAddonRef.current?.findPrevious(query, SEARCH_OPTIONS) ?? false;
      },
      clearSearch() {
        searchAddonRef.current?.clearDecorations();
        termRef.current?.clearSelection();
      },
    }),
    [],
  );

  const bgColor = useMemo(() => (isDark ? 'bg-[#0d1117]' : 'bg-[#f6f8fa]'), [isDark]);

  return { containerRef, handle, status, errorMsg, bgColor };
}
