'use client';

import { Badge } from '@/components/ui/badge';
import type { AttackResult } from '../types';
import { formatPayloadValues } from '../lib/utils';

interface BruteForceResultsPaneProps {
  results: AttackResult[];
  isRunning: boolean;
  selectedResult: AttackResult | null;
  onSelectResult: (result: AttackResult) => void;
}

export function BruteForceResultsPane({
  results,
  isRunning,
  selectedResult,
  onSelectResult,
}: BruteForceResultsPaneProps) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="bg-muted/50 px-3 py-2 border-b">
        <span className="text-sm font-medium">Results ({results.length})</span>
      </div>
      <div className="overflow-auto h-[calc(100%-40px)]">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 sticky top-0">
            <tr>
              <th className="px-3 py-2 text-left font-medium w-12">#</th>
              <th className="px-3 py-2 text-left font-medium">Payload</th>
              <th className="px-3 py-2 text-left font-medium w-16">Status</th>
              <th className="px-3 py-2 text-left font-medium w-20">Length</th>
              <th className="px-3 py-2 text-left font-medium w-16">Grep</th>
              <th className="px-3 py-2 text-left font-medium w-20">Time</th>
            </tr>
          </thead>
          <tbody>
            {results.map((result, index) => (
              <tr
                key={result.id}
                className={`border-b cursor-pointer hover:bg-muted/50 ${
                  selectedResult?.id === result.id ? 'bg-muted' : ''
                } ${result.error ? 'text-destructive' : ''}`}
                onClick={() => onSelectResult(result)}
              >
                <td className="px-3 py-2">{index + 1}</td>
                <td className="px-3 py-2 font-mono text-xs truncate max-w-[200px]">
                  {formatPayloadValues(result.payload_values)}
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
            {results.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
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
