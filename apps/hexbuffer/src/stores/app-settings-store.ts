import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type TerminalRenderer = 'webgl' | 'dom'

interface AppSettingsState {
  terminalRenderer: TerminalRenderer
  hiddenNavItems: string[]
  setTerminalRenderer: (renderer: TerminalRenderer) => void
  toggleNavItem: (href: string) => void
  resetHiddenNavItems: () => void
}

type PersistedSettings = Pick<AppSettingsState, 'terminalRenderer' | 'hiddenNavItems'>

export const useAppSettingsStore = create<AppSettingsState>()(
  persist<AppSettingsState, [], [], PersistedSettings>(
    (set) => ({
      terminalRenderer: 'webgl',
      hiddenNavItems: [],
      setTerminalRenderer: (terminalRenderer) => set({ terminalRenderer }),
      toggleNavItem: (href) =>
        set((state) => ({
          hiddenNavItems: state.hiddenNavItems.includes(href)
            ? state.hiddenNavItems.filter((h) => h !== href)
            : [...state.hiddenNavItems, href],
        })),
      resetHiddenNavItems: () => set({ hiddenNavItems: [] }),
    }),
    {
      name: 'hexbuffer-app-settings',
      partialize: (state) => ({
        terminalRenderer: state.terminalRenderer,
        hiddenNavItems: state.hiddenNavItems,
      }),
      merge: (persisted, current): AppSettingsState => {
        const base = current as AppSettingsState
        const state = persisted as Partial<PersistedSettings> | undefined
        return {
          ...base,
          terminalRenderer: state?.terminalRenderer ?? base.terminalRenderer,
          hiddenNavItems: state?.hiddenNavItems ?? base.hiddenNavItems,
        }
      },
    }
  )
)

export function useTerminalRenderer(): TerminalRenderer {
  return useAppSettingsStore((s) => s.terminalRenderer)
}
