export interface FilterState {
  search: string;
  methods: Set<string>;
  statusCodes: Set<string>;
}

export const DEFAULT_FILTER_STATE: FilterState = {
  search: '',
  methods: new Set(),
  statusCodes: new Set(),
};