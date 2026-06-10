'use client';

import { useMemo, useState } from 'react';
import { Globe, LayoutGrid, Search, XCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useInspectorStore } from '@/stores/inspector';

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + '\u2026';
}

export function PagesSidebar() {
  const pages = useInspectorStore((state) => state.pages);
  const selectedPageId = useInspectorStore((state) => state.selectedPageId);
  const setSelectedPageId = useInspectorStore((state) => state.setSelectedPageId);
  const [pageSearch, setPageSearch] = useState('');

  const trimmedSearch = pageSearch.trim();
  const isFiltering = trimmedSearch.length > 0;

  const filteredPages = useMemo(() => {
    if (!isFiltering) return pages;
    const q = trimmedSearch.toLowerCase();
    return pages.filter(
      (p) =>
        (p.title || '').toLowerCase().includes(q) ||
        (p.url || '').toLowerCase().includes(q)
    );
  }, [pages, trimmedSearch, isFiltering]);

  if (pages.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground px-2">
        <p className="text-[10px] text-center leading-relaxed">
          No open pages detected.
          <br />
          Start listening to see tabs.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Search bar */}
      <div className="px-2 py-1.5">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-7 pr-7 h-7 text-xs bg-background"
            placeholder="Filter pages..."
            value={pageSearch}
            onChange={(e) => setPageSearch(e.target.value)}
          />
          {isFiltering && (
            <button
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setPageSearch('')}
              aria-label="Clear filter"
            >
              <XCircle className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {/* "All" option */}
        <button
          className={`flex w-full items-center gap-1.5 px-2 py-1.5 text-xs border-b border-border text-left transition-colors ${
            selectedPageId === null
              ? 'bg-primary/10 text-primary font-semibold'
              : 'hover:bg-muted/50'
          }`}
          onClick={() => setSelectedPageId(null)}
        >
          <LayoutGrid className="size-3 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1 truncate font-medium">
            All Pages
          </div>
        </button>

        {/* Filtered page list */}
        {filteredPages.map((page) => {
          const isActive = selectedPageId === page.id;
          return (
            <button
              key={page.id}
              className={`flex w-full items-center gap-1.5 px-2 py-1.5 text-xs border-b border-border text-left transition-colors ${
                isActive
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'hover:bg-muted/50'
              }`}
              onClick={() => setSelectedPageId(isActive ? null : page.id)}
            >
              <Globe className={`size-3 shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">
                  {truncate(page.title || page.url || 'Untitled', 50)}
                </div>
                {page.url && page.url !== page.title && (
                  <div className="truncate text-[10px] text-muted-foreground">
                    {truncate(page.url, 60)}
                  </div>
                )}
              </div>
            </button>
          );
        })}

        {/* Empty filter state */}
        {isFiltering && filteredPages.length === 0 && (
          <div className="flex items-center justify-center py-8 text-muted-foreground px-2">
            <p className="text-[10px] text-center leading-relaxed">
              No pages match <span className="font-mono font-medium text-foreground">"{trimmedSearch}"</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
