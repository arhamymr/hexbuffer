import { useState } from 'react';
import { TabbedPageLayout } from '@/components/tabs-layout/tabbed-page-layout';
import { cn } from '@/lib/utils';
import { useInspectorPage } from './hooks/use-inspector-page';
import { InspectorView } from './components/inspector-view';
import { BrowserPanel } from './components/browser-panel';
import { TOP_LEVEL_TABS, BROWSER_TAB_ID } from './constants';
import type { InspectorTopTab } from './types';

export function InspectorPage() {
  const page = useInspectorPage();
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
            isConnected={page.isConnected}
            isConnecting={page.isConnecting}
            isResetting={page.isResetting}
            sidebarOpen={page.sidebarOpen}
            setSidebarOpen={page.setSidebarOpen}
            activeTab={page.activeTab}
            setActiveTab={page.setActiveTab}
            activeProxyPort={page.activeProxyPort}
            selectedLogId={page.selectedLogId}
            selectedLog={page.selectedLog}
            selectedNetwork={page.selectedNetwork}
            onSelectLog={page.handleSelectLog}
            onConnect={page.handleConnect}
            onDisconnect={page.handleDisconnect}
            onReset={page.handleReset}
          />
        </div>
      </div>
    </TabbedPageLayout>
  );
}

