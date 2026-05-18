'use client';

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
}

export function PageTabBar({ tabs, activeTabId, onTabChange }: PageTabBarProps) {
  return (
    <div className="flex items-center gap-1 bg-muted/30 overflow-x-auto">
      <div className="flex items-center gap-1 flex-1 min-w-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={cn(
              'flex items-center rounded-t-md text-sm transition-colors min-w-0 py-2 px-2 gap-1 border',
              tab.disabled
                ? 'cursor-not-allowed text-muted-foreground/60'
                : 'cursor-pointer hover:bg-muted/50',
              activeTabId === tab.id
                ? 'bg-background font-medium border-x border-t border-green-500 shadow-xl text-foreground'
                : 'text-muted-foreground'
            )}
            onClick={() => !tab.disabled && onTabChange(tab.id)}
            disabled={tab.disabled}
          >
            <span className="truncate text-xs max-w-[150px]">{tab.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
