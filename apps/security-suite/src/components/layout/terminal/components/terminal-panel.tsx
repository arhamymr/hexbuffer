import * as React from 'react';
import {
  ChevronDown,
  ChevronUp,
  PanelBottomClose,
  Search,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useTheme } from '@/components/theme-provider';
import { cn } from '@/lib/utils';
import { TerminalInstance } from './terminal-instance';
import type { TerminalInstanceHandle, TerminalPanelHandle } from '../types';
import '@xterm/xterm/css/xterm.css';

const NOOP = () => {};

export const TerminalPanel = React.forwardRef<
  TerminalPanelHandle,
  { onClosePanel?: () => void }
>(function TerminalPanel({ onClosePanel }, ref) {
  const instanceRef = React.useRef<TerminalInstanceHandle | null>(null);
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [hasSearchMatch, setHasSearchMatch] = React.useState<boolean | null>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const handleClosePanel = React.useMemo(() => onClosePanel ?? NOOP, [onClosePanel]);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const activeInstance = React.useCallback(() => {
    return instanceRef.current;
  }, []);

  React.useImperativeHandle(
    ref,
    () => ({
      write(data: string) {
        activeInstance()?.write(data);
      },
      writeln(data: string) {
        activeInstance()?.writeln(data);
      },
      clear() {
        activeInstance()?.clear();
      },
      focus() {
        activeInstance()?.focus();
      },
    }),
    [activeInstance],
  );

  React.useEffect(() => {
    activeInstance()?.focus();
  }, [activeInstance]);

  React.useEffect(() => {
    if (!isSearchOpen) return;

    const id = setTimeout(() => {
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    }, 0);

    return () => clearTimeout(id);
  }, [isSearchOpen]);

  const searchActiveTerminal = React.useCallback(
    (direction: 'next' | 'previous', query = searchQuery) => {
      if (!query) {
        setHasSearchMatch(null);
        return;
      }

      const instance = activeInstance();
      const found =
        direction === 'next'
          ? instance?.findNext(query) ?? false
          : instance?.findPrevious(query) ?? false;
      setHasSearchMatch(found);
    },
    [activeInstance, searchQuery],
  );

  const closeSearch = React.useCallback(() => {
    activeInstance()?.clearSearch();
    setSearchQuery('');
    setHasSearchMatch(null);
    setIsSearchOpen(false);
    activeInstance()?.focus();
  }, [activeInstance]);

  const toolbarBg = isDark ? 'bg-[#0d1117]' : 'bg-[#f6f8fa]';
  const toolbarBorder = isDark ? 'border-[#21262d]' : 'border-[#d0d7de]';
  const btnMuted = isDark ? 'text-[#6e7681]' : 'text-[#6e7781]';
  const btnHover = isDark
    ? 'hover:bg-[#21262d] hover:text-[#c9d1d9]'
    : 'hover:bg-[#d0d7de] hover:text-[#1f2328]';

  return (
    <div className="flex h-full w-full flex-col">
      <div className={cn('flex h-7 shrink-0 items-center gap-1 border-b px-1', toolbarBg, toolbarBorder)}>
        <div className="flex min-w-0 flex-1 items-center px-2 text-xs font-medium text-muted-foreground">
          Terminal
        </div>

        {isSearchOpen && (
          <div className="flex h-6 w-64 shrink-0 items-center gap-1">
            <Input
              ref={searchInputRef}
              className={cn(
                'h-6 rounded-sm px-2 py-0 text-xs',
                hasSearchMatch === false && 'border-red-500 focus-visible:ring-red-500/30',
              )}
              value={searchQuery}
              onChange={(event) => {
                const value = event.target.value;
                setSearchQuery(value);
                searchActiveTerminal('next', value);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  searchActiveTerminal(event.shiftKey ? 'previous' : 'next');
                }
                if (event.key === 'Escape') closeSearch();
              }}
              placeholder="Search"
              aria-label="Search terminal output"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="size-6 rounded-sm"
              onClick={() => searchActiveTerminal('previous')}
              aria-label="Previous match"
            >
              <ChevronUp className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="size-6 rounded-sm"
              onClick={() => searchActiveTerminal('next')}
              aria-label="Next match"
            >
              <ChevronDown className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="size-6 rounded-sm"
              onClick={closeSearch}
              aria-label="Close search"
            >
              <X className="size-3.5" />
            </Button>
          </div>
        )}

        {!isSearchOpen && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className={cn('size-6 shrink-0 rounded-sm', btnMuted, btnHover)}
                onClick={() => setIsSearchOpen(true)}
                aria-label="Search terminal"
              >
                <Search className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Search Terminal</TooltipContent>
          </Tooltip>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className={cn('size-6 shrink-0 rounded-sm', btnMuted, btnHover)}
              onClick={handleClosePanel}
              aria-label="Close terminal panel"
            >
              <PanelBottomClose className="size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Close Terminal Panel</TooltipContent>
        </Tooltip>
      </div>

      <div className="relative min-h-0 flex-1">
        <TerminalInstance
          ref={(handle) => {
            instanceRef.current = handle;
          }}
          isActive
        />
      </div>
    </div>
  );
});
