import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type TerminalRenderer = 'webgl' | 'dom'

interface AppSettingsState {
  terminalRenderer: TerminalRenderer
  hiddenNavItems: string[]
  pinnedNavItems: string[]
  setTerminalRenderer: (renderer: TerminalRenderer) => void
  toggleNavItem: (href: string) => void
  resetHiddenNavItems: () => void
  togglePinNavItem: (href: string) => void
  reorderPinnedNavItems: (fromIndex: number, toIndex: number) => void
}

type PersistedSettings = Pick<AppSettingsState, 'terminalRenderer' | 'hiddenNavItems' | 'pinnedNavItems'>

export const useAppSettingsStore = create<AppSettingsState>()(
  persist<AppSettingsState, [], [], PersistedSettings>(
    (set) => ({
      terminalRenderer: 'webgl',
      hiddenNavItems: [],
      pinnedNavItems: [
        '/live-traffic',
        '/intercept',
        '/repeater',
        '/browser',
        '/documents',
      ],
      setTerminalRenderer: (terminalRenderer) => set({ terminalRenderer }),
      toggleNavItem: (href) =>
        set((state) => ({
          hiddenNavItems: state.hiddenNavItems.includes(href)
            ? state.hiddenNavItems.filter((h) => h !== href)
            : [...state.hiddenNavItems, href],
        })),
      resetHiddenNavItems: () => set({ hiddenNavItems: [] }),
      togglePinNavItem: (href) =>
        set((state) => ({
          pinnedNavItems: state.pinnedNavItems.includes(href)
            ? state.pinnedNavItems.filter((h) => h !== href)
            : [...state.pinnedNavItems, href],
        })),
      reorderPinnedNavItems: (fromIndex, toIndex) =>
        set((state) => {
          const items = [...state.pinnedNavItems];
          const [moved] = items.splice(fromIndex, 1);
          items.splice(toIndex, 0, moved);
          return { pinnedNavItems: items };
        }),
    }),
    {
      name: 'hexbuffer-app-settings',
      partialize: (state) => ({
        terminalRenderer: state.terminalRenderer,
        hiddenNavItems: state.hiddenNavItems,
        pinnedNavItems: state.pinnedNavItems,
      }),
      merge: (persisted, current): AppSettingsState => {
        const base = current as AppSettingsState
        const state = persisted as Partial<PersistedSettings> | undefined
        return {
          ...base,
          terminalRenderer: state?.terminalRenderer ?? base.terminalRenderer,
          hiddenNavItems: state?.hiddenNavItems ?? base.hiddenNavItems,
          pinnedNavItems: state?.pinnedNavItems ?? base.pinnedNavItems,
        }
      },
    }
  )
)

export function useTerminalRenderer(): TerminalRenderer {
  return useAppSettingsStore((s) => s.terminalRenderer)
}
