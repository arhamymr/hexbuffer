'use client';

import { TabsContent } from '@/components/ui/tabs';
import { HashTool } from './components/hash';
import { EncoderDecoderTool } from './components/encoder';
import { SubdomainTool } from './components/subdomain';
import { PortScannerTool } from './components/port-scanner';
import { FuzzScannerTool } from './components/fuzz-scanner';
import { UtilsTool } from './components/utils';
import { SqlInjectionTool } from './components/sql-injection';
import { TabbedPageLayout } from '@/components/tabs-layout/tabbed-page-layout';
import { useToolsPage } from './hooks/use-tools-page';

export function ToolsPage() {
  const { tabs, activeTabId, setActiveTabId } = useToolsPage();

  return (
    <TabbedPageLayout tabs={tabs} activeTabId={activeTabId} onTabChange={setActiveTabId}>
      <div className="flex-1 overflow-auto">
        <TabsContent value="codec" className="h-full m-0">
          <EncoderDecoderTool />
        </TabsContent>
        <TabsContent value="hash" className="h-full m-0">
          <HashTool />
        </TabsContent>
        <TabsContent value="subdomain" className="h-full m-0">
          <SubdomainTool />
        </TabsContent>
        <TabsContent value="ports" className="h-full m-0">
          <PortScannerTool />
        </TabsContent>
        <TabsContent value="fuzz" className="h-full m-0">
          <FuzzScannerTool />
        </TabsContent>
        <TabsContent value="sqli" className="h-full m-0">
          <SqlInjectionTool />
        </TabsContent>
        <TabsContent value="utils" className="h-full m-0">
          <UtilsTool />
        </TabsContent>
      </div>
    </TabbedPageLayout>
  );
}
