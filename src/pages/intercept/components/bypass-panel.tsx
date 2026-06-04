'use client';

import * as React from 'react';
import { ChevronDown, ChevronRight, Plus, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useInterceptStore } from '../state/intercept-store';

export function InterceptBypassPanel() {
  const tabs = useInterceptStore((state) => state.tabs);
  const activeTabId = useInterceptStore((state) => state.activeTabId);
  const addCaptureHost = useInterceptStore((state) => state.addCaptureHost);
  const removeCaptureHost = useInterceptStore((state) => state.removeCaptureHost);
  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0];
  const patterns = activeTab?.captureHosts ?? [];

  const [value, setValue] = React.useState('');
  const [open, setOpen] = React.useState(true);

  const handleAdd = React.useCallback(() => {
    const trimmed = value.trim();
    if (trimmed) {
      addCaptureHost(trimmed);
      setValue('');
    }
  }, [value, addCaptureHost]);

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleAdd();
      }
    },
    [handleAdd]
  );

  return (
    <div className="border-b">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-1 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/50"
      >
        {open ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
        Capture Hosts
        <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
          {patterns.length}
        </Badge>
        {!open && (
          <span className="truncate text-[10px] text-muted-foreground/60">
            {patterns.length > 0 ? patterns.slice(0, 3).join(', ') : 'empty tab captures nothing'}
            {patterns.length > 3 ? '...' : ''}
          </span>
        )}
      </button>

      {open && (
        <div className="px-3 pb-2">
          {patterns.length > 0 ? (
            <div className="mb-2 flex flex-wrap gap-1">
              {patterns.map((pattern) => (
                <Badge
                  key={pattern}
                  variant="secondary"
                  className="flex items-center gap-1 pr-1 text-xs"
                >
                  <span className="max-w-[180px] truncate">{pattern}</span>
                  <button
                    type="button"
                    onClick={() => removeCaptureHost(pattern)}
                    className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-muted-foreground/20"
                    aria-label={`Remove ${pattern}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          ) : (
            <div className="mb-2 rounded border border-dashed px-2 py-1.5 text-xs text-muted-foreground">
              This tab captures nothing until a host is added.
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. api.example.com or *.example.com"
              className="h-7 flex-1 text-xs"
            />
            <Button size="xs" variant="outline" className="h-7 shrink-0" onClick={handleAdd} disabled={!value.trim()}>
              <Plus className="h-3 w-3" />
              Add
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
