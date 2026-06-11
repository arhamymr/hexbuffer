import { invoke } from '@tauri-apps/api/core'
import { platform } from '@tauri-apps/plugin-os'
import { FitAddon } from '@xterm/addon-fit'
import { WebglAddon } from '@xterm/addon-webgl'
import { Terminal } from '@xterm/xterm'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { spawn } from 'tauri-pty'
import { getTerminalOptions, getTerminalTheme } from '@/components/layout/terminal/terminal-config'
import { useTheme } from '@/components/theme-provider'
import type { ShellInfo } from '@/lib/tauri-types'
import { useTerminalRenderer } from '@/stores/app-settings-store'
import { SessionDormantRing } from '@/components/layout/terminal/dormant-ring'

// ─────────────────────────────────────────────────────────────────────────────
// PTY Session Manager
//
// Manages the full lifecycle of PTY processes across tab switches:
//   • Shell info is fetched once and cached (avoids repeated Tauri IPC)
//   • In-flight spawns are tracked per tabId (prevents duplicate spawns)
//   • Cached PTYs stay alive across tab switches; output buffers to DormantRing
//   • Exited sessions can be re-spawned on demand
// ─────────────────────────────────────────────────────────────────────────────

const MAX_WEBGL_RETRIES = 3
/** Debounce for fit() — keeps UI responsive during continuous drag */
const FIT_DEBOUNCE_MS = 8
/** Debounce for PTY resize IPC — caps at ~4 calls/sec */
const PTY_RESIZE_DEBOUNCE_MS = 256
/** Minimum container dimensions to fit — prevents grid collapse on restore */
const MIN_FIT_WIDTH = 40
const MIN_FIT_HEIGHT = 40
/** Chunk only delayed/background output; live PTY output should stay immediate. */
const DORMANT_FLUSH_CHUNK_BYTES = 128 * 1024

interface PtySession {
  pty: ReturnType<typeof spawn>
  onDataDisposable: { dispose: () => void }
  onExitDisposable: { dispose: () => void }
  exited: boolean
}

const ptySessions = new Map<string, PtySession>()
const pendingSpawns = new Map<string, Promise<PtySession | null>>()
const dormantRing = new SessionDormantRing()

/** Cached shell info — fetched once, reused for every tab spawn. */
let shellInfoCache: { path: string; args: string[] } | null = null
let shellInfoPromise: Promise<{ path: string; args: string[] }> | null = null

async function getShellInfo(): Promise<{ path: string; args: string[] }> {
  if (shellInfoCache) return shellInfoCache
  if (!shellInfoPromise) {
    shellInfoPromise = invoke<ShellInfo>('get_default_shell').then((info) => ({
      path: info.path,
      args: info.args ?? [],
    }))
  }
  const result = await shellInfoPromise
  shellInfoCache = result
  shellInfoPromise = null
  return result
}

/** Cached home directory — fetched once, reused for every tab spawn. */
let homeDirCache: string | null = null
let homeDirPromise: Promise<string> | null = null

async function getHomeDirectory(): Promise<string> {
  if (homeDirCache) return homeDirCache
  if (!homeDirPromise) {
    homeDirPromise = invoke<string>('get_home_directory').catch(() => {
      return platform() === 'windows' ? 'C:\\' : '/tmp'
    })
  }
  const result = await homeDirPromise
  homeDirCache = result
  homeDirPromise = null
  return result
}

/**
 * Acquire a PTY session for a tab — either from cache or by spawning a new one.
 * Race-safe: concurrent calls for the same tabId share a single spawn promise.
 */
