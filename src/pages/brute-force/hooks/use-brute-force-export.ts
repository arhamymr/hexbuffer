import * as React from 'react';
import { useBruteForceStore } from '@/stores/bruto-force';
import { downloadResults } from '../lib/utils';
import type { AttackResult } from '../types';

export function useBruteForceExport() {
  const handleExportResults = React.useCallback((format: 'csv' | 'json') => {
    const state = useBruteForceStore.getState();
    const tab = state.tabs.find((t) => t.id === state.activeTabId);
    const results = tab?.results ?? [];

    if (format === 'json') {
      downloadResults(
        `brute-force-results-${Date.now()}.json`,
        JSON.stringify(results, null, 2),
        'application/json'
      );
      return;
    }

    const headers = ['#', 'Payload Values', 'Status', 'Length', 'Time (ms)', 'Grep Match', 'Error'];
    const rows = results.map((result: AttackResult, index) => [
      index + 1,
      JSON.stringify(result.payload_values),
      result.status || '',
      result.response_length || '',
      result.response_time_ms || '',
      result.grep_match ? 'Yes' : 'No',
      result.error || '',
    ]);
    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');

    downloadResults(`brute-force-results-${Date.now()}.csv`, csv, 'text/csv');
  }, []);

  return { handleExportResults };
}
