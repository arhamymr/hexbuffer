'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useTabBar } from './hooks';

export function TabBar() {
  const { tabs, activeTabId, setActiveTabId, removeTab } = useTabBar();
  console.log(activeTabId, "tabs")

  return (
    <div className="flex items-center gap-1 bg-muted/30 overflow-x-auto">
      <div className="flex items-center gap-1 flex-1 min-w-0">
        <TabItem
          tab="All History"
          isActive={activeTabId === "all-scope"}
          onClick={() => setActiveTabId("all-scope")}
        />
        {tabs.map((tab) => (
          <TabItem
            key={tab.id}
            tab={tab.name}
            isActive={activeTabId === tab.id}
            onClick={() => setActiveTabId(tab.id)}
            onClose={(e) => {
              e.stopPropagation();
              removeTab(tab.id);
            }}
          />
        ))}
      </div>
    </div>
  );
}

interface TabItemProps {
  tab: string;
  isActive: boolean;
  onClick: () => void;
  onClose?: (e: React.MouseEvent) => void;
}

function TabItem({ tab, isActive, onClick, onClose }: TabItemProps) {
  return (
    <div
      className={cn(
        'flex items-center rounded-t-md text-sm transition-colors min-w-0',
        'hover:bg-muted/50',
        isActive ? 'bg-background font-medium border-x border-t border-green-500 font-semibold' : 'border text-muted-foreground'
      )}
    >
      <Button
        variant="ghost"
        size="xs"
        className="h-8 px-3 font-normal"
        onClick={onClick}
      >
        <span className="truncate text-xs font-mono max-w-[150px]">{tab}</span>
      </Button>
      <Button
        variant="ghost"
        size="xs"
        onClick={onClose}
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}