async function acquirePtyForTab(
  tabId: string,
  cols: number,
  rows: number,
  onData: (data: Uint8Array) => void,
  onExit: (exitCode: number) => void,
  isDisposed: () => boolean,
): Promise<PtySession | null> {
  // Return existing live session — but re-wire the onData handler
  const existing = ptySessions.get(tabId)
  if (existing && !existing.exited) {
    try { existing.onDataDisposable.dispose() } catch { /* ignore */ }
    existing.onDataDisposable = existing.pty.onData((data: Uint8Array) => {
      onData(data)
    })
    return existing
  }

  // If session exists but PTY exited, destroy it so we can re-spawn
  if (existing?.exited) {
    destroyPtySession(tabId)
  }

  // If a spawn is already in flight for this tab, wait for it
  const inFlight = pendingSpawns.get(tabId)
  if (inFlight) return inFlight

  const spawnPromise = (async (): Promise<PtySession | null> => {
    try {
      const [shellInfo, cwd] = await Promise.all([
        getShellInfo(),
        getHomeDirectory(),
      ])
      if (isDisposed()) return null

      const pty = spawn(shellInfo.path, shellInfo.args, {
        cols,
        rows,
        cwd,
      })

      if (isDisposed()) {
        try { pty.kill() } catch { /* ignore */ }
        return null
      }

      const onDataDisposable = pty.onData((data: Uint8Array) => {
        onData(data)
      })

      const onExitDisposable = pty.onExit(({ exitCode }: { exitCode: number }) => {
        const s = ptySessions.get(tabId)
        if (s) s.exited = true
        onExit(exitCode)
      })

      const session: PtySession = {
        pty,
        onDataDisposable,
        onExitDisposable,
        exited: false,
      }
      ptySessions.set(tabId, session)
      return session
    } catch (err) {
      console.error(`[PtyManager] Failed to spawn PTY for tab ${tabId}:`, err)
      return null
    } finally {
      pendingSpawns.delete(tabId)
    }
  })()

  pendingSpawns.set(tabId, spawnPromise)
  return spawnPromise
}

