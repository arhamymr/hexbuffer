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

// ─────────────────────────────────────────────────────────────────────────────
// Shell info & home directory caches (fetched once via Tauri IPC)
// ─────────────────────────────────────────────────────────────────────────────

const MAX_WEBGL_RETRIES = 3
/** Debounce for fit() — keeps UI responsive during continuous drag */
const FIT_DEBOUNCE_MS = 8
/** Debounce for PTY resize IPC — caps at ~4 calls/sec */
const PTY_RESIZE_DEBOUNCE_MS = 256
/** Minimum container dimensions to fit — prevents grid collapse on restore */
const MIN_FIT_WIDTH = 40
const MIN_FIT_HEIGHT = 40

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

// ─────────────────────────────────────────────────────────────────────────────
// Hook: useTerminalInstance
//
// Manages the full lifecycle of a single xterm.js + PTY instance.
// Created once on mount, disposed on unmount.
//
// Two-stage resize pipeline:
//   1. fit() debounced at 8ms  — keeps the UI responsive during drag
//   2. PTY resize debounced at 256ms — avoids spamming the backend IPC
// ─────────────────────────────────────────────────────────────────────────────

type TerminalStatus = 'loading' | 'ready' | 'exited' | 'error'

interface UseTerminalInstanceReturn {
  containerRef: React.RefObject<HTMLDivElement | null>
  status: TerminalStatus
  errorMsg: string
  bgColor: string
}

