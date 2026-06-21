import React from 'react';
import { useApiCollectionStore } from '@/stores/api-collection';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, Trash2, Clock, ShieldCheck } from 'lucide-react';
import type { ChronicleLogRecord, KeyValuePair } from '../types';

export function ChronicleSidebar() {
  const store = useApiCollectionStore();

  const handleClearHistory = async () => {
    if (confirm('Clear all request history?')) {
      await store.clearChronicle();
    }
  };

  const handleLoadHistory = async (log: ChronicleLogRecord) => {
    if (!store.activeStashId) {
      alert('Please select or create a collection tab first.');
      return;
    }
    
    let parsedHeaders: KeyValuePair[] = [];
    try {
      if (log.requestHeaders) {
        const headersObj = JSON.parse(log.requestHeaders);
        parsedHeaders = Object.entries(headersObj).map(([key, value]) => ({
          key,
          value: value as string,
          enabled: true,
        }));
      }
    } catch (e) {
      console.error('Failed to parse history headers:', e);
    }

    let path = log.url;
    try {
      const u = new URL(log.url);
      path = u.pathname;
    } catch {}

    const name = `${log.method} - ${path}`;
    
    // 1. Create the endpoint in the current active stash
    await store.createEndpoint(store.activeStashId, name);
    
    // 2. Set the loaded values as the active editor request
    store.updateActiveRequest(() => ({
      method: log.method,
      url: log.url,
      headers: parsedHeaders,
      body: log.requestBody || '',
      bodyType: log.requestBody ? 'raw' : 'none',
      response: {
        status: log.responseStatus || 0,
        statusText: log.responseStatusText || '',
        headers: log.responseHeaders ? JSON.parse(log.responseHeaders) : {},
        body: log.responseBody || '',
        timeMs: log.durationMs || 0,
        finalUrl: log.url,
      },
      testResults: [],
      error: null,
      isLoading: false,
    }));

    // 3. Save the endpoint configuration in SQLite
    await store.saveActiveEndpoint();
  };

  return (
    <div className="flex flex-col h-full min-h-0 space-y-4">
      <div className="flex items-center justify-between border-b pb-2 shrink-0">
        <div className="flex items-center space-x-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <History className="h-4 w-4" />
          <span>Execution History</span>
        </div>
        {store.chronicleLogs.length > 0 && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={handleClearHistory}
            title="Clear History"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1 -mx-2 px-2">
        <div className="space-y-2 pr-2">
          {store.chronicleLogs.map((log) => {
            let path = log.url;
            try {
              const u = new URL(log.url);
              path = u.pathname + u.search;
            } catch {}

            return (
              <div
                key={log.id}
                className="p-2 border rounded-md hover:bg-muted/50 cursor-pointer transition-colors text-xs flex flex-col space-y-1.5"
                onClick={() => void handleLoadHistory(log)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 min-w-0">
                    <span
                      className={`font-semibold shrink-0 uppercase text-[9px] px-1 rounded ${
                        log.method === 'GET'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : log.method === 'POST'
                          ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      {log.method}
                    </span>
                    <span className="truncate font-mono text-[10px] text-muted-foreground">
                      {path}
                    </span>
                  </div>
                  {log.responseStatus && (
                    <span
                      className={`font-mono text-[10px] px-1 rounded shrink-0 ${
                        log.responseStatus >= 200 && log.responseStatus < 300
                          ? 'bg-emerald-500/10 text-emerald-600'
                          : 'bg-destructive/10 text-destructive'
                      }`}
                    >
                      {log.responseStatus}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <Clock className="h-3 w-3" />
                    <span>{log.durationMs ? `${log.durationMs}ms` : '-'}</span>
                  </div>
                  <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            );
          })}

          {store.chronicleLogs.length === 0 && (
            <div className="text-center py-12 flex flex-col items-center justify-center space-y-2 border border-dashed rounded-lg">
              <ShieldCheck className="h-6 w-6 text-muted-foreground/50" />
              <span className="text-xs font-medium text-muted-foreground">
                Chronicle is empty
              </span>
              <span className="text-[10px] text-muted-foreground/60 max-w-[150px]">
                Trigger endpoints in The Forge to capture executions.
              </span>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
