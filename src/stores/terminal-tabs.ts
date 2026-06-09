import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface TerminalTab {
  id: string
  name: string
}

interface TerminalTabsState {
  tabs: TerminalTab[]
  activeTabId: string
  addTab: () => void
  removeTab: (id: string) => void
  setActiveTab: (id: string) => void
}

function generateId(): string {
  return `term-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function createTab(index: number): TerminalTab {
  return { id: generateId(), name: `Terminal ${index}` }
}

const initialTab = createTab(1)

export const useTerminalTabsStore = create<TerminalTabsState>()(
  persist(
    (set, get) => ({
      tabs: [initialTab],
      activeTabId: initialTab.id,

      addTab: () => {
        const { tabs } = get()
        const nextIndex = tabs.length + 1
        const newTab = createTab(nextIndex)
        set({
          tabs: [...tabs, newTab],
          activeTabId: newTab.id,
        })
      },

      removeTab: (id: string) => {
        const { tabs, activeTabId } = get()
        if (tabs.length <= 1) return

        const index = tabs.findIndex((t) => t.id === id)
        if (index === -1) return

        const nextTabs = tabs.filter((t) => t.id !== id)
        let nextActiveId = activeTabId

        if (activeTabId === id) {
          const newIndex = Math.min(index, nextTabs.length - 1)
          nextActiveId = nextTabs[newIndex]?.id ?? nextTabs[0].id
        }

        set({ tabs: nextTabs, activeTabId: nextActiveId })
      },

      setActiveTab: (id: string) => {
        const { tabs } = get()
        if (tabs.some((t) => t.id === id)) {
          set({ activeTabId: id })
        }
      },
    }),
    {
      name: '0xbuffer-terminal-tabs',
      version: 1,
      partialize: (state) => ({
        tabs: state.tabs,
        activeTabId: state.activeTabId,
      }),
      // Ensure activeTabId is always valid after hydration
      onRehydrateStorage: () => {
        return (state) => {
          if (state && !state.tabs.some((t) => t.id === state.activeTabId)) {
            state.activeTabId = state.tabs[0]?.id ?? initialTab.id
          }
        }
      },
    }
  )
)
