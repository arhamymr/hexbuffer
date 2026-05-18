'use client';

import { X } from 'lucide-react';
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
  onTabClose?: (id: string) => void;
}

export function PageTabBar({ tabs, activeTabId, onTabChange, onTabClose }: PageTabBarProps) {
  return (
    <div className="flex items-center gap-1 bg-muted/30 overflow-x-auto">
      <div className="flex items-center gap-1 flex-1 min-w-0">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={cn(
              'flex items-center rounded-t-md text-sm transition-colors min-w-0 gap-1 border',
              tab.disabled
                ? 'text-muted-foreground/60'
                : 'hover:bg-muted/50',
              activeTabId === tab.id
                ? 'bg-background font-medium border-x border-t border-green-500 shadow-xl text-foreground'
                : 'text-muted-foreground'
            )}
          >
            <button
              type="button"
              className={cn(
                'min-w-0 py-2 pl-2',
                tab.disabled ? 'cursor-not-allowed' : 'cursor-pointer'
              )}
              onClick={() => !tab.disabled && onTabChange(tab.id)}
              disabled={tab.disabled}
            >
              <span className="truncate text-xs max-w-[150px] block">{tab.name}</span>
            </button>
            {onTabClose && !tab.disabled && (
              <button
                type="button"
                className="mr-1 rounded-sm p-1 hover:bg-muted"
                onClick={() => onTabClose(tab.id)}
                aria-label={`Close ${tab.name}`}
                title="Close tab"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
