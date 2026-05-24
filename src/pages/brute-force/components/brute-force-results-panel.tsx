'use client';

import { Badge } from '@/components/ui/badge';
import { useBruteForceStore } from '@/stores/bruto-force';
import type { AttackResult } from '../types';
import { formatPayloadValues, getResultUrl } from '../lib/utils';
import { useBruteForceFilters } from '../hooks/use-brute-force-filters';

export function BruteForceResultsPane() {
  const { filteredResults } = useBruteForceFilters();
  const isRunning = useBruteForceStore((s) => {
    const tab = s.tabs.find((t) => t.id === s.activeTabId);
    return tab?.isRunning ?? false;
  });
  const selectedResult = useBruteForceStore((s) => {
    const tab = s.tabs.find((t) => t.id === s.activeTabId);
    return tab?.selectedResult ?? null;
  });
  const setSelectedResult = useBruteForceStore((s) => s.setSelectedResult);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border bg-background">
      <div className="bg-muted/50 px-3 py-2 border-b">
        <span className="text-sm font-medium">Results ({filteredResults.length})</span>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 sticky top-0">
            <tr>
              <th className="px-3 py-2 text-left font-medium w-12">#</th>
              <th className="px-3 py-2 text-left font-medium">Payload</th>
              <th className="px-3 py-2 text-left font-medium">URL</th>
              <th className="px-3 py-2 text-left font-medium w-16">Status</th>
              <th className="px-3 py-2 text-left font-medium w-20">Length</th>
              <th className="px-3 py-2 text-left font-medium w-16">Grep</th>
              <th className="px-3 py-2 text-left font-medium w-20">Time</th>
            </tr>
          </thead>
          <tbody>
            {filteredResults.map((result, index) => (
              <tr
                key={result.id}
                className={`border-b cursor-pointer hover:bg-muted/50 ${
                  selectedResult?.id === result.id ? 'bg-muted' : ''
                } ${result.error ? 'text-destructive' : ''}`}
                onClick={() => setSelectedResult(result)}
              >
                <td className="px-3 py-2">{index + 1}</td>
                <td className="px-3 py-2 font-mono text-xs max-w-[180px]">
                  <div className="truncate" title={formatPayloadValues(result.payload_values)}>
                    {formatPayloadValues(result.payload_values)}
                  </div>
                </td>
                <td className="px-3 py-2 font-mono text-xs max-w-[260px] text-muted-foreground">
                  <div className="truncate" title={getResultUrl(result)}>
                    {getResultUrl(result) || '-'}
                  </div>
                </td>
                <td className="px-3 py-2">
                  {result.status && (
                    <Badge
                      variant={
                        result.status >= 200 && result.status < 300
                          ? 'default'
                          : result.status >= 400
                          ? 'destructive'
                          : 'secondary'
                      }
                      className="text-xs"
                    >
                      {result.status}
                    </Badge>
                  )}
                  {result.error && <span className="text-xs">Error</span>}
                </td>
                <td className="px-3 py-2 text-muted-foreground">{result.response_length ?? '-'}</td>
                <td className="px-3 py-2">
                  {result.grep_match && (
                    <Badge variant="default" className="text-xs">
                      Match
                    </Badge>
                  )}
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {result.response_time_ms ? `${result.response_time_ms}ms` : '-'}
                </td>
              </tr>
            ))}
            {filteredResults.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                  {isRunning ? 'Running attack...' : 'No results yet'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
