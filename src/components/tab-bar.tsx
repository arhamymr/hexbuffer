'use client';

import * as React from 'react';
import { useAppStore, Tab } from '@/stores/appStore';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface TabBarProps {
  route: string;
  className?: string;
}

export function TabBar({ route, className }: TabBarProps) {
  const routeTabs = useAppStore((s) => s.routeTabs);
  const activeTabId = useAppStore((s) => s.activeTabId);
  const removeTab = useAppStore((s) => s.removeTab);
  const setActiveTab = useAppStore((s) => s.setActiveTab);

  const tabs = routeTabs[route] || [];
  const activeTab = (tabs.length > 0 && activeTabId[route])
    ? tabs.find(t => t.id === activeTabId[route]) || tabs[0]
    : tabs[0] || null;

  if (tabs.length === 0) return null;

  return (
    <div className={cn('flex items-center gap-1 bg-muted/30 overflow-x-auto', className)}>
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
    <div
      className={cn(
        'flex items-center gap-1 rounded-md text-sm transition-colors min-w-0',
        'hover:bg-muted/50',
        isActive ? 'bg-background shadow-sm font-medium border' : 'text-muted-foreground'
      )}
    >
      <Button
        variant="ghost"
        size="sm"
        className="h-8 px-3 font-normal"
        onClick={onClick}
      >
        <span className="truncate max-w-[150px]">{tab.targetName}</span>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-6 shrink-0"
        onClick={onClose}
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}