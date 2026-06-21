'use client';

import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { allNavItems } from '@/components/layout/constants';
import { useNavStore } from '@/stores/nav';
import { useAppStore } from '@/stores/app';
import { Button } from '@/components/ui/button';
import {
  ShieldAlert,
  Server,
  Clock,
  StickyNote,
  Loader2
} from 'lucide-react';

import binaryImg from '@/assets/feature/binary.png';
import documentsImg from '@/assets/feature/documents.png';
import toolsImg from '@/assets/feature/tools.png';
import terminalImg from '@/assets/feature/terminal.png';

const FEATURE_IMAGES: Record<string, string> = {
  'Code': binaryImg,
  'Documents': documentsImg,
  'Tools': toolsImg,
  'Debugger': terminalImg
};

const FEATURE_DESCRIPTIONS: Record<string, string> = {
  'Live Traffic': 'Capture and inspect real-time HTTP/HTTPS and WebSocket network traffic.',
  'Workflow': 'Build and execute automated visual workflows for target reconnaissance.',
  'Browser': 'Control an automated browser session to crawl websites and capture elements.',
  'Intercept': 'Pause incoming or outgoing requests to modify headers, parameters, and bodies.',
  'Code': 'Run and test custom code scripts in a sandbox environment.',
  'Invoker': 'Generate client-side requests, perform attacks, and trigger endpoints.',
  'Repeater': 'Modify HTTP requests, reissue them, and analyze responses side-by-side.',
  'Threats': 'View active threat intelligence, rule matches, and signature alerts.',
  'Documents': 'Create markdown documents, API definitions, and manage target scopes.',
  'Tools': 'Access encoders, decoders, hashes, and other payload helper utilities.',
  'Code Audit': 'Scan source code folders for potential vulnerabilities and bugs.',
  'Debugger': 'Analyze proxy engine logs, active tunnels, and troubleshoot performance.',
  'Regression': 'Execute automated regression tests on target endpoints.',
  'APIs Collection': 'Manage local collections of API routes, definitions, and specs.'
};

function ClockWidget() {
  const [time, setTime] = React.useState(new Date());

  React.useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeString = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const dateString = time.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="p-4 rounded-md border bg-card/30 dark:bg-card/10 backdrop-blur-md shadow-md flex flex-col justify-center select-none">
      <div className="flex items-center gap-1.5 mb-2">
        <Clock className="size-3.5 text-primary" />
        <span className="text-[10px] font-mono font-bold tracking-wider text-muted-foreground uppercase">System Time</span>
      </div>
      <div className="text-2xl font-bold font-mono text-foreground tracking-widest leading-none">{timeString}</div>
      <div className="text-[10px] text-muted-foreground font-medium mt-1.5">{dateString}</div>
    </div>
  );
}

