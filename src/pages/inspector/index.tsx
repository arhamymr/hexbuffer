'use client';

import { useState } from 'react';
import { TabbedPageLayout } from '@/components/tabs-layout/tabbed-page-layout';
import type { PageTabItem } from '@/components/tabs-layout/types';
import { cn } from '@/lib/utils';
import { useInspectorPage } from './hooks/use-inspector-page';
import { InspectorView } from './components/inspector-view';
import { BrowserPanel } from './components/browser-panel';
import type { InspectorTopTab } from './types';

const TOP_LEVEL_TABS: PageTabItem[] = [
  { id: 'browser', name: 'Browser', closable: false },
  { id: 'inspector', name: 'Inspector', closable: false },
];

const BROWSER_TAB_ID = 'inspector-browser-tab';

export function InspectorPage() {
  const {
    isConnected,
    isConnecting,
    isResetting,
    sidebarOpen,
    setSidebarOpen,
    activeTab,
    setActiveTab,
    activeProxyPort,
    selectedLogId,
    selectedLog,
    selectedNetwork,
    handleSelectLog,
    handleConnect,
    handleDisconnect,
    handleReset,
  } = useInspectorPage();

  const [topTab, setTopTab] = useState<InspectorTopTab>('inspector');

  return (
    <TabbedPageLayout
      tabs={TOP_LEVEL_TABS}
      activeTabId={topTab}
      onTabChange={(id) => setTopTab(id as InspectorTopTab)}
      contentClassName="flex-1 border rounded-lg overflow-hidden bg-background min-h-0"
    >
      <div className="relative flex-1 min-h-0">
        <div
          className={cn(
            topTab === 'browser'
              ? 'w-full h-full'
              : 'invisible pointer-events-none absolute inset-0'
          )}
        >
          <BrowserPanel browserTabId={BROWSER_TAB_ID} isVisible={topTab === 'browser'} />
        </div>

        <div
          className={cn(
            topTab === 'inspector'
              ? 'w-full h-full'
              : 'invisible pointer-events-none absolute inset-0'
          )}
        >
          <InspectorView
            isConnected={isConnected}
            isConnecting={isConnecting}
            isResetting={isResetting}
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            activeProxyPort={activeProxyPort}
            selectedLogId={selectedLogId}
            selectedLog={selectedLog}
            selectedNetwork={selectedNetwork}
            onSelectLog={handleSelectLog}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
            onReset={handleReset}
          />
        </div>
      </div>
    </TabbedPageLayout>
  );
}
