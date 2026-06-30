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
                  {item.iconImage ? (
                    <img src={item.iconImage} alt="" className="size-4 mr-2" />
                  ) : (
                    <item.icon className="size-4 mr-2" />
                  )}
                  <span>{item.label}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