export function useTerminalInstance(): UseTerminalInstanceReturn {
  const containerRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const webglAddonRef = useRef<WebglAddon | null>(null)
  const ptyRef = useRef<ReturnType<typeof spawn> | null>(null)
  const cleanupFnsRef = useRef<Array<() => void>>([])
  const disposedRef = useRef(false)
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

  const isDisposed = useCallback(() => disposedRef.current, [])

  /**
   * Perform fit() with dimension caching and guards.
   */
  const performFit = useCallback((force = false): boolean => {
    const fitAddon = fitAddonRef.current
    const terminal = termRef.current
    const container = containerRef.current
    if (!fitAddon || !terminal || !container) return false

    const rect = container.getBoundingClientRect()
    const width = Math.round(rect.width)
    const height = Math.round(rect.height)

    if (width < MIN_FIT_WIDTH || height < MIN_FIT_HEIGHT) return false

    if (
      !force &&
      width === lastContainerWidthRef.current &&
      height === lastContainerHeightRef.current
    ) {
      return false
    }

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

    if (scrollTop > 0 && scrollTop < baseY) {
      terminal.scrollToLine(scrollTop)
    }

    return true
  }, [])

  const performFitRef = useRef(performFit)
  performFitRef.current = performFit

  const resizePty = useCallback((cols: number, rows: number): void => {
    if (cols === lastColsRef.current && rows === lastRowsRef.current) return
    const pty = ptyRef.current
    if (!pty) return
    lastColsRef.current = cols
    lastRowsRef.current = rows
    pty.resize(cols, rows)
  }, [])

  const handleResize = useCallback((): void => {
    if (fitTimerRef.current) clearTimeout(fitTimerRef.current)

    fitTimerRef.current = setTimeout(() => {
      fitTimerRef.current = null

      const didFit = performFitRef.current(false)
      if (!didFit) return

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

  const initTerminal = useCallback(async () => {
    if (!containerRef.current) return

    try {
      const os = platform()
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

      // ── Kick off PTY spawn in parallel with WebGL init ─────────────────────
      const { cols, rows } = fitAddon.proposeDimensions() ?? { cols: 80, rows: 24 }

      const ptyPromise = (async () => {
        const [shellInfo, cwd] = await Promise.all([getShellInfo(), getHomeDirectory()])
        if (isDisposed()) return null

        const pty = spawn(shellInfo.path, shellInfo.args, { cols, rows, cwd })
        if (isDisposed()) {
          try { pty.kill() } catch { /* ignore */ }
          return null
        }

        ptyRef.current = pty
        return pty
      })()

      // ── WebGL renderer (synchronous GPU work, overlaps with PTY IPC) ──────
      const shouldLoadWebgl = rendererPreferenceRef.current !== 'dom'
      if (shouldLoadWebgl) {
        let webglAttempts = 0
        const loadWebgl = (): void => {
          if (disposedRef.current || webglAttempts >= MAX_WEBGL_RETRIES) {
            if (webglAttempts >= MAX_WEBGL_RETRIES) {
              console.warn('[Terminal] WebGL failed after max retries, using DOM renderer')
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
            console.warn(`[Terminal] WebGL attempt ${webglAttempts} failed`)
            loadWebgl()
          }
        }
        loadWebgl()
      }

      // ── Await PTY spawn (may already be resolved) ──────────────────────────
      const pty = await ptyPromise

      if (!pty || disposedRef.current) {
        if (pty) {
          try { pty.kill() } catch { /* ignore */ }
        } else if (!disposedRef.current) {
          setErrorMsg('Failed to spawn terminal shell')
          setStatus('error')
          term.writeln('\r\n\x1b[31m[Error] Failed to spawn terminal shell\x1b[0m')
        }
        return
      }

      // ── PTY → Terminal output ─────────────────────────────────────────────
      const onDataDisposable = pty.onData((data: Uint8Array) => {
        if (!data || data.length === 0 || disposedRef.current) return
        term.write(data)
      })
      cleanupFnsRef.current.push(() => { try { onDataDisposable.dispose() } catch { /* ignore */ } })

      // ── PTY exit ──────────────────────────────────────────────────────────
      const onExitDisposable = pty.onExit(({ exitCode }: { exitCode: number }) => {
        if (!disposedRef.current) {
          term.writeln(`\r\n\x1b[90m[Process exited with code ${exitCode}]\x1b[0m`)
          term.options.disableStdin = true
          setStatus('exited')
        }
      })
      cleanupFnsRef.current.push(() => { try { onExitDisposable.dispose() } catch { /* ignore */ } })

      // ── Terminal → PTY input ───────────────────────────────────────────────
      const termDataDisposable = term.onData((data: string) => {
        if (ptyRef.current) ptyRef.current.write(data)
      })
      cleanupFnsRef.current.push(() => { try { termDataDisposable.dispose() } catch { /* ignore */ } })

      // ── ResizeObserver ────────────────────────────────────────────────────
      if (containerRef.current) {
        const observer = new ResizeObserver(() => {
          handleResizeRef.current()
        })
        observer.observe(containerRef.current)
        cleanupFnsRef.current.push(() => observer.disconnect())
      }

      if (!disposedRef.current) setStatus('ready')
    } catch (err) {
      if (!disposedRef.current) {
        const msg = `Terminal initialization failed: ${err}`
        setErrorMsg(msg)
        setStatus('error')
        console.error('[Terminal]', msg)
      }
    }
  }, [isDisposed])

  // ── Mount / unmount lifecycle ──────────────────────────────────────────────
  useEffect(() => {
    disposedRef.current = false
    initTerminal()

    return () => {
      disposedRef.current = true

      // Clear resize timers
      if (fitTimerRef.current) clearTimeout(fitTimerRef.current)
      if (ptyTimerRef.current) clearTimeout(ptyTimerRef.current)

      // Kill PTY
      try { ptyRef.current?.kill() } catch { /* ignore */ }
      ptyRef.current = null

      // Clean up listeners
      for (const fn of cleanupFnsRef.current) {
        try { fn() } catch { /* ignore */ }
      }
      cleanupFnsRef.current = []

      // Dispose xterm and WebGL
      try { webglAddonRef.current?.dispose() } catch { /* ignore */ }
      webglAddonRef.current = null
      try { termRef.current?.dispose() } catch { /* ignore */ }
      termRef.current = null
      fitAddonRef.current = null
    }
  }, [initTerminal])

  // Update xterm theme when app theme changes
  useEffect(() => {
    if (termRef.current) {
      termRef.current.options.theme = getTerminalTheme(isDark)
    }
  }, [isDark])

  const bgColor = useMemo(() => isDark ? 'bg-[#0d1117]' : 'bg-[#f6f8fa]', [isDark])

  return { containerRef, status, errorMsg, bgColor }
}
