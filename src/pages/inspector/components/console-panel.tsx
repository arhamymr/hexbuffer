'use client';

import { useMemo } from 'react';
import { Trash2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ButtonGroup } from '@/components/ui/button-group';
import { useInspectorStore } from '@/stores/inspector';
import { CONSOLE_FILTERS, CONSOLE_LEVEL_COLORS } from '../constants';
import type { InspectorConsoleLog } from '../types';

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('en-US', { hour12: false });
}

function truncateUrl(url: string, maxLen = 40): string {
  if (!url) return '\u2014';
  if (url.length <= maxLen) return url;
  return '...' + url.slice(-(maxLen - 3));
}

function truncateMessage(text: string, maxLen = 120): string {
  const singleLine = text.replace(/\s+/g, ' ').trim();
  if (singleLine.length <= maxLen) return singleLine;
  return singleLine.slice(0, maxLen) + '\u2026';
}

interface ConsolePanelProps {
  selectedLogId: string | null;
  onSelectLog: (log: InspectorConsoleLog) => void;
}

export function ConsolePanel({ selectedLogId, onSelectLog }: ConsolePanelProps) {
  const logs = useInspectorStore((state) => state.logs);
  const filter = useInspectorStore((state) => state.filter);
  const setFilter = useInspectorStore((state) => state.setFilter);
  const search = useInspectorStore((state) => state.search);
  const setSearch = useInspectorStore((state) => state.setSearch);
  const clearLogs = useInspectorStore((state) => state.clearLogs);

  const filteredLogs = useMemo(() => {
    let result = filter === 'all' ? logs : logs.filter((l) => l.level === filter);

    if (search.trim()) {
      const query = search.trim().toLowerCase();
      result = result.filter(
        (l) =>
          l.text.toLowerCase().includes(query) ||
          l.url.toLowerCase().includes(query) ||
          l.level.toLowerCase().includes(query)
      );
    }

    return result;
  }, [logs, filter, search]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center gap-2 border-b bg-muted px-3 py-2">
        <div className="relative flex-1 max-w-[260px]">
          <Search className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8 h-7 text-xs bg-background"
            placeholder="Filter console..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <ButtonGroup>
          {CONSOLE_FILTERS.map((f) => (
            <Button
              key={f.value}
              variant={filter === f.value ? 'default' : 'outline'}
              size="xs"
              className="h-7 text-xs"
              onClick={() => setFilter(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </ButtonGroup>

        <Button
          variant="outline"
          size="xs"
          className="h-7 ml-auto"
          onClick={clearLogs}
          aria-label="Clear console"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </header>

      <div className="flex-1 overflow-auto">
        <table className="w-full font-mono text-xs">
          <thead className="sticky top-0 z-10 border-b bg-muted">
            <tr>
              <th className="text-left font-medium text-muted-foreground px-3 py-1.5 w-[80px]">
                Time
              </th>
              <th className="text-left font-medium text-muted-foreground px-3 py-1.5 w-[90px]">
                Level
              </th>
              <th className="text-left font-medium text-muted-foreground px-3 py-1.5 w-[200px]">
                URL
              </th>
              <th className="text-left font-medium text-muted-foreground px-3 py-1.5">
                Message
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">
                  {logs.length === 0
                    ? 'No console output yet. Open the Inspector browser and interact with a page.'
                    : 'No matching console entries.'}
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => (
                <tr
                  key={log.id}
                  className={`border-b cursor-pointer hover:bg-muted/50 ${selectedLogId === log.id ? 'bg-muted' : ''}`}
                  onClick={() => onSelectLog(log)}
                >
                  <td className="px-3 py-1 text-muted-foreground whitespace-nowrap">
                    {formatTime(log.timestamp)}
                  </td>
                  <td className="px-3 py-1">
                    <span className={CONSOLE_LEVEL_COLORS[log.level] ?? 'text-foreground'}>
                      {log.level === 'pageerror' ? 'error' : log.level}
                    </span>
                  </td>
                  <td
                    className="px-3 py-1 text-muted-foreground truncate max-w-[200px]"
                    title={log.url || undefined}
                  >
                    {truncateUrl(log.url)}
                  </td>
                  <td
                    className="px-3 py-1 text-muted-foreground truncate max-w-[320px]"
                    title={log.text}
                  >
                    {truncateMessage(log.text)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
