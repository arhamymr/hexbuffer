import { create } from 'zustand';

export interface HistoryFilterState {
  search: string;
  methods: Set<string>;
  statusCodes: Set<string>;
  pathFilter: string | null;
}

interface HistoryQueryState {
  filter: HistoryFilterState;
  activeScope: string[] | null;
  sortOrder: 'asc' | 'desc';
  page: number;
  perPage: number;
  selectedCallId: string | null;
  isStreamManuallyPaused: boolean;
  refreshKey: number;

  setSearch: (search: string) => void;
  setFilter: (filter: HistoryFilterState) => void;
  setPathFilter: (path: string | null) => void;
  setActiveScope: (scope: string[] | null) => void;
  toggleMethod: (method: string) => void;
  toggleStatus: (status: string) => void;
  clearFilters: () => void;
  setSortOrder: (order: 'asc' | 'desc') => void;
  setPage: (page: number) => void;
  resetPage: () => void;
  setSelectedCallId: (id: string | null) => void;
  setStreamManuallyPaused: (paused: boolean) => void;
  triggerRefresh: () => void;
}

const initialFilterState = (): HistoryFilterState => ({
  search: '',
  methods: new Set(),
  statusCodes: new Set(),
  pathFilter: null,
});

export const useHttpHistoryQueryStore = create<HistoryQueryState>()((set) => ({
  filter: initialFilterState(),
  activeScope: null,
  sortOrder: 'desc',
  page: 1,
  perPage: 60,
  selectedCallId: null,
  isStreamManuallyPaused: false,
  refreshKey: 0,

  setSearch: (search) =>
    set((state) => ({
      filter: { ...state.filter, search },
      page: 1,
    })),

  setFilter: (filter) =>
    set({
      filter,
      page: 1,
    }),

  setPathFilter: (path) =>
    set((state) => ({
      filter: { ...state.filter, pathFilter: path },
      page: 1,
    })),

  setActiveScope: (scope) =>
    set((state) => {
      const normalizedScope = scope && scope.length > 0 ? [...scope] : null;
      const currentScope = state.activeScope && state.activeScope.length > 0 ? state.activeScope : null;

      const isSameScope =
        JSON.stringify(currentScope ?? []) === JSON.stringify(normalizedScope ?? []);

      if (isSameScope) {
        return state;
      }

      return {
        activeScope: normalizedScope,
        page: 1,
        selectedCallId: null,
      };
    }),

  toggleMethod: (method) =>
    set((state) => {
      const next = new Set(state.filter.methods);
      if (next.has(method)) {
        next.delete(method);
      } else {
        next.add(method);
      }

      return {
        filter: { ...state.filter, methods: next },
        page: 1,
      };
    }),

  toggleStatus: (status) =>
    set((state) => {
      const next = new Set(state.filter.statusCodes);
      if (next.has(status)) {
        next.delete(status);
      } else {
        next.add(status);
      }

      return {
        filter: { ...state.filter, statusCodes: next },
        page: 1,
      };
    }),

  clearFilters: () =>
    set({
      filter: initialFilterState(),
      page: 1,
      selectedCallId: null,
    }),

  setSortOrder: (order) =>
    set({
      sortOrder: order,
      page: 1,
    }),

  setPage: (page) => set({ page }),

  resetPage: () => set({ page: 1 }),

  setSelectedCallId: (id) => set({ selectedCallId: id }),

  setStreamManuallyPaused: (paused) => set({ isStreamManuallyPaused: paused }),

  triggerRefresh: () =>
    set((state) => ({
      refreshKey: state.refreshKey + 1,
    })),
}));
