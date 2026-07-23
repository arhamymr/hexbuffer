import type { ProxyFilter } from '../api';

import type { HistoryFilterState } from '@/stores/history';

export interface HistoryQuery {
  page: number;
  perPage: number;
  sortOrder: 'asc' | 'desc';
  filter: ProxyFilter;
}

export function buildHistoryQuery(input: {
  filter: HistoryFilterState;
  activeScope: string[] | null;
  sortOrder: 'asc' | 'desc';
  page: number;
  perPage: number;
}): HistoryQuery {
  const methods = normalizeStringList(Array.from(input.filter.methods));
  const scope = normalizeStringList(input.activeScope ?? []);

  let statusCodes: number[] | null = null;

  if (input.filter.statusCodes.size > 0) {
    statusCodes = [];

    for (const label of input.filter.statusCodes) {
      switch (label) {
        case '2xx':
          statusCodes.push(200, 201, 202, 203, 204, 205, 206, 207, 208, 226);
          break;
        case '3xx':
          statusCodes.push(300, 301, 302, 303, 304, 305, 306, 307, 308);
          break;
        case '4xx':
          statusCodes.push(400, 401, 402, 403, 404, 405, 406, 407, 408, 409, 410, 411, 412, 413, 414, 415, 416, 417, 418, 421, 422, 423, 424, 425, 426, 428, 429, 431, 451);
          break;
        case '5xx':
          statusCodes.push(500, 501, 502, 503, 504, 505, 506, 507, 508, 510, 511);
          break;
        default: {
          const num = parseInt(label, 10);
          if (!Number.isNaN(num)) {
            statusCodes.push(num);
          }
        }
      }
    }

    if (statusCodes.length === 0) {
      statusCodes = null;
    }
  }

  return {
    page: input.page,
    perPage: input.perPage,
    sortOrder: input.sortOrder,
    filter: {
      search: normalizeString(input.filter.search),
      path: normalizeString(input.filter.pathFilter),
      methods,
      status_codes: statusCodes,
      scope,
    },
  };
}

export function hasActiveHistoryFilters(input: {
  filter: HistoryFilterState;
  activeScope: string[] | null;
}): boolean {
  return Boolean(
    input.filter.search ||
      input.filter.pathFilter ||
      input.filter.methods.size > 0 ||
      input.filter.statusCodes.size > 0 ||
      (input.activeScope && input.activeScope.length > 0)
  );
}

function normalizeString(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeStringList(values: string[]): string[] | null {
  const normalized = values
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  return normalized.length > 0 ? normalized : null;
}
