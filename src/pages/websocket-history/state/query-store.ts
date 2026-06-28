import { create } from 'zustand';

export interface WebSocketFilterState {
  search: string;
}

interface WebSocketHistoryQueryState {
  filter: WebSocketFilterState;
  activeScope: string[] | null;
  page: number;
  perPage: number;
  selectedConnectionId: string | null;
  isStreamManuallyPaused: boolean;
  refreshKey: number;

  setSearch: (search: string) => void;
  setActiveScope: (scope: string[] | null) => void;
  setPage: (page: number) => void;
  resetPage: () => void;
  setSelectedConnectionId: (id: string | null) => void;
  setStreamManuallyPaused: (paused: boolean) => void;
  triggerRefresh: () => void;
}

export const useWebSocketHistoryQueryStore = create<WebSocketHistoryQueryState>()((set) => ({
  filter: { search: '' },
  activeScope: null,
  page: 1,
  perPage: 100,
  selectedConnectionId: null,
  isStreamManuallyPaused: false,
  refreshKey: 0,

  setSearch: (search) =>
    set((state) => ({
      filter: { ...state.filter, search },
      page: 1,
    })),

  setActiveScope: (scope) =>
    set((state) => {
      const normalizedScope = scope && scope.length > 0 ? [...scope] : null;
      const currentScope = state.activeScope && state.activeScope.length > 0 ? state.activeScope : null;

      if (JSON.stringify(currentScope ?? []) === JSON.stringify(normalizedScope ?? [])) {
        return state;
      }

      return {
        activeScope: normalizedScope,
        page: 1,
        selectedConnectionId: null,
      };
    }),

  setPage: (page) => set({ page }),
  resetPage: () => set({ page: 1 }),
  setSelectedConnectionId: (id) => set({ selectedConnectionId: id }),
  setStreamManuallyPaused: (paused) => set({ isStreamManuallyPaused: paused }),
  triggerRefresh: () =>
    set((state) => ({
      refreshKey: state.refreshKey + 1,
    })),
}));
