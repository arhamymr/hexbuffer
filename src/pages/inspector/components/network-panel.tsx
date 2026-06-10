'use client';

import { useMemo } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useInspectorStore } from '@/stores/inspector';

const METHOD_COLORS: Record<string, string> = {
  GET: 'text-green-600 dark:text-green-400',
  POST: 'text-blue-600 dark:text-blue-400',
  PUT: 'text-amber-600 dark:text-amber-400',
  DELETE: 'text-red-600 dark:text-red-400',
  PATCH: 'text-violet-600 dark:text-violet-400',
  HEAD: 'text-sky-600 dark:text-sky-400',
  OPTIONS: 'text-teal-600 dark:text-teal-400',
};

const TYPE_COLORS: Record<string, string> = {
  XHR: 'text-blue-600',
  Fetch: 'text-blue-600',
  Document: 'text-amber-500',
  Script: 'text-green-500',
  Stylesheet: 'text-violet-500',
  Image: 'text-pink-500',
  Font: 'text-orange-500',
  Media: 'text-teal-500',
  Other: 'text-muted-foreground',
};

function truncateUrl(url: string, max = 50): string {
  if (!url) return '\u2014';
  if (url.length <= max) return url;
  return '...' + url.slice(-(max - 3));
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '\u2014';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function NetworkPanel() {
  const entries = useInspectorStore((state) => state.networkEntries);
  const selectedId = useInspectorStore((state) => state.selectedNetworkId);
  const setSelectedId = useInspectorStore((state) => state.setSelectedNetworkId);
  const clearEntries = useInspectorStore((state) => state.clearNetworkEntries);
  const pages = useInspectorStore((state) => state.pages);
  const selectedPageId = useInspectorStore((state) => state.selectedPageId);

  const selectedPage = useMemo(
    () => (selectedPageId ? pages.find((p) => p.id === selectedPageId) ?? null : null),
    [pages, selectedPageId]
  );

  const displayed = useMemo(() => {
    let result = [...entries].reverse();
    if (selectedPage?.url) {
      result = result.filter((e) => e.url.startsWith(selectedPage.url));
    }
    return result;
  }, [entries, selectedPage]);

  const selected = useMemo(
    () => entries.find((e) => e.id === selectedId) ?? null,
    [entries, selectedId]
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center gap-2 border-b bg-muted px-3 py-2">
        <span className="text-xs font-medium text-muted-foreground">
          {entries.length} request{entries.length !== 1 ? 's' : ''}
        </span>
        <Button
          variant="outline"
          size="xs"
          className="h-7 ml-auto"
          onClick={clearEntries}
          aria-label="Clear network"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </header>

      <div className="flex-1 overflow-auto">
        <table className="w-full font-mono text-xs">
          <thead className="sticky top-0 z-10 border-b bg-muted">
            <tr>
              <th className="text-left font-medium text-muted-foreground px-3 py-1.5 w-[70px]">
                Method
              </th>
              <th className="text-left font-medium text-muted-foreground px-3 py-1.5">
                URL
              </th>
              <th className="text-left font-medium text-muted-foreground px-3 py-1.5 w-[70px]">
                Type
              </th>
              <th className="text-left font-medium text-muted-foreground px-3 py-1.5 w-[80px]">
                Size
              </th>
            </tr>
          </thead>
          <tbody>
            {displayed.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">
                  No network requests captured yet. Browse a page to see requests.
                </td>
              </tr>
            ) : (
              displayed.map((entry) => (
                <tr
                  key={entry.id}
                  className={`border-b cursor-pointer hover:bg-muted/50 ${
                    selectedId === entry.id ? 'bg-muted' : ''
                  }`}
                  onClick={() => setSelectedId(entry.id)}
                >
                  <td className={`px-3 py-1 font-semibold ${METHOD_COLORS[entry.method] ?? ''}`}>
                    {entry.method}
                  </td>
                  <td
                    className="px-3 py-1 text-muted-foreground truncate max-w-[300px]"
                    title={entry.url}
                  >
                    {truncateUrl(entry.url)}
                  </td>
                  <td className={`px-3 py-1 text-[11px] ${TYPE_COLORS[entry.resourceType] ?? TYPE_COLORS.Other}`}>
                    {entry.resourceType}
                  </td>
                  <td className="px-3 py-1 text-muted-foreground">
                    {formatSize(entry.size)}
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
