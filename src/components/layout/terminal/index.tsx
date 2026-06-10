import { invoke } from '@tauri-apps/api/core'
import { platform } from '@tauri-apps/plugin-os'
import { FitAddon } from '@xterm/addon-fit'
import { WebglAddon } from '@xterm/addon-webgl'
import { Terminal } from '@xterm/xterm'
import { useCallback, useEffect, useRef, useState } from 'react'
import { spawn } from 'tauri-pty'
import { getTerminalOptions, getTerminalTheme, RESIZE_DEBOUNCE_MS } from '@/components/terminal/terminal-config'
import { useTheme } from '@/components/theme-provider'
import type { ShellInfo } from '@/lib/tauri-types'
import { useTerminalRenderer } from '@/stores/app-settings-store'
import { useTerminalTabsStore } from '@/stores/terminal-tabs'
import { SessionDormantRing } from './dormant-ring'
import { TerminalTabBar } from './terminal-tab-bar'
import '@xterm/xterm/css/xterm.css'

const MAX_WEBGL_RETRIES = 3

type TerminalStatus = 'loading' | 'ready' | 'exited' | 'error'

// ─────────────────────────────────────────────────────────────────────────────
// PTY Session Manager
//
// Manages the full lifecycle of PTY processes across tab switches:
//   • Shell info is fetched once and cached (avoids repeated Tauri IPC)
//   • In-flight spawns are tracked per tabId (prevents duplicate spawns)
//   • Cached PTYs stay alive across tab switches; output buffers to DormantRing
//   • Exited sessions can be re-spawned on demand
//
// Spawn order follows the reference TauriTerminal.tsx:
//   1. get_default_shell  → check disposedRef  → exit early if unmounted
//   2. get_home_directory → check disposedRef  → exit early if unmounted
//   3. spawn()            → check disposedRef  → kill PTY if unmounted
//   4. Wire onData / onExit handlers
// ─────────────────────────────────────────────────────────────────────────────

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
 *
 * Spawn order matches the reference TauriTerminal: sequential async steps with
 * a disposedRef guard after each one, plus post-spawn cleanup if the component
 * unmounts during the spawn window.
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
  // to point at the new xterm (the old handler writes to dormantRing).
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
      // Step 1: Fetch shell info + home directory in parallel.
      // Both are cached after first call; subsequent tabs get instant results.
      const [shellInfo, cwd] = await Promise.all([
        getShellInfo(),
        getHomeDirectory(),
      ])
      if (isDisposed()) return null

      // Step 2: Spawn the PTY process
      const pty = spawn(shellInfo.path, shellInfo.args, {
        cols,
        rows,
        cwd,
      })

      // Post-spawn guard: if component unmounted while spawn() was in-flight,
      // kill the PTY immediately (matches reference TauriTerminal pattern).
      if (isDisposed()) {
        try { pty.kill() } catch { /* ignore */ }
        return null
      }

      // Step 4: Wire PTY → xterm data handler
      const onDataDisposable = pty.onData((data: Uint8Array) => {
        onData(data)
      })

      // Step 5: Wire PTY exit handler (never disposed — stays connected
      // so we can detect exit even when the tab is dormant)
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

/** Re-spawn a PTY for a tab (useful after the shell exits). */
async function respawnPty(
  tabId: string,
  cols: number,
  rows: number,
  onData: (data: Uint8Array) => void,
  onExit: (exitCode: number) => void,
  isDisposed: () => boolean,
): Promise<PtySession | null> {
  destroyPtySession(tabId)
  return acquirePtyForTab(tabId, cols, rows, onData, onExit, isDisposed)
}

// ─────────────────────────────────────────────────────────────────────────────
// TauriTerminal
//
// Renders a single terminal tab. Only mounts xterm when the tab is active.
// PTY process is kept alive in ptySessions across tab switches.
// ─────────────────────────────────────────────────────────────────────────────

interface TauriTerminalProps {
  tabId: string
}