/** Clean up a PTY session completely (used when a tab is removed). */
function destroyPtySession(tabId: string): void {
  const session = ptySessions.get(tabId)
  if (!session) return
  try { session.onDataDisposable.dispose() } catch { /* ignore */ }
  try { session.onExitDisposable.dispose() } catch { /* ignore */ }
  try { session.pty.kill() } catch { /* ignore */ }
  ptySessions.delete(tabId)
  pendingSpawns.delete(tabId)
  dormantRing.clearSession(tabId)
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook: useTerminalInstance
//
// Manages the full lifecycle of a single xterm.js + PTY instance for one tab.
// The Terminal is created once on mount and lives for the component's lifetime.
// When `active` is false, PTY output is redirected to the dormant ring so the
// backing shell stays alive without rendering overhead.
//
// Two-stage resize pipeline (matching termul reference):
//   1. fit() debounced at 8ms  — keeps the UI responsive during drag
//   2. PTY resize debounced at 256ms — avoids spamming the backend IPC
// ─────────────────────────────────────────────────────────────────────────────

type TerminalStatus = 'loading' | 'ready' | 'exited' | 'error'

interface UseTerminalInstanceOptions {
  tabId: string
  active: boolean
}

interface UseTerminalInstanceReturn {
  containerRef: React.RefObject<HTMLDivElement | null>
  status: TerminalStatus
  errorMsg: string
  bgColor: string
}

export function useTerminalInstance({ tabId, active }: UseTerminalInstanceOptions): UseTerminalInstanceReturn {
  const containerRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const webglAddonRef = useRef<WebglAddon | null>(null)
  const cleanupFnsRef = useRef<Array<() => void>>([])
  const disposedRef = useRef(false)
  const tabIdRef = useRef(tabId)
  tabIdRef.current = tabId
  const rendererPreference = useTerminalRenderer()
  const rendererPreferenceRef = useRef(rendererPreference)
  rendererPreferenceRef.current = rendererPreference
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const isDarkRef = useRef(isDark)
  isDarkRef.current = isDark
  const [status, setStatus] = useState<TerminalStatus>('loading')
  const [errorMsg, setErrorMsg] = useState<string>('')

  // ── Two-stage resize pipeline refs ─────────────────────────────────────────
  const fitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const ptyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastContainerWidthRef = useRef(0)
  const lastContainerHeightRef = useRef(0)
  const lastColsRef = useRef(0)
  const lastRowsRef = useRef(0)
  const activeRef = useRef(active)
  activeRef.current = active

  // Track whether this terminal has ever been activated.
  // Hidden (never-activated) tabs skip Terminal + WebGL creation entirely.
  const hasActivatedRef = useRef(false)

  const isDisposed = useCallback(() => disposedRef.current, [])

  const writeLiveOutput = useCallback((data: Uint8Array): void => {
    if (!data || data.length === 0 || disposedRef.current) return
    termRef.current?.write(data)
  }, [])

  const flushDormantOutput = useCallback((data: Uint8Array): void => {
    if (!data || data.length === 0 || disposedRef.current) return

    const term = termRef.current
    if (!term || data.length <= DORMANT_FLUSH_CHUNK_BYTES) {
      term?.write(data)
      return
    }

    let offset = 0
    const writeNextChunk = (): void => {
      if (disposedRef.current || !termRef.current) return

      const nextOffset = Math.min(offset + DORMANT_FLUSH_CHUNK_BYTES, data.length)
      termRef.current.write(data.subarray(offset, nextOffset), () => {
        offset = nextOffset
        if (offset < data.length) {
          requestAnimationFrame(writeNextChunk)
        }
      })
    }

    writeNextChunk()
  }, [])

  /**
   * Perform fit() with dimension caching and guards.
   * Returns true if fit was actually performed.
   */
  const performFit = useCallback((force = false): boolean => {
    const fitAddon = fitAddonRef.current
    const terminal = termRef.current
    const container = containerRef.current
    if (!fitAddon || !terminal || !container) return false

    const rect = container.getBoundingClientRect()
    const width = Math.round(rect.width)
    const height = Math.round(rect.height)

    // Guard against fitting to a collapsed container (e.g. window restore)
    if (width < MIN_FIT_WIDTH || height < MIN_FIT_HEIGHT) {
      return false
    }

    // Skip if dimensions haven't changed (and not forced)
    if (
      !force &&
      width === lastContainerWidthRef.current &&
      height === lastContainerHeightRef.current
    ) {
      return false
    }

    // Save scroll position before fit
    const buffer = terminal.buffer?.active
    const scrollTop = buffer?.viewportY ?? 0
    const baseY = buffer?.baseY ?? 0

    try {
      fitAddon.fit()
    } catch {
      return false
    }

    if (width > 0 && height > 0) {
      lastContainerWidthRef.current = width
      lastContainerHeightRef.current = height
    }

    // Restore scroll position if user was scrolled up
    if (scrollTop > 0 && scrollTop < baseY) {
      terminal.scrollToLine(scrollTop)
    }

    return true
  }, [])

  const performFitRef = useRef(performFit)
  performFitRef.current = performFit

  const resizePty = useCallback((cols: number, rows: number): void => {
    if (cols === lastColsRef.current && rows === lastRowsRef.current) return

    const ptySession = ptySessions.get(tabIdRef.current)
    if (!ptySession || ptySession.exited) return

    lastColsRef.current = cols
    lastRowsRef.current = rows
    ptySession.pty.resize(cols, rows)
  }, [])

  /**
   * Debounced fit + PTY resize handler (called from ResizeObserver).
   */
  const handleResize = useCallback((): void => {
    if (!activeRef.current) return

    // Stage 1: fit debounce (8ms)
    if (fitTimerRef.current) clearTimeout(fitTimerRef.current)

    fitTimerRef.current = setTimeout(() => {
      fitTimerRef.current = null

      const didFit = performFitRef.current(false)
      if (!didFit) return

      // Stage 2: PTY resize debounce (256ms)
      const term = termRef.current
      if (!term) return
      const cols = term.cols
      const rows = term.rows

      if (cols === lastColsRef.current && rows === lastRowsRef.current) return

      if (ptyTimerRef.current) clearTimeout(ptyTimerRef.current)

      ptyTimerRef.current = setTimeout(() => {
        ptyTimerRef.current = null
        resizePty(cols, rows)
      }, PTY_RESIZE_DEBOUNCE_MS)
    }, FIT_DEBOUNCE_MS)
  }, [resizePty])

  const handleResizeRef = useRef(handleResize)
  handleResizeRef.current = handleResize

  /**
   * Force immediate fit + PTY resize (used after visibility change, init).
   */
  const forceFit = useCallback((): void => {
    if (ptyTimerRef.current) {
      clearTimeout(ptyTimerRef.current)
      ptyTimerRef.current = null
    }

    const didFit = performFitRef.current(true)
    const terminal = termRef.current
    if (didFit && terminal) {
      resizePty(terminal.cols, terminal.rows)
    }
  }, [resizePty])

  const initTerminal = useCallback(async () => {
    if (!containerRef.current) return

    try {
      const os = platform()
      const currentTabId = tabIdRef.current
      const termOptions = getTerminalOptions(os === 'windows' ? 'Win32' : os, isDarkRef.current)

      // ── Create xterm ──────────────────────────────────────────────────────
      const term = new Terminal(termOptions)
      termRef.current = term

      const fitAddon = new FitAddon()
      fitAddonRef.current = fitAddon
      term.loadAddon(fitAddon)

      term.open(containerRef.current)

      try { term.focus() } catch { /* focus may not be available yet */ }

      fitAddon.fit()

      // ── WebGL renderer ────────────────────────────────────────────────────
      const shouldLoadWebgl = rendererPreferenceRef.current !== 'dom'
      if (shouldLoadWebgl) {
        let webglAttempts = 0
        const loadWebgl = (): void => {
          if (disposedRef.current || webglAttempts >= MAX_WEBGL_RETRIES) {
            if (webglAttempts >= MAX_WEBGL_RETRIES) {
              console.warn('[TauriTerminal] WebGL failed after max retries, using DOM renderer')
            }
            return
          }
          try {
            const webglAddon = new WebglAddon()
            webglAddonRef.current = webglAddon
            webglAddon.onContextLoss(() => {
              webglAddon.dispose()
              webglAddonRef.current = null
              webglAttempts++
              loadWebgl()
            })
            term.loadAddon(webglAddon)
          } catch {
            webglAttempts++
            console.warn(`[TauriTerminal] WebGL attempt ${webglAttempts} failed`)
            loadWebgl()
          }
        }
        loadWebgl()
      }

      // ── Acquire PTY session (from cache or spawn) ─────────────────────────
      const { cols, rows } = fitAddon.proposeDimensions() ?? { cols: 80, rows: 24 }

      const writeToTerm = activeRef.current
        ? (data: Uint8Array) => { writeLiveOutput(data) }
        : (data: Uint8Array) => { dormantRing.push(currentTabId, data) }

      const session = await acquirePtyForTab(
        currentTabId,
        cols,
        rows,
        writeToTerm,
        (exitCode: number) => {
          if (!disposedRef.current) {
            term.writeln(`\r\n\x1b[90m[Process exited with code ${exitCode}]\x1b[0m`)
            term.options.disableStdin = true
            setStatus('exited')
          }
        },
        isDisposed,
      )

      if (!session || disposedRef.current) {
        if (session) {
          destroyPtySession(currentTabId)
        } else if (!disposedRef.current) {
          setErrorMsg('Failed to spawn terminal shell')
          setStatus('error')
          term.writeln('\r\n\x1b[31m[Error] Failed to spawn terminal shell\x1b[0m')
        }
        return
      }

      // ── Terminal → PTY input ───────────────────────────────────────────────
      const termDataDisposable = term.onData((data: string) => {
        const s = ptySessions.get(currentTabId)
        if (s && !s.exited) s.pty.write(data)
      })
      cleanupFnsRef.current.push(() => { try { termDataDisposable.dispose() } catch { /* ignore */ } })

      // ── Flush dormant buffer (if active) ───────────────────────────────────
      if (activeRef.current) {
        const dormantData = dormantRing.drain(currentTabId)
        if (dormantData) {
          flushDormantOutput(dormantData)
        }
      }

      // ── ResizeObserver on containerRef ─────────────────────────────────────
      if (containerRef.current) {
        const observer = new ResizeObserver(() => {
          handleResizeRef.current()
        })
        observer.observe(containerRef.current)

        cleanupFnsRef.current.push(() => observer.disconnect())
      }

      if (!disposedRef.current) setStatus(session.exited ? 'exited' : 'ready')
    } catch (err) {
      if (!disposedRef.current) {
        const msg = `Terminal initialization failed: ${err}`
        setErrorMsg(msg)
        setStatus('error')
        console.error('[TauriTerminal]', msg)
      }
    }
  }, [isDisposed, writeLiveOutput, flushDormantOutput])

  // ── Activation / visibility lifecycle (single coherent effect) ─────────────
  // When `active` becomes true for the first time: create Terminal + PTY.
  // When `active` toggles after initial activation: re-wire PTY and flush.
  // This avoids the race between initTerminal + visibility effects competing
  // for the same PTY session's onData handler.
  useEffect(() => {
    if (!active) {
      // Tab became inactive — re-wire PTY → dormant ring (keep PTY alive)
      if (!hasActivatedRef.current) return
      const session = ptySessions.get(tabId)
      if (!session || session.exited) return
      try { session.onDataDisposable.dispose() } catch { /* ignore */ }
      session.onDataDisposable = session.pty.onData((data: Uint8Array) => {
        dormantRing.push(tabId, data)
      })
      return
    }

    // Tab became active
    if (!hasActivatedRef.current) {
      // First activation: create Terminal + PTY (costly, done once per tab)
      hasActivatedRef.current = true
      initTerminal()
      return
    }

    // Already activated: re-wire PTY → terminal, flush dormant ring, fit
    const session = ptySessions.get(tabId)
    if (!session || session.exited || !termRef.current) return

    try { session.onDataDisposable.dispose() } catch { /* ignore */ }
    session.onDataDisposable = session.pty.onData((data: Uint8Array) => {
      if (!disposedRef.current && termRef.current) {
        writeLiveOutput(data)
      }
    })

    const dormantData = dormantRing.drain(tabId)
    if (dormantData && termRef.current) {
      flushDormantOutput(dormantData)
    }

    // Double-RAF to ensure DOM is fully rendered before fitting
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        forceFit()
        try { termRef.current?.focus() } catch { /* ignore */ }
      })
    })
  }, [active, tabId, initTerminal, forceFit, writeLiveOutput, flushDormantOutput])

  // Update xterm theme when app theme changes
  useEffect(() => {
    if (termRef.current) {
      termRef.current.options.theme = getTerminalTheme(isDark)
    }
  }, [isDark])

  // ── Mount / unmount lifecycle ──────────────────────────────────────────────
  useEffect(() => {
    disposedRef.current = false

    return () => {
      disposedRef.current = true

      // Clear resize timers
      if (fitTimerRef.current) clearTimeout(fitTimerRef.current)
      if (ptyTimerRef.current) clearTimeout(ptyTimerRef.current)

      // ── Redirect PTY output to DormantRing (keep PTY alive) ────────────────
      const session = ptySessions.get(tabId)
      if (session && !session.exited) {
        try { session.onDataDisposable.dispose() } catch { /* ignore */ }
        session.onDataDisposable = session.pty.onData((data: Uint8Array) => {
          dormantRing.push(tabId, data)
        })
      }

      // ── Clean up listeners ─────────────────────────────────────────────────
      for (const fn of cleanupFnsRef.current) {
        try { fn() } catch { /* ignore */ }
      }
      cleanupFnsRef.current = []

      // ── Dispose xterm and WebGL (only if Terminal was ever created) ─────────
      if (hasActivatedRef.current) {
        try { webglAddonRef.current?.dispose() } catch { /* ignore */ }
        webglAddonRef.current = null
        try { termRef.current?.dispose() } catch { /* ignore */ }
        termRef.current = null
        fitAddonRef.current = null
      }
    }
  }, [tabId])

  const bgColor = useMemo(() => isDark ? 'bg-[#0d1117]' : 'bg-[#f6f8fa]', [isDark])

  return { containerRef, status, errorMsg, bgColor }
}

// Re-export PTY manager helpers for use by TerminalPanel
export { destroyPtySession, ptySessions }
