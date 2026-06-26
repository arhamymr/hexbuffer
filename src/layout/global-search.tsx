import * as React from 'react';
import { useLocation } from 'react-router-dom';
import { Search } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useHistoryQueryStore } from '@/pages/live-traffic/state/history-query-store';
import { useBrowserAutomationStore } from '@/stores/browser-automation';
import { useInvokerStore } from '@/stores/invoker';
import { useNavStore } from '@/stores/nav';
import { setBrowserSearch } from '@/triggers';

// ---------------------------------------------------------------------------
// GlobalSearch Component
// ---------------------------------------------------------------------------

interface SearchInputProps {
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
}

function SearchInput({ value, onChange, placeholder }: SearchInputProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Global "/" keyboard shortcut
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if ((e.target as HTMLElement)?.isContentEditable) return;

      if (e.key === '/' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="relative flex items-center mx-2">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'h-7 w-44 rounded-md border border-input bg-transparent pl-7 pr-2',
          'text-xs text-foreground placeholder:text-muted-foreground',
          'outline-none transition-all duration-200',
          'focus:w-64 focus:border-primary/50 focus:ring-1 focus:ring-primary/30',
        )}
      />
    </div>
  );
}

function OverviewSearch() {
  const overviewSearch = useNavStore((s) => s.overviewSearchQuery);
  const setOverviewSearch = useNavStore((s) => s.setOverviewSearchQuery);

  const [localVal, setLocalVal] = React.useState(overviewSearch);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    setLocalVal(overviewSearch);
  }, [overviewSearch]);

  const handleChange = (val: string) => {
    setLocalVal(val);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      setOverviewSearch(val);
    }, 200);
  };

  React.useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <SearchInput
      value={localVal}
      onChange={handleChange}
      placeholder="Search features…"
    />
  );
}

function LiveTrafficSearch() {
  const liveSearch = useHistoryQueryStore((s) => s.filter.search);
  const liveSetSearch = useHistoryQueryStore((s) => s.setSearch);

  const [localVal, setLocalVal] = React.useState(liveSearch);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    setLocalVal(liveSearch);
  }, [liveSearch]);

  const handleChange = (val: string) => {
    setLocalVal(val);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      liveSetSearch(val);
    }, 200);
  };

  React.useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <SearchInput
      value={localVal}
      onChange={handleChange}
      placeholder="Search URL, host, method, body…"
    />
  );
}

function BrowserAutomationSearch() {
  const browserSearch = useBrowserAutomationStore(
    (s) => (s.tabs.find((t) => t.id === s.activeTabId) ?? s.tabs[0] ?? null)?.search ?? ''
  );

  const [localVal, setLocalVal] = React.useState(browserSearch);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    setLocalVal(browserSearch);
  }, [browserSearch]);

  const handleChange = (val: string) => {
    setLocalVal(val);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      setBrowserSearch(val);
    }, 200);
  };

  React.useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <SearchInput
      value={localVal}
      onChange={handleChange}
      placeholder="Search pages, logs, insights…"
    />
  );
}

function InvokerSearch() {
  const invokerSearch = useInvokerStore(
    (s) => s.tabs.find((t) => t.id === s.activeTabId)?.filterSearch ?? ''
  );
  const invokerSetSearch = useInvokerStore((s) => s.setFilterSearch);

  const [localVal, setLocalVal] = React.useState(invokerSearch);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    setLocalVal(invokerSearch);
  }, [invokerSearch]);

  const handleChange = (val: string) => {
    setLocalVal(val);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      invokerSetSearch(val);
    }, 200);
  };

  React.useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <SearchInput
      value={localVal}
      onChange={handleChange}
      placeholder="Search status or payload…"
    />
  );
}

function DefaultSearch() {
  const [localVal, setLocalVal] = React.useState('');
  return (
    <SearchInput
      value={localVal}
      onChange={setLocalVal}
      placeholder="Search pages…"
    />
  );
}

export function GlobalSearch() {
  const { pathname } = useLocation();

  // Pages where global search should be hidden
  const hiddenPaths = [
    '/intercept', '/repeater',
    '/automation', '/regression',
    '/threats', '/debugger', '/tools', '/documents',
  ];
  const isHidden = hiddenPaths.some((p) => pathname.startsWith(p));

  if (isHidden) return null;

  if (pathname === '/') {
    return <OverviewSearch />;
  }
  if (pathname === '/live-traffic') {
    return <LiveTrafficSearch />;
  }
  if (pathname.startsWith('/browser-automation')) {
    return <BrowserAutomationSearch />;
  }
  if (pathname.startsWith('/invoker')) {
    return <InvokerSearch />;
  }

  return <DefaultSearch />;
}
