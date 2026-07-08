import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Cookie as CookieIcon,
  HardDrive,
  Trash,
  ArrowsClockwise,
  MagnifyingGlass,
  Plus,
} from '@phosphor-icons/react';
import type { Cookie, StorageItem } from '../hooks/use-inspect-external';
import { JsonViewer } from './json-viewer';

interface StorageAuditorProps {
  cookies: Cookie[];
  localStorageItems: StorageItem[];
  sessionStorageItems: StorageItem[];
  refreshStorage: () => Promise<void>;
  deleteCookie: (name: string, domain: string) => Promise<void>;
  deleteStorageItem: (key: string, isLocalStorage: boolean) => Promise<void>;
  clearStorage: () => Promise<void>;
  targetUrl: string;
}

type StorageSection = 'cookies' | 'local' | 'session';

export function StorageAuditor({
  cookies,
  localStorageItems,
  sessionStorageItems,
  refreshStorage,
  deleteCookie,
  deleteStorageItem,
  clearStorage,
  targetUrl,
}: StorageAuditorProps) {
  const [selectedSection, setSelectedSection] = useState<StorageSection>('cookies');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<{ key: string; value: string } | null>(null);

  // Parse origin for display
  const origin = useMemo(() => {
    try {
      return new URL(targetUrl).origin;
    } catch {
      return targetUrl;
    }
  }, [targetUrl]);

  // Handle section selection
  const handleSelectSection = (section: StorageSection) => {
    setSelectedSection(section);
    setSearchQuery('');
    setSelectedItem(null);
  };

  // Filter cookies
  const filteredCookies = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return cookies;
    return cookies.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.value.toLowerCase().includes(q) ||
        c.domain.toLowerCase().includes(q)
    );
  }, [cookies, searchQuery]);

  // Filter Local Storage
  const filteredLocalStorage = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return localStorageItems;
    return localStorageItems.filter(
      (item) => item.key.toLowerCase().includes(q) || item.value.toLowerCase().includes(q)
    );
  }, [localStorageItems, searchQuery]);

  // Filter Session Storage
  const filteredSessionStorage = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return sessionStorageItems;
    return sessionStorageItems.filter(
      (item) => item.key.toLowerCase().includes(q) || item.value.toLowerCase().includes(q)
    );
  }, [sessionStorageItems, searchQuery]);

  return (
    <div className="flex h-full min-h-0 bg-background">
      {/* Sidebar Tree View */}
      <div className="w-60 border-r flex flex-col shrink-0 bg-muted/20">
        <div className="px-3 py-2.5 border-b shrink-0">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            Storage Domains
          </span>
        </div>

        <ScrollArea className="flex-1 p-2">
          <div className="space-y-1">
            <button
              onClick={() => handleSelectSection('cookies')}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium text-left transition-colors ${
                selectedSection === 'cookies'
                  ? 'bg-primary/10 text-primary border border-primary/10'
                  : 'text-foreground/80 hover:bg-muted border border-transparent'
              }`}
            >
              <span className="flex items-center gap-2">
                <CookieIcon className="size-4 shrink-0" />
                <span>Cookies</span>
              </span>
              <Badge variant="secondary" className="px-1.5 py-0 h-4 font-mono text-[9px]">
                {cookies.length}
              </Badge>
            </button>

            <button
              onClick={() => handleSelectSection('local')}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium text-left transition-colors ${
                selectedSection === 'local'
                  ? 'bg-primary/10 text-primary border border-primary/10'
                  : 'text-foreground/80 hover:bg-muted border border-transparent'
              }`}
            >
              <span className="flex items-center gap-2">
                <HardDrive className="size-4 shrink-0" />
                <span>Local Storage</span>
              </span>
              <Badge variant="secondary" className="px-1.5 py-0 h-4 font-mono text-[9px]">
                {localStorageItems.length}
              </Badge>
            </button>

            <button
              onClick={() => handleSelectSection('session')}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium text-left transition-colors ${
                selectedSection === 'session'
                  ? 'bg-primary/10 text-primary border border-primary/10'
                  : 'text-foreground/80 hover:bg-muted border border-transparent'
              }`}
            >
              <span className="flex items-center gap-2">
                <HardDrive className="size-4 shrink-0" />
                <span>Session Storage</span>
              </span>
              <Badge variant="secondary" className="px-1.5 py-0 h-4 font-mono text-[9px]">
                {sessionStorageItems.length}
              </Badge>
            </button>
          </div>
        </ScrollArea>
      </div>

      {/* Main Storage Content Workspace */}
      <div className="flex-1 flex flex-col min-h-0 bg-background">
        {/* Storage Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 border-b bg-muted/40 shrink-0">
          <div className="flex items-center gap-2">
            <div className="relative w-60">
              <MagnifyingGlass className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-8 h-8 text-xs bg-background"
                placeholder={`Search keys, values...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <Button variant="outline" size="sm" onClick={refreshStorage} className="h-8 gap-1 px-2.5">
              <ArrowsClockwise className="size-3.5" />
              Refresh
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-muted-foreground bg-muted/50 px-2 py-1 rounded border">
              Origin: {origin}
            </span>

            <Button variant="outline" size="sm" onClick={clearStorage} className="h-8 gap-1.5 border-rose-500/30 text-rose-500 hover:bg-rose-500/5 px-2.5">
              <Trash className="size-3.5" />
              Wipe Origin Storage
            </Button>
          </div>
        </div>

        {/* Content tables */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row">
          {/* Main Grid View */}
          <div className="flex-1 min-h-0 flex flex-col border-r">
            {selectedSection === 'cookies' ? (
              // Cookies List
              <div className="flex-1 min-h-0 flex flex-col">
                <div className="grid grid-cols-[180px_1fr_120px_100px_60px_60px_45px] px-3 py-1.5 border-b bg-muted/20 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider shrink-0 select-none">
                  <span>Name</span>
                  <span>Value</span>
                  <span>Domain</span>
                  <span>Path</span>
                  <span className="text-center">HTTP</span>
                  <span className="text-center">Secure</span>
                  <span></span>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-border/40 font-mono text-xs bg-background">
                  {filteredCookies.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground italic">No cookies found.</div>
                  ) : (
                    filteredCookies.map((cookie, idx) => (
                      <div
                        key={idx}
                        className="grid grid-cols-[180px_1fr_120px_100px_60px_60px_45px] px-3 py-2 items-center hover:bg-muted/10 transition-colors"
                      >
                        <span className="font-semibold text-foreground/90 truncate" title={cookie.name}>{cookie.name}</span>
                        <span className="truncate pr-4 text-muted-foreground" title={cookie.value}>{cookie.value}</span>
                        <span className="truncate text-muted-foreground" title={cookie.domain}>{cookie.domain}</span>
                        <span className="truncate text-muted-foreground" title={cookie.path}>{cookie.path}</span>
                        <span className="text-center text-[10px]">{cookie.httpOnly ? '✓' : '-'}</span>
                        <span className="text-center text-[10px]">{cookie.secure ? '✓' : '-'}</span>
                        <div className="text-right">
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => deleteCookie(cookie.name, cookie.domain)}
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-rose-500"
                          >
                            <Trash className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              // Local or Session Storage key-value list
              <div className="flex-1 min-h-0 flex flex-col">
                <div className="grid grid-cols-[200px_1fr_45px] px-3 py-1.5 border-b bg-muted/20 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider shrink-0 select-none">
                  <span>Key</span>
                  <span>Value</span>
                  <span></span>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-border/40 font-mono text-xs bg-background">
                  {(() => {
                    const items = selectedSection === 'local' ? filteredLocalStorage : filteredSessionStorage;
                    if (items.length === 0) {
                      return <div className="p-8 text-center text-muted-foreground italic">No storage entries found.</div>;
                    }
                    return items.map((item, idx) => {
                      const isSelected = selectedItem?.key === item.key;
                      return (
                        <button
                          key={idx}
                          onClick={() => setSelectedItem(item)}
                          className={`w-full grid grid-cols-[200px_1fr_45px] px-3 py-2 items-center text-left hover:bg-muted/10 transition-colors focus:outline-none ${
                            isSelected ? 'bg-primary/5 border-l-2 border-primary' : ''
                          }`}
                        >
                          <span className="font-semibold text-foreground/90 truncate" title={item.key}>{item.key}</span>
                          <span className="truncate pr-4 text-muted-foreground" title={item.value}>{item.value}</span>
                          <div className="text-right" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="xs"
                              onClick={() => deleteStorageItem(item.key, selectedSection === 'local')}
                              className="h-6 w-6 p-0 text-muted-foreground hover:text-rose-500"
                            >
                              <Trash className="size-3.5" />
                            </Button>
                          </div>
                        </button>
                      );
                    });
                  })()}
                </div>
              </div>
            )}
          </div>

          {/* Right Selected Storage Item Viewer Panel */}
          {selectedSection !== 'cookies' && (
            <div className="w-full md:w-96 flex flex-col min-h-0 bg-card">
              {selectedItem ? (
                <div className="flex-1 flex flex-col min-h-0 border-l border-t md:border-t-0">
                  <div className="px-3 py-2 border-b bg-muted/30 shrink-0 flex items-center justify-between">
                    <span className="text-xs font-semibold truncate text-foreground pr-2" title={selectedItem.key}>
                      Inspector: {selectedItem.key}
                    </span>
                    <Button variant="ghost" size="xs" className="h-6 w-6 p-0" onClick={() => setSelectedItem(null)}>
                      &times;
                    </Button>
                  </div>

                  <div className="flex-1 min-h-0 flex flex-col bg-background">
                    {(() => {
                      // Try parsing JSON format for storage values
                      try {
                        const parsed = JSON.parse(selectedItem.value);
                        return <JsonViewer data={parsed} />;
                      } catch {
                        return (
                          <ScrollArea className="h-full font-mono text-xs">
                            <pre className="p-3.5 text-muted-foreground whitespace-pre-wrap break-all leading-relaxed">
                              {selectedItem.value}
                            </pre>
                          </ScrollArea>
                        );
                      }
                    })()}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-muted-foreground text-center">
                  <HardDrive className="size-8 opacity-30 mb-2" />
                  <p className="text-xs font-semibold">No storage item selected</p>
                  <p className="text-[10px] opacity-75 mt-0.5">Click a key-value row to inspect parsed or nested data structure</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
