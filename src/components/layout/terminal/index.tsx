import { memo, useMemo } from 'react'
import { useTerminalInstance } from '@/components/layout/terminal/hooks/use-terminal-instance'
import { useTerminalPanel } from '@/components/layout/terminal/hooks/use-terminal-panel'
import { TerminalTabBar } from './terminal-tab-bar'
import '@xterm/xterm/css/xterm.css'

// Stable no-op reference for onClosePanel fallback
const NOOP = () => {}

// ─────────────────────────────────────────────────────────────────────────────
// TauriTerminal
//
// Renders a single terminal tab. The Terminal instance lives for the
// component's lifetime (created once, disposed on unmount). When `active` is
// false, the terminal is hidden via CSS and PTY output is buffered to the
// dormant ring — no Terminal disposal or WebGL context recreation on tab switch.
// ─────────────────────────────────────────────────────────────────────────────

interface TauriTerminalProps {
  tabId: string
  active: boolean
}

export const TauriTerminal = memo(function TauriTerminal({ tabId, active }: TauriTerminalProps): React.JSX.Element {
  const { containerRef, status, errorMsg, bgColor } = useTerminalInstance({ tabId, active })

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
    <div className={`h-full w-full relative ${!active ? 'hidden' : ''}`}>
      {status === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm z-10">
          Loading terminal...
        </div>
      )}
      <div
        ref={containerRef}
        className={`absolute inset-0 ${bgColor}`}
        // xterm FitAddon requires zero padding on the container div
      />
    </div>
  )
})

// ─────────────────────────────────────────────────────────────────────────────
// TerminalPanel
//
// Renders the terminal tab bar + all TauriTerminal instances. Terminals for
// inactive tabs are kept mounted (hidden via CSS) so the WebGL context, font
// atlas, and xterm state survive tab switches. PTY output is buffered via
// dormantRing for inactive tabs. All orchestration logic lives in
// useTerminalPanel.
// ─────────────────────────────────────────────────────────────────────────────

export function TerminalPanel({ onClosePanel }: { onClosePanel?: () => void }): React.JSX.Element {
  const { tabs, activeTabId, isDark, addTab, removeTab, setActiveTab } = useTerminalPanel()
  const handleClosePanel = useMemo(() => onClosePanel ?? NOOP, [onClosePanel])

  return (
    <div className="flex flex-col h-full w-full">
      <TerminalTabBar
        tabs={tabs}
        activeTabId={activeTabId ?? ''}
        onSelect={setActiveTab}
        onClose={removeTab}
        onAdd={addTab}
        onClosePanel={handleClosePanel}
        isDark={isDark}
      />
      <div className="flex-1 min-h-0 relative">
        {tabs.map((tab) => (
          <TauriTerminal
            key={tab.id}
            tabId={tab.id}
            active={tab.id === activeTabId}
          />
        ))}
      </div>
    </div>
  )
}
