import { useEffect, useMemo } from 'react'
import { useShallow } from 'zustand/shallow'
import { useTheme } from '@/components/theme-provider'
import { useTerminalTabsStore } from '@/stores/terminal-tabs'
import { destroyPtySession, ptySessions } from '@/components/layout/terminal/hooks/use-terminal-instance'

interface UseTerminalPanelReturn {
  tabs: ReturnType<typeof useTerminalTabsStore.getState>['tabs']
  activeTabId: string | undefined
  isDark: boolean
  addTab: () => void
  removeTab: (id: string) => void
  setActiveTab: (id: string) => void
}

export function useTerminalPanel(): UseTerminalPanelReturn {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  // Combine tabs + activeTabId with shallow comparison to avoid dual subscriptions
  const { tabs, activeTabId } = useTerminalTabsStore(
    useShallow((s) => ({ tabs: s.tabs, activeTabId: s.activeTabId })),
  )
  // Actions are stable references — subscribe separately to avoid selector noise
  const addTab = useTerminalTabsStore((s) => s.addTab)
  const removeTab = useTerminalTabsStore((s) => s.removeTab)
  const setActiveTab = useTerminalTabsStore((s) => s.setActiveTab)

  // Ensure we always have a valid active tab
  const validActiveTabId = useMemo(
    () => (tabs.some((t) => t.id === activeTabId) ? activeTabId : tabs[0]?.id),
    [tabs, activeTabId],
  )

  // Clean up PTY sessions for tabs that no longer exist
  useEffect(() => {
    const tabIds = new Set(tabs.map((t) => t.id))
    for (const cachedId of ptySessions.keys()) {
      if (!tabIds.has(cachedId)) {
        destroyPtySession(cachedId)
      }
    }
  }, [tabs])

  return { tabs, activeTabId: validActiveTabId, isDark, addTab, removeTab, setActiveTab }
}
