import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SquaresFourIcon, PushPinSimpleIcon, PushPinSimpleSlashIcon } from '@phosphor-icons/react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command';
import { mainNavItems } from '../constants';
import { useAppSettingsStore } from '@/stores/app-settings-store';
import { Kbd } from '@/components/ui/kbd';
import { TriangleLogo } from '../triangle-logo';

export function AppLauncher() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const pinnedNavItems = useAppSettingsStore((s) => s.pinnedNavItems);
  const togglePinNavItem = useAppSettingsStore((s) => s.togglePinNavItem);

  const launcherItems = mainNavItems.filter((item) => item.href !== '/');

  const MAX_PINNED = 9;
  const pinnedCount = pinnedNavItems.length;
  const isAtMax = pinnedCount >= MAX_PINNED;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key?.toLowerCase() === 'p') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const isMac = typeof window !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className={cn(
              'flex size-7 items-center justify-center rounded-sm text-muted-foreground transition-all hover:bg-muted/80 hover:text-foreground cursor-pointer',
              open && 'bg-primary/15 text-primary',
            )}
          >
            <TriangleLogo />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={12} className="flex items-center gap-1.5">
          <span>All Apps</span>
          <Kbd className="text-[10px]">
            {isMac ? '⌘ + P' : 'Ctrl + P'}
          </Kbd>
        </TooltipContent>
      </Tooltip>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search apps…" autoFocus />
        <CommandList>
          <CommandEmpty>No apps found.</CommandEmpty>
          <CommandGroup>
            {launcherItems.map((item) => {
              const isPinned = pinnedNavItems.includes(item.href);

              return (
                <CommandItem
                  key={item.href}
                  value={item.label}
                  onSelect={() => {
                    navigate(item.href);
                    setOpen(false);
                  }}
                >
                  <div
                    role="button"
                    tabIndex={-1}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      if (!isPinned && isAtMax) {
                        toast.error('Dock is full', {
                          description: `Maximum ${MAX_PINNED + 1} apps. Unpin one first.`,
                        });
                        return;
                      }
                      togglePinNavItem(item.href);
                    }}
                    className={cn(
                      'shrink-0 p-0.5 rounded-sm hover:bg-muted cursor-pointer mr-2',
                      isPinned
                        ? 'text-green-500'
                        : 'text-muted-foreground/30 hover:text-muted-foreground',
                    )}
                    aria-label={isPinned ? `Unpin ${item.label}` : `Pin ${item.label}`}
                  >
                    {isPinned ? (
                      <PushPinSimpleIcon className="size-3.5" />
                    ) : (
                      <PushPinSimpleSlashIcon className="size-3.5" />
                    )}
                  </div>
                  <div className={cn(
                    "size-5 rounded-sm flex items-center justify-center mr-2 border shadow-sm shrink-0",
                    item.colors ? `${item.colors.bg} ${item.colors.border} text-white` : "bg-muted/40 border-transparent text-muted-foreground"
                  )}>
                    <item.icon className="size-3" />
                  </div>
                  <span>{item.label}</span>
                  {item.flag && item.flag !== 'release' && (
                    <span className={cn(
                      "text-[8px] font-extrabold uppercase tracking-wider ml-1.5 px-1 rounded-sm leading-none py-0.5 pointer-events-none select-none shrink-0",
                      item.flag === 'alpha'
                        ? "bg-rose-500/20 text-rose-500 dark:text-rose-400"
                        : "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                    )}>
                      {item.flag}
                    </span>
                  )}
                </CommandItem>
              );
            })}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
