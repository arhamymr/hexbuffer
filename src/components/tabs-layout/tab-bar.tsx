'use client';

import { useCallback, type MouseEvent, type ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, Plus, X } from 'lucide-react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { cn } from '@/lib/utils';
import { useTabBar } from './use-tab-bar';
import type { PageTabItem } from './types';
export type { PageTabItem } from './types';

interface PageTabBarProps {
  tabs: PageTabItem[];
  activeTabId: string;
  onTabChange: (id: string) => void;
  onTabRename?: (id: string, name: string) => void;
  onTabClose?: (id: string) => void;
  onTabAdd?: () => void;
  onCloseTabsToLeft?: (id: string) => void;
  onCloseTabsToRight?: (id: string) => void;
  renderTabContextMenuItems?: (tab: PageTabItem) => ReactNode;
}

export function PageTabBar({
  tabs,
  activeTabId,
  onTabChange,
  onTabRename,
  onTabClose,
  onTabAdd,
  onCloseTabsToLeft,
  onCloseTabsToRight,
  renderTabContextMenuItems,
}: PageTabBarProps) {
  const {
    scrollContainerRef,
    editingInputRef,
    canScrollLeft,
    canScrollRight,
    editingTabId,
    editingName,
    setEditingName,
    startEditingTab,
    finishEditingTab,
    cancelEditingTab,
  } = useTabBar({ tabs, onTabRename, onTabChange });

  const closeTab = useCallback((event: MouseEvent, tab: PageTabItem) => {
    event.stopPropagation();
    if (tab.disabled || tab.closable === false) {
      return;
    }

    onTabClose?.(tab.id);
  }, [onTabClose]);

  const renderTab = useCallback((tab: PageTabItem) => {
    const canClose = !tab.disabled && Boolean(onTabClose) && tab.closable !== false;
    const StatusIcon =
      tab.status?.kind === 'running'
        ? Loader2
        : tab.status?.kind === 'needs-action'
          ? AlertTriangle
          : tab.status?.kind === 'ready'
            ? CheckCircle2
            : null;

    return (
      <div
        className={cn(
          'flex min-w-max shrink-0 items-center gap-1 rounded-t-md border text-xs transition-colors px-1 -mb-0.5',
          tab.disabled
            ? 'text-muted-foreground/60'
            : 'hover:bg-muted',
          activeTabId === tab.id
            ? 'bg-background font-medium border-x border-t border-primary shadow-xl text-foreground'
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
              'min-w-max px-1.5 py-1',
              tab.disabled ? 'cursor-not-allowed' : 'cursor-pointer'
            )}
            onClick={() => !tab.disabled && onTabChange(tab.id)}
            disabled={tab.disabled}
            title={tab.status?.label}
          >
            <span className="flex items-center gap-1.5 whitespace-nowrap text-xs">
              {StatusIcon && (
                <StatusIcon
                  className={cn(
                    'size-3 shrink-0',
                    tab.status?.kind === 'running' && 'animate-spin text-primary',
                    tab.status?.kind === 'needs-action' && 'text-amber-500',
                    tab.status?.kind === 'ready' && 'text-emerald-500/70'
                  )}
                />
              )}
              <span>{tab.name}</span>
            </span>
          </button>
        )}
        {canClose && editingTabId !== tab.id && (
          <button
            type="button"
            className="mr-1 rounded-sm p-0.5 hover:bg-red-500/20"
            onClick={(event) => closeTab(event, tab)}
            aria-label={`Delete ${tab.name}`}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    );
  }, [activeTabId, editingTabId, editingName, onTabChange, closeTab, setEditingName, finishEditingTab, cancelEditingTab, onTabClose]);

  return (
    <div className="relative">
      <div
        ref={scrollContainerRef}
        className="flex items-center gap-1 overflow-x-auto bg-muted/30 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]"
      >
        <div className="flex min-w-full w-max items-center gap-1 px-2 pt-2">
          {tabs.map((tab) => {
            const tabIndex = tabs.findIndex((currentTab) => currentTab.id === tab.id);
            const canRename = !tab.disabled && Boolean(onTabRename);
            const canClose = !tab.disabled && Boolean(onTabClose) && tab.closable !== false;
            const hasClosableTabsToLeft = tabs
              .slice(0, tabIndex)
              .some((currentTab) => !currentTab.disabled && currentTab.closable !== false);
            const hasClosableTabsToRight = tabs
              .slice(tabIndex + 1)
              .some((currentTab) => !currentTab.disabled && currentTab.closable !== false);
            const canCloseTabsToLeft = !tab.disabled && Boolean(onCloseTabsToLeft) && hasClosableTabsToLeft;
            const canCloseTabsToRight = !tab.disabled && Boolean(onCloseTabsToRight) && hasClosableTabsToRight;
            const customContextMenuItems = renderTabContextMenuItems?.(tab);
            const hasCustomContextMenuItems = Boolean(customContextMenuItems);
            const hasContextMenu =
              canRename ||
              canClose ||
              canCloseTabsToLeft ||
              canCloseTabsToRight ||
              hasCustomContextMenuItems;

            if (!hasContextMenu) {
              return <div key={tab.id}>{renderTab(tab)}</div>;
            }

            return (
              <ContextMenu key={tab.id}>
                <ContextMenuTrigger asChild>{renderTab(tab)}</ContextMenuTrigger>
                <ContextMenuContent>
                  {customContextMenuItems}
                  {hasCustomContextMenuItems && (canRename || canClose) && <ContextMenuSeparator />}
                  {canRename && (
                    <ContextMenuItem onClick={() => startEditingTab(tab)}>
                      Rename
                    </ContextMenuItem>
                  )}
                  {canCloseTabsToLeft && (
                    <ContextMenuItem onClick={() => onCloseTabsToLeft?.(tab.id)}>
                      Close tabs to the left
                    </ContextMenuItem>
                  )}
                  {canCloseTabsToRight && (
                    <ContextMenuItem onClick={() => onCloseTabsToRight?.(tab.id)}>
                      Close tabs to the right
                    </ContextMenuItem>
                  )}
                  {(canRename || canCloseTabsToLeft || canCloseTabsToRight) && canClose && (
                    <ContextMenuSeparator />
                  )}
                  {canClose && (
                    <ContextMenuItem onClick={() => onTabClose?.(tab.id)} variant="destructive">
                      Delete
                    </ContextMenuItem>
                  )}
                </ContextMenuContent>
              </ContextMenu>
            );
          })}
          {onTabAdd && (
            <button
              type="button"
              className="mb-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-t-md border text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={onTabAdd}
              aria-label="Add tab"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          )}
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
