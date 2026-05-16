'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface TabItem {
  id: string;
  name: string;
  disabled?: boolean;
}

export interface TabBarProps {
  tabs: TabItem[];
  activeTabId: string;
  onTabChange: (id: string) => void;
}

export function TabBar({ tabs, activeTabId, onTabChange }: TabBarProps) {
  return (
    <div className="flex items-center gap-1 bg-muted/30 overflow-x-auto">
      <div className="flex items-center gap-1 flex-1 min-w-0">
        {tabs.map((tab) => (
          <TabItem
            key={tab.id}
            tab={tab.name}
            isActive={activeTabId === tab.id}
            onClick={() => !tab.disabled && onTabChange(tab.id)}
            disabled={tab.disabled}
          />
        ))}
      </div>
    </div>
  );
}

interface TabItemProps {
  tab: string;
  isActive: boolean;
  disabled?: boolean;
  onClick: () => void;
}

function TabItem({ tab, isActive, disabled, onClick }: TabItemProps) {
  return (
    <div
      className={cn(
        'flex items-center rounded-t-md text-sm transition-colors min-w-0 hover:bg-muted/50 py-2 px-2 cursor-pointer gap-1',
        isActive ? 'bg-background font-medium border-x border-t border-green-500 shadow-xl' : 'border text-muted-foreground',
        disabled && 'opacity-50 cursor-not-allowed hover:bg-muted/30'
      )}
      onClick={onClick}
    >
      <span className="truncate text-xs max-w-[150px]">{tab}</span>
    </div>
  );
}