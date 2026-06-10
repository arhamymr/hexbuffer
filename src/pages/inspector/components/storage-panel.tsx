'use client';

import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useInspectorStore } from '@/stores/inspector';
import { DEFAULT_DEBUGGING_PORT } from '../constants';
import { getInspectorCookies, getInspectorStorage } from '../api';
import { toast } from 'sonner';

export function StoragePanel() {
  const cookies = useInspectorStore((state) => state.cookies);
  const storage = useInspectorStore((state) => state.storage);
  const setCookies = useInspectorStore((state) => state.setCookies);
  const setStorage = useInspectorStore((state) => state.setStorage);
  const isConnected = useInspectorStore((state) => state.isConnected);
  const selectedPageId = useInspectorStore((state) => state.selectedPageId);

  const [loading, setLoading] = useState(false);
  const [subTab, setSubTab] = useState<'cookies' | 'storage'>('cookies');

  const refresh = useCallback(async () => {
    if (!isConnected) {
      toast.error('Not connected to browser');
      return;
    }
    setLoading(true);
    try {
      const [c, s] = await Promise.all([
        getInspectorCookies(DEFAULT_DEBUGGING_PORT, selectedPageId),
        getInspectorStorage(DEFAULT_DEBUGGING_PORT, selectedPageId),
      ]);
      setCookies(c);
      setStorage(s);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load storage';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [isConnected, selectedPageId, setCookies, setStorage]);

  useEffect(() => {
    if (isConnected) refresh();
  }, [isConnected, selectedPageId]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center gap-1 border-b bg-muted px-2 py-1.5">
        <Button
          variant={subTab === 'cookies' ? 'default' : 'ghost'}
          size="xs"
          className="h-6 text-xs"
          onClick={() => setSubTab('cookies')}
        >
          Cookies ({cookies.length})
        </Button>
        <Button
          variant={subTab === 'storage' ? 'default' : 'ghost'}
          size="xs"
          className="h-6 text-xs"
          onClick={() => setSubTab('storage')}
        >
          Storage ({storage.length})
        </Button>
        <Button
          variant="outline"
          size="xs"
          className="h-6 ml-auto"
          onClick={refresh}
          disabled={loading}
        >
          <RefreshCw className={`size-3 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </header>

      <div className="flex-1 overflow-auto">
        {subTab === 'cookies' ? (
          <table className="w-full font-mono text-xs">
            <thead className="sticky top-0 z-10 border-b bg-muted">
              <tr>
                <th className="text-left font-medium text-muted-foreground px-3 py-1.5">Name</th>
                <th className="text-left font-medium text-muted-foreground px-3 py-1.5">Value</th>
                <th className="text-left font-medium text-muted-foreground px-3 py-1.5">Domain</th>
                <th className="text-left font-medium text-muted-foreground px-3 py-1.5">Path</th>
                <th className="text-left font-medium text-muted-foreground px-3 py-1.5 w-[60px]">Secure</th>
                <th className="text-left font-medium text-muted-foreground px-3 py-1.5 w-[60px]">HttpOnly</th>
              </tr>
            </thead>
            <tbody>
              {cookies.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                    No cookies found on the active page.
                  </td>
                </tr>
              ) : (
                cookies.map((c, i) => (
                  <tr key={`${c.name}-${c.domain}-${i}`} className="border-b hover:bg-muted/50">
                    <td className="px-3 py-1 font-medium">{c.name}</td>
                    <td className="px-3 py-1 text-muted-foreground truncate max-w-[150px]">
                      {c.value}
                    </td>
                    <td className="px-3 py-1 text-muted-foreground">{c.domain}</td>
                    <td className="px-3 py-1 text-muted-foreground">{c.path}</td>
                    <td className="px-3 py-1 text-center">{c.secure ? '\u2713' : '\u2014'}</td>
                    <td className="px-3 py-1 text-center">{c.httpOnly ? '\u2713' : '\u2014'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        ) : (
          <table className="w-full font-mono text-xs">
            <thead className="sticky top-0 z-10 border-b bg-muted">
              <tr>
                <th className="text-left font-medium text-muted-foreground px-3 py-1.5 w-[40%]">Key</th>
                <th className="text-left font-medium text-muted-foreground px-3 py-1.5">Value</th>
              </tr>
            </thead>
            <tbody>
              {storage.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-3 py-8 text-center text-muted-foreground">
                    No localStorage/sessionStorage entries found.
                  </td>
                </tr>
              ) : (
                storage.map((s, i) => (
                  <tr key={`${s.key}-${i}`} className="border-b hover:bg-muted/50">
                    <td className="px-3 py-1 font-medium">{s.key}</td>
                    <td className="px-3 py-1 text-muted-foreground truncate max-w-[300px]">
                      {s.value}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
