'use client';

import * as React from 'react';
import { useTabs, Tab } from '@/app/context/TabsContext';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TabBarProps {
  route: string;
  className?: string;
}

export function TabBar({ route, className }: TabBarProps) {
  const { getRouteTabs, getActiveTab, removeTab, setActiveTab } = useTabs();
  const tabs = getRouteTabs(route);
  const activeTab = getActiveTab(route);

  if (tabs.length === 0) return null;

  return (
    <div className={cn('flex items-center gap-1 border-b bg-muted/30 p-1 overflow-x-auto', className)}>
      <div className="flex items-center gap-1 flex-1 min-w-0">
        {tabs.map((tab) => (
          <TabItem
            key={tab.id}
            tab={tab}
            isActive={activeTab?.id === tab.id}
            onClick={() => setActiveTab(route, tab.id)}
            onClose={(e) => {
              e.stopPropagation();
              removeTab(route, tab.id);
            }}
          />
        ))}
      </div>
    </div>
  );
}

interface TabItemProps {
  tab: Tab;
  isActive: boolean;
  onClick: () => void;
  onClose: (e: React.MouseEvent) => void;
}

function TabItem({ tab, isActive, onClick, onClose }: TabItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors min-w-0',
        'hover:bg-muted/50',
        isActive ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground'
      )}
    >
      <span className="truncate max-w-[150px]">{tab.targetName}</span>
      <X
        className="h-3.5 w-3.5 shrink-0 hover:text-foreground transition-colors"
        onClick={onClose}
      />
    </button>
  );
}