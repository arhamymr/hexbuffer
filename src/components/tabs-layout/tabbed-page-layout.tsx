'use client';

import type { ReactNode } from 'react';
import { Tabs } from '@/components/ui/tabs';
import { PageTabBar } from './tab-bar';
import type { PageTabItem } from './types';

interface TabbedPageLayoutProps {
  tabs: PageTabItem[];
  activeTabId: string;
  onTabChange: (id: string) => void;
  onTabRename?: (id: string, name: string) => void;
  onTabClose?: (id: string) => void;
  onCloseTabsToLeft?: (id: string) => void;
  onCloseTabsToRight?: (id: string) => void;
  renderTabContextMenuItems?: (tab: PageTabItem) => ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

export function TabbedPageLayout({
  tabs,
  activeTabId,
  onTabChange,
  onTabRename,
  onTabClose,
  onCloseTabsToLeft,
  onCloseTabsToRight,
  renderTabContextMenuItems,
  children,
  className = 'flex flex-col h-full',
  contentClassName = 'flex-1 border rounded-md overflow-hidden bg-background min-h-0',
}: TabbedPageLayoutProps) {
  return (
    <div className={className}>
      <div className="mb-2 border-b border-green-500">
        <PageTabBar
          tabs={tabs}
          activeTabId={activeTabId}
          onTabChange={onTabChange}
          onTabRename={onTabRename}
          onTabClose={onTabClose}
          onCloseTabsToLeft={onCloseTabsToLeft}
          onCloseTabsToRight={onCloseTabsToRight}
          renderTabContextMenuItems={renderTabContextMenuItems}
        />
      </div>
      <div className={contentClassName}>
        <Tabs value={activeTabId} onValueChange={onTabChange} className="gap-0 h-full flex flex-col">
          {children}
        </Tabs>
      </div>
    </div>
  );
}
