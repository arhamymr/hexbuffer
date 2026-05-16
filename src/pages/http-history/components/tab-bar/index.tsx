'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTabBar } from './hooks';

export function TabBar() {
  const { tabs, activeTabId, setActiveTabId, removeTab } = useTabBar();

  return (
    <div className="flex items-center gap-1 bg-muted/30 overflow-x-auto">
      <div className="flex items-center gap-1 flex-1 min-w-0">
        <TabItem
          tab="All History"
          isActive={activeTabId === "all-scope"}
          onClick={() => setActiveTabId("all-scope")}
        />
        {tabs?.map((tab) => (
          <TabItem
            key={tab.id}
            tab={tab.name}
            isActive={activeTabId === tab.id}
            onClick={() => setActiveTabId(tab.id)}
            onClose={(e) => {
              e.stopPropagation();
              removeTab(tab.id);
              setActiveTabId("all-scope")
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
        'flex items-center rounded-t-md text-sm transition-colors min-w-0 hover:bg-muted/50 py-1.5 px-2 cursor-pointer gap-1',
        isActive ? 'bg-background font-medium border-x border-t border-green-500 font-semibold shadow-xl' : 'border text-muted-foreground'
      )}
      onClick={onClick}
    >
      <div
        className="font-normal"
      >
        <span className="truncate text-xs max-w-[150px]">{tab}</span>
      </div>
      { onClose ? <div
        onClick={onClose}
        className='hover:bg-red-500/20 rounded-sm p-0.5'
      >
        <X className="h-3.5 w-3.5" />
      </div> : null }
      
    </div>
  );
}