export function TauriTerminal({ tabId }: TauriTerminalProps): React.JSX.Element {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const webglAddonRef = useRef<WebglAddon | null>(null)
  const resizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const resizeObserverRef = useRef<ResizeObserver | null>(null)
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

  const isDisposed = useCallback(() => disposedRef.current, [])

  const fitAndResize = useCallback(() => {
    if (disposedRef.current || !fitAddonRef.current) return
    try {
      fitAddonRef.current.fit()
      const ptySession = ptySessions.get(tabIdRef.current)
      if (ptySession) {
        const dims = fitAddonRef.current.proposeDimensions()
        if (dims) ptySession.pty.resize(dims.cols, dims.rows)
      }
    } catch { /* ignore */ }
  }, [])

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

      // Focus the terminal so keyboard input works immediately
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

      const session = await acquirePtyForTab(
        currentTabId,
        cols,
        rows,
        (data: Uint8Array) => {
          if (!disposedRef.current) term.write(data)
        },
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
          // PTY spawned but component already disposed — clean up
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

      // ── Flush dormant buffer ───────────────────────────────────────────────
      const dormantData = dormantRing.drain(currentTabId)
      if (dormantData) {
        term.write(dormantData)
      }

      // ── ResizeObserver ─────────────────────────────────────────────────────
      if (wrapperRef.current) {
        const resizeObserver = new ResizeObserver(() => {
          if (disposedRef.current) return
          if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current)
          resizeTimerRef.current = setTimeout(fitAndResize, RESIZE_DEBOUNCE_MS)
        })
        resizeObserver.observe(wrapperRef.current)
        resizeObserverRef.current = resizeObserver
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
  }, [fitAndResize, isDisposed])

  // Update xterm theme when app theme changes
  useEffect(() => {
    if (termRef.current) {
      termRef.current.options.theme = getTerminalTheme(isDark)
    }
  }, [isDark])

  useEffect(() => {
    disposedRef.current = false
    initTerminal()

    return () => {
      disposedRef.current = true

      // ── Disconnect resize observer first ───────────────────────────────────
      resizeObserverRef.current?.disconnect()
      resizeObserverRef.current = null
      if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current)
      resizeTimerRef.current = null

      // ── Redirect PTY output to DormantRing (keep PTY alive) ────────────────
      const session = ptySessions.get(tabId)
      if (session && !session.exited) {
        try { session.onDataDisposable.dispose() } catch { /* ignore */ }
        session.onDataDisposable = session.pty.onData((data: Uint8Array) => {
          dormantRing.push(tabId, data)
        })
      }

      // ── Clean up xterm → PTY listener ──────────────────────────────────────
      for (const fn of cleanupFnsRef.current) {
        try { fn() } catch { /* ignore */ }
      }
      cleanupFnsRef.current = []

      // ── Dispose xterm and WebGL ────────────────────────────────────────────
      try { webglAddonRef.current?.dispose() } catch { /* ignore */ }
      webglAddonRef.current = null
      try { termRef.current?.dispose() } catch { /* ignore */ }
      termRef.current = null
      fitAddonRef.current = null
    }
  }, [initTerminal, tabId])

  const bgColor = isDark ? 'bg-[#0d1117]' : 'bg-[#f6f8fa]'

  if (status === 'error') {
    return (
      <div className={`h-full w-full flex items-center justify-center ${bgColor} text-red-400 p-4`}>
        <div className="text-center">
          <p className="text-lg font-semibold mb-2">Terminal Error</p>
          <p className="text-sm text-red-300">{errorMsg}</p>
        </div>
      </div>
    )
  }

  return (
    <div ref={wrapperRef} className={`h-full w-full relative ${bgColor}`}>
      {status === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm z-10">
          Loading terminal...
        </div>
      )}
      <div ref={containerRef} className={`absolute inset-0 ${bgColor}`} />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TerminalPanel
//
// Only renders TauriTerminal for the active tab. PTY processes for inactive
// tabs are kept alive in ptySessions, with output buffered in dormantRing.
// ─────────────────────────────────────────────────────────────────────────────

export function TerminalPanel({ onClosePanel }: { onClosePanel?: () => void }): React.JSX.Element {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const tabs = useTerminalTabsStore((s) => s.tabs)
  const activeTabId = useTerminalTabsStore((s) => s.activeTabId)
  const addTab = useTerminalTabsStore((s) => s.addTab)
  const removeTab = useTerminalTabsStore((s) => s.removeTab)
  const setActiveTab = useTerminalTabsStore((s) => s.setActiveTab)

  // Ensure we always have a valid active tab
  const validActiveTabId = tabs.some((t) => t.id === activeTabId)
    ? activeTabId
    : tabs[0]?.id

  // Clean up PTY sessions for tabs that no longer exist
  useEffect(() => {
    const tabIds = new Set(tabs.map((t) => t.id))
    for (const cachedId of ptySessions.keys()) {
      if (!tabIds.has(cachedId)) {
        destroyPtySession(cachedId)
      }
    }
  }, [tabs])

  return (
    <div className="flex flex-col h-full w-full">
      <TerminalTabBar
        tabs={tabs}
        activeTabId={validActiveTabId}
        onSelect={setActiveTab}
        onClose={removeTab}
        onAdd={addTab}
        onClosePanel={onClosePanel ?? (() => {})}
        isDark={isDark}
      />
      <div className="flex-1 min-h-0 relative">
        {validActiveTabId && (
          <TauriTerminal key={validActiveTabId} tabId={validActiveTabId} />
        )}
      </div>
    </div>
  )
}
