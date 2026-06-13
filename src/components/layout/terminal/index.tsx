import React, { useMemo, useImperativeHandle } from 'react'
import { PanelBottomClose } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTerminalInstance } from '@/components/layout/terminal/hooks/use-terminal-instance'
import { useTheme } from '@/components/theme-provider'
import '@xterm/xterm/css/xterm.css'

// Stable no-op reference for onClosePanel fallback
const NOOP = () => {}

// ─────────────────────────────────────────────────────────────────────────────
// TerminalPanelHandle — imperative API exposed to parent components
// ─────────────────────────────────────────────────────────────────────────────

export interface TerminalPanelHandle {
  write(data: string): void
  writeln(data: string): void
  clear(): void
  focus(): void
}

// ─────────────────────────────────────────────────────────────────────────────
// TerminalPanel
//
// Renders a single terminal instance with a minimal toolbar. The Terminal +
// PTY are created on mount and disposed on unmount.
//
// Exposes an imperative handle (ref) so parents can programmatically write
// text to the terminal without going through the PTY.
// ─────────────────────────────────────────────────────────────────────────────

export const TerminalPanel = React.forwardRef<
  TerminalPanelHandle,
  { onClosePanel?: () => void }
>(function TerminalPanel({ onClosePanel }, ref) {
  const { containerRef, termRef, status, errorMsg, bgColor } = useTerminalInstance()
  const handleClosePanel = useMemo(() => onClosePanel ?? NOOP, [onClosePanel])
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  useImperativeHandle(
    ref,
    () => ({
      write(data: string) {
        termRef.current?.write(data)
      },
      writeln(data: string) {
        termRef.current?.writeln(data)
      },
      clear() {
        termRef.current?.clear()
      },
      focus() {
        termRef.current?.focus()
      },
    }),
    [],
  )

  const toolbarBg = isDark ? 'bg-[#0d1117]' : 'bg-[#f6f8fa]'
  const toolbarBorder = isDark ? 'border-[#21262d]' : 'border-[#d0d7de]'
  const btnMuted = isDark ? 'text-[#6e7681]' : 'text-[#6e7781]'
  const btnHover = isDark ? 'hover:bg-[#21262d] hover:text-[#c9d1d9]' : 'hover:bg-[#d0d7de] hover:text-[#1f2328]'

  if (status === 'error') {
    return (
      <div className="flex flex-col h-full w-full">
        <div className={cn('flex items-center justify-end h-6 shrink-0 border-b px-1', toolbarBg, toolbarBorder)}>
          <button
            onClick={handleClosePanel}
            className={cn('flex items-center justify-center h-5 w-5 rounded transition-colors', btnMuted, btnHover)}
            title="Close terminal panel"
          >
            <PanelBottomClose className="size-3" />
          </button>
        </div>
        <div className={cn('flex-1 min-h-0 flex items-center justify-center text-red-400 p-4', bgColor)}>
          <div className="text-center">
            <p className="text-lg font-semibold mb-2">Terminal Error</p>
            <p className="text-sm text-red-300">{errorMsg}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full w-full">
      <div className={cn('flex items-center justify-end h-6 shrink-0 border-b px-1', toolbarBg, toolbarBorder)}>
        <button
          onClick={handleClosePanel}
          className={cn('flex items-center justify-center h-5 w-5 rounded transition-colors', btnMuted, btnHover)}
          title="Close terminal panel"
        >
          <PanelBottomClose className="size-3" />
        </button>
      </div>
      <div className="flex-1 min-h-0 relative">
        {status === 'loading' && (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm z-10">
            Loading terminal...
          </div>
        )}
        <div
          ref={containerRef}
          className={cn('absolute inset-0', bgColor)}
        />
      </div>
    </div>
  )
})
