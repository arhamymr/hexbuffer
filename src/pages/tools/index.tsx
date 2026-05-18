'use client';

import { TabsContent } from '@/components/ui/tabs';
import { DecoderTool } from './components/decoder';
import { HashTool } from './components/hash';
import { EncoderTool } from './components/encoder';
import { SubdomainTool } from './components/subdomain';
import { FuzzScannerTool } from './components/fuzz-scanner';
import { UtilsTool } from './components/utils';
import { TabbedPageLayout } from '@/pages/shared/tabbed-page-layout';
import { useToolsPage } from './hooks/use-tools-page';

export function ToolsPage() {
  const { tabs, activeTabId, setActiveTabId } = useToolsPage();

  return (
    <TabbedPageLayout tabs={tabs} activeTabId={activeTabId} onTabChange={setActiveTabId}>
      <div className="flex-1 overflow-auto">
        <TabsContent value="decoder" className="h-full m-0">
          <DecoderTool />
        </TabsContent>
        <TabsContent value="encoder" className="h-full m-0">
          <EncoderTool />
        </TabsContent>
        <TabsContent value="hash" className="h-full m-0">
          <HashTool />
        </TabsContent>
        <TabsContent value="subdomain" className="h-full m-0">
          <SubdomainTool />
        </TabsContent>
        <TabsContent value="fuzz" className="h-full m-0">
          <FuzzScannerTool />
        </TabsContent>
        <TabsContent value="utils" className="h-full m-0">
          <UtilsTool />
        </TabsContent>
      </div>
    </TabbedPageLayout>
  );
}