function ProxyWidget() {
  const {
    proxyStatus,
    proxyPort,
    proxyDefaultPort,
    startProxy,
    stopProxy
  } = useAppStore();

  const handleProxyToggle = async () => {
    if (proxyStatus === 'connected') {
      await stopProxy();
    } else if (proxyStatus === 'disconnected') {
      await startProxy();
    }
  };

  const activePort = proxyPort ?? proxyDefaultPort;

  return (
    <div className="p-4 rounded-md border bg-card/30 dark:bg-card/10 backdrop-blur-md shadow-md flex flex-col gap-3 select-none">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Server className="size-3.5 text-primary" />
          <span className="text-[10px] font-mono font-bold tracking-wider text-muted-foreground uppercase">Proxy Server</span>
        </div>
        {proxyStatus === 'connected' && (
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-4 mt-0.5">
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold truncate text-foreground">
            {proxyStatus === 'connected' ? (
              <span className="text-emerald-500">Connected</span>
            ) : proxyStatus === 'starting' ? (
              <span className="text-amber-500 animate-pulse">Starting...</span>
            ) : proxyStatus === 'stopping' ? (
              <span className="text-amber-500 animate-pulse">Stopping...</span>
            ) : (
              <span className="text-muted-foreground">Disconnected</span>
            )}
          </div>
          {proxyStatus === 'connected' && (
            <div className="text-[9px] text-muted-foreground mt-0.5 font-mono">Port {activePort}</div>
          )}
        </div>

        <Button
          onClick={handleProxyToggle}
          disabled={proxyStatus === 'starting' || proxyStatus === 'stopping'}
          variant={proxyStatus === 'connected' ? 'destructive' : 'default'}
          className="h-6 px-2.5 text-[10px] font-medium shrink-0"
        >
          {proxyStatus === 'starting' || proxyStatus === 'stopping' ? (
            <Loader2 className="size-3 animate-spin" />
          ) : proxyStatus === 'connected' ? (
            'Stop'
          ) : (
            'Start'
          )}
        </Button>
      </div>
    </div>
  );
}

function ScratchpadWidget() {
  const [note, setNote] = React.useState(() => localStorage.getItem('desktop-scratchpad') ?? '');

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setNote(val);
    localStorage.setItem('desktop-scratchpad', val);
  };

  return (
    <div className="p-4 rounded-md border bg-card/30 dark:bg-card/10 backdrop-blur-md shadow-md flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        <StickyNote className="size-3.5 text-primary" />
        <span className="text-[10px] font-mono font-bold tracking-wider text-muted-foreground uppercase">Scratchpad</span>
      </div>
      <textarea
        value={note}
        onChange={handleChange}
        placeholder="Type quick notes here (autosaved)..."
        className="w-full h-24 p-2 bg-muted/20 dark:bg-black/10 border rounded-sm text-[10px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none font-sans"
      />
    </div>
  );
}

export function OverviewPage() {
  const navigate = useNavigate();
  const searchQuery = useNavStore((s) => s.overviewSearchQuery);
  const setSearchQuery = useNavStore((s) => s.setOverviewSearchQuery);

  // Get all unique navigation items, filter out 'Overview', apply environment check and query matching
  const displayItems = React.useMemo(() => {
    const baseItems = allNavItems.filter((item) => item.label !== 'Overview');

    const activeItems = import.meta.env.PROD
      ? baseItems.filter((item) => !item.devOnly)
      : baseItems;

    return activeItems.filter((item) => {
      const matchQuery = searchQuery.toLowerCase();
      const matchesLabel = item.label.toLowerCase().includes(matchQuery);
      const matchesDesc = (FEATURE_DESCRIPTIONS[item.label] ?? '')
        .toLowerCase()
        .includes(matchQuery);
      return matchesLabel || matchesDesc;
    });
  }, [searchQuery]);

  return (
    <div className="os-desktop-wallpaper flex flex-col h-full min-h-0 overflow-y-auto scrollbar-thin transition-colors duration-300">
      <style>{`
        .os-desktop-wallpaper {
          background-color: var(--background);
          background-image: 
            radial-gradient(at 0% 0%, hsla(135, 100%, 39%, 0.03) 0px, transparent 50%),
            radial-gradient(at 50% 0%, hsla(260, 85%, 45%, 0.03) 0px, transparent 50%),
            radial-gradient(at 100% 100%, hsla(135, 100%, 39%, 0.02) 0px, transparent 50%),
            radial-gradient(at 0% 100%, hsla(260, 85%, 45%, 0.02) 0px, transparent 50%);
          transition: background-color 0.3s ease;
        }
        .dark .os-desktop-wallpaper {
          background-image: 
            radial-gradient(at 0% 0%, hsla(135, 100%, 39%, 0.05) 0px, transparent 50%),
            radial-gradient(at 50% 0%, hsla(260, 85%, 45%, 0.05) 0px, transparent 50%),
            radial-gradient(at 100% 100%, hsla(135, 100%, 39%, 0.04) 0px, transparent 50%),
            radial-gradient(at 0% 100%, hsla(260, 85%, 45%, 0.04) 0px, transparent 50%);
        }
      `}</style>
      <div className="max-w-6xl mx-auto w-full px-6 py-6 flex flex-col md:flex-row gap-6 items-start">

        {/* Left Column - Unified Desktop Grid */}
        <div className="flex-1 min-w-0">
          {displayItems.length > 0 ? (
            <div className="flex flex-wrap gap-4">
              {displayItems.map((item) => {
                const IconComp = item.icon;
                return (
                  <div
                    key={item.href}
                    onClick={() => navigate(item.href)}
                    className="group w-18 relative flex flex-col items-center justify-center p-1.5 rounded-sm border border-transparent hover:border-primary/20 hover:bg-primary/5 transition-all duration-200 cursor-pointer text-center select-none"
                    title={FEATURE_DESCRIPTIONS[item.label]}
                  >
                    {/* Dev Only Overlay Indicator */}
                    {item.devOnly && (
                      <div
                        className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-amber-500 ring-2 ring-background"
                        title="Development Only"
                      />
                    )}

                    {/* Desktop Icon Wrapper */}
                    {FEATURE_IMAGES[item.label] ? (
                      <div className="flex items-center justify-center size-12">
                        <img
                          src={FEATURE_IMAGES[item.label]}
                          alt={item.label}
                          className="size-12 object-contain select-none"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center justify-center size-9 rounded bg-muted/40 dark:bg-white/[0.03] group-hover:bg-primary/10 transition-all duration-200">
                        <IconComp className="size-5 text-muted-foreground group-hover:text-primary transition-colors duration-200" />
                      </div>
                    )}

                    {/* Desktop Label */}
                    <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground mt-2 line-clamp-1 leading-tight px-0.5 break-all text-elipsis">
                      {item.label}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 px-4 rounded-lg border border-dashed border-border/80 bg-muted/20 backdrop-blur-sm">
              <ShieldAlert className="size-8 text-muted-foreground mb-3" />
              <p className="text-sm font-medium text-foreground">No features matched your search</p>
              <p className="text-xs text-muted-foreground mt-1">Try searching for another keyword or clear the search input.</p>
              <Button
                variant="link"
                onClick={() => setSearchQuery('')}
                className="mt-2 text-xs font-semibold text-primary hover:underline h-auto p-0"
              >
                Clear Search
              </Button>
            </div>
          )}
        </div>

        {/* Right Column - OS Desktop Widgets */}
        <div className="w-full md:w-64 lg:w-72 shrink-0 flex flex-col gap-4">
          <ClockWidget />
          <ProxyWidget />
          <ScratchpadWidget />
        </div>

      </div>
    </div>
  );
}
