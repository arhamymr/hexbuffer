import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AppSettingsState {
  hiddenNavItems: string[]
  pinnedNavItems: string[]
  recentApps: string[]
  toggleNavItem: (href: string) => void
  resetHiddenNavItems: () => void
  togglePinNavItem: (href: string) => void
  reorderPinnedNavItems: (fromIndex: number, toIndex: number) => void
  addRecentApp: (href: string) => void
  removeRecentApp: (href: string) => void
}

type PersistedSettings = Pick<AppSettingsState, 'hiddenNavItems' | 'pinnedNavItems' | 'recentApps'>

export const useAppSettingsStore = create<AppSettingsState>()(
  persist<AppSettingsState, [], [], PersistedSettings>(
    (set) => ({
      hiddenNavItems: [],
      pinnedNavItems: [
        '/http-history',
        '/websocket-history',
        '/intercept',
        '/repeater',
        '/browser',
        '/documents',
      ],
      recentApps: [],
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
      addRecentApp: (href) =>
        set((state) => {
          const filtered = (state.recentApps || []).filter((h) => h !== href);
          const updated = [href, ...filtered].slice(0, 5);
          return { recentApps: updated };
        }),
      removeRecentApp: (href) =>
        set((state) => ({
          recentApps: (state.recentApps || []).filter((h) => h !== href),
        })),
    }),
    {
      name: 'hexbuffer-app-settings',
      partialize: (state) => ({
        hiddenNavItems: state.hiddenNavItems,
        pinnedNavItems: state.pinnedNavItems,
        recentApps: state.recentApps,
      }),
      merge: (persisted, current): AppSettingsState => {
        const base = current as AppSettingsState
        const state = persisted as Partial<PersistedSettings> | undefined
        return {
          ...base,
          hiddenNavItems: state?.hiddenNavItems ?? base.hiddenNavItems,
          pinnedNavItems: state?.pinnedNavItems ?? base.pinnedNavItems,
          recentApps: state?.recentApps ?? base.recentApps,
        }
      },
    }
  )
)
