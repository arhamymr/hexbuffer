import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type TerminalRenderer = 'webgl' | 'dom'

interface AppSettingsState {
  terminalRenderer: TerminalRenderer
  setTerminalRenderer: (renderer: TerminalRenderer) => void
}

type PersistedSettings = Pick<AppSettingsState, 'terminalRenderer'>

export const useAppSettingsStore = create<AppSettingsState>()(
  persist<AppSettingsState, [], [], PersistedSettings>(
    (set) => ({
      terminalRenderer: 'webgl',
      setTerminalRenderer: (terminalRenderer) => set({ terminalRenderer }),
    }),
    {
      name: '0xbuffer-app-settings',
      partialize: (state) => ({ terminalRenderer: state.terminalRenderer }),
      merge: (persisted, current): AppSettingsState => {
        const base = current as AppSettingsState
        const state = persisted as Partial<PersistedSettings> | undefined
        return {
          ...base,
          terminalRenderer: state?.terminalRenderer ?? base.terminalRenderer,
        }
      },
    }
  )
)

export function useTerminalRenderer(): TerminalRenderer {
  return useAppSettingsStore((s) => s.terminalRenderer)
}
