'use client';

import type { ReactNode } from 'react';
import { Tabs } from '@/components/ui/tabs';
import { PageTabBar, type PageTabItem } from './tab-bar';

interface TabbedPageLayoutProps {
  tabs: PageTabItem[];
  activeTabId: string;
  onTabChange: (id: string) => void;
  onTabClose?: (id: string) => void;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

export function TabbedPageLayout({
  tabs,
  activeTabId,
  onTabChange,
  onTabClose,
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
          onTabClose={onTabClose}
        />
      </div>
      <div className={contentClassName}>
        <Tabs value={activeTabId} onValueChange={onTabChange} className="h-full flex flex-col">
          {children}
        </Tabs>
      </div>
    </div>
  );
}
