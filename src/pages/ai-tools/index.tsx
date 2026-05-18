'use client';

import { TabsContent } from '@/components/ui/tabs';
import { PromptInjectionTool } from './components/prompt-injection';
import { TabbedPageLayout } from '@/pages/shared/tabbed-page-layout';
import { useAIToolsPage } from './hooks/use-ai-tools-page';

export function AIToolsPage() {
  const { tabs, activeTabId, setActiveTabId } = useAIToolsPage();

  return (
    <TabbedPageLayout
      tabs={tabs}
      activeTabId={activeTabId}
      onTabChange={setActiveTabId}
      className="flex flex-col h-[calc(100vh-8.5rem)]"
    >
      <TabsContent value="prompt-injection" className="h-full m-0">
        <PromptInjectionTool />
      </TabsContent>
      <TabsContent value="jailbreak" className="h-full m-0">
        <div className="flex items-center justify-center h-full text-muted-foreground">
          <p>Jailbreak tool coming soon...</p>
        </div>
      </TabsContent>
      <TabsContent value="prompt-leak" className="h-full m-0">
        <div className="flex items-center justify-center h-full text-muted-foreground">
          <p>Prompt Leak tool coming soon...</p>
        </div>
      </TabsContent>
    </TabbedPageLayout>
  );
}
