'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { cn } from '@/lib/utils';

export interface PageTabItem {
  id: string;
  name: string;
  disabled?: boolean;
}

interface PageTabBarProps {
  tabs: PageTabItem[];
  activeTabId: string;
  onTabChange: (id: string) => void;
  onTabRename?: (id: string, name: string) => void;
  onTabClose?: (id: string) => void;
}

export function PageTabBar({ tabs, activeTabId, onTabChange, onTabRename, onTabClose }: PageTabBarProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const editingInputRef = useRef<HTMLInputElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;

    if (!scrollContainer) {
      return;
    }

    const updateScrollIndicators = () => {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainer;

      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 1);
    };

    updateScrollIndicators();

    scrollContainer.addEventListener('scroll', updateScrollIndicators);

    const resizeObserver = new ResizeObserver(updateScrollIndicators);
    resizeObserver.observe(scrollContainer);

    return () => {
      scrollContainer.removeEventListener('scroll', updateScrollIndicators);
      resizeObserver.disconnect();
    };
  }, [tabs]);

  useEffect(() => {
    if (editingTabId) {
      requestAnimationFrame(() => {
        editingInputRef.current?.focus();
        editingInputRef.current?.select();
      });
    }
  }, [editingTabId]);

  useEffect(() => {
    if (editingTabId && !tabs.some((tab) => tab.id === editingTabId)) {
      setEditingTabId(null);
      setEditingName('');
    }
  }, [editingTabId, tabs]);

  const startEditingTab = (tab: PageTabItem) => {
    if (!onTabRename || tab.disabled) {
      return;
    }

    setEditingTabId(tab.id);
    setEditingName(tab.name);
    onTabChange(tab.id);
  };

  const finishEditingTab = () => {
    if (!editingTabId) {
      return;
    }

    const nextName = editingName.trim();
    const tab = tabs.find((item) => item.id === editingTabId);

    if (nextName && tab && nextName !== tab.name) {
      onTabRename?.(editingTabId, nextName);
    }

    setEditingTabId(null);
    setEditingName('');
  };

  const cancelEditingTab = () => {
    setEditingTabId(null);
    setEditingName('');
  };

  const renderTab = (tab: PageTabItem) => (
    <div
      className={cn(
        'flex min-w-max shrink-0 items-center gap-1 rounded-t-md border text-sm transition-colors',
        tab.disabled
          ? 'text-muted-foreground/60'
          : 'hover:bg-muted/50',
        activeTabId === tab.id
          ? 'bg-background font-medium border-x border-t border-green-500 shadow-xl text-foreground'
          : 'text-muted-foreground'
      )}
    >
      {editingTabId === tab.id ? (
        <input
          ref={editingInputRef}
          className="my-1 mx-2 h-7 w-28 rounded border bg-background px-2 text-xs outline-none focus-visible:ring-1 focus-visible:ring-green-500"
          value={editingName}
          onChange={(event) => setEditingName(event.target.value)}
          onBlur={finishEditingTab}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              finishEditingTab();
            }

            if (event.key === 'Escape') {
              cancelEditingTab();
            }
          }}
          aria-label={`Rename ${tab.name}`}
        />
      ) : (
        <button
          type="button"
          className={cn(
            'min-w-max px-2 py-2',
            tab.disabled ? 'cursor-not-allowed' : 'cursor-pointer'
          )}
          onClick={() => !tab.disabled && onTabChange(tab.id)}
          disabled={tab.disabled}
        >
          <span className="block whitespace-nowrap text-xs">{tab.name}</span>
        </button>
      )}
    </div>
  );

  return (
    <div className="relative">
      <div
        ref={scrollContainerRef}
        className="flex items-center gap-1 overflow-x-auto bg-muted/30"
      >
        <div className="flex min-w-full w-max items-center gap-1">
          {tabs.map((tab) => {
            const hasContextMenu = !tab.disabled && (onTabRename || onTabClose);

            if (!hasContextMenu) {
              return <div key={tab.id}>{renderTab(tab)}</div>;
            }

            return (
              <ContextMenu key={tab.id}>
                <ContextMenuTrigger asChild>{renderTab(tab)}</ContextMenuTrigger>
                <ContextMenuContent>
                  {onTabRename && (
                    <ContextMenuItem onClick={() => startEditingTab(tab)}>
                      Rename
                    </ContextMenuItem>
                  )}
                  {onTabRename && onTabClose && <ContextMenuSeparator />}
                  {onTabClose && (
                    <ContextMenuItem onClick={() => onTabClose(tab.id)} variant="destructive">
                      Delete
                    </ContextMenuItem>
                  )}
                </ContextMenuContent>
              </ContextMenu>
            );
          })}
        </div>
      </div>
      <div
        className={cn(
          'pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-background to-transparent transition-opacity',
          canScrollLeft ? 'opacity-100' : 'opacity-0'
        )}
      />
      <div
        className={cn(
          'pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background to-transparent transition-opacity',
          canScrollRight ? 'opacity-100' : 'opacity-0'
        )}
      />
    </div>
  );
}
