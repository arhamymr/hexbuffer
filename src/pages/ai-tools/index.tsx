'use client';

import * as React from 'react';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { TabBar } from './components/tab-bar';
import { PromptInjectionTool } from './components/prompt-injection';

const AI_TOOLS_TABS = [
  { id: 'prompt-injection', name: 'Prompt Injection' },
  { id: 'jailbreak', name: 'Jailbreak', disabled: true },
  { id: 'prompt-leak', name: 'Prompt Leak', disabled: true },
];

export function AIToolsPage() {
  const [activeTab, setActiveTab] = React.useState('prompt-injection');

  return (
    <div className="flex flex-col h-[calc(100vh-8.5rem)]">
      <div className='mb-2 border-b border-green-500'>
        <TabBar tabs={AI_TOOLS_TABS} activeTabId={activeTab} onTabChange={setActiveTab} />
      </div>

      <div className="flex-1 border rounded-md overflow-hidden bg-background min-h-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
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
        </Tabs>
      </div>
    </div>
  );
}