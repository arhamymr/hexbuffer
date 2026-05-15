'use client';

import * as React from 'react';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { TabBar } from './components/tab-bar';
import { DecoderTool } from './components/decoder';
import { HashTool } from './components/hash';
import { EncoderTool } from './components/encoder';
import { SubdomainTool } from './components/subdomain';
import { FuzzScannerTool } from './components/fuzz-scanner';
import { UtilsTool } from './components/utils';

const TOOLS_TABS = [
  { id: 'decoder', name: 'Decoder' },
  { id: 'encoder', name: 'Encoder' },
  { id: 'hash', name: 'Hash' },
  { id: 'subdomain', name: 'Subdomain' },
  { id: 'fuzz', name: 'Fuzz Scanner' },
  { id: 'utils', name: 'Others' },
];

export function ToolsPage() {
  const [activeTab, setActiveTab] = React.useState('decoder');

  return (
    <div>
      <div className='mb-2 border-b border-green-500'>
 <TabBar tabs={TOOLS_TABS} activeTabId={activeTab} onTabChange={setActiveTab} />

      </div>
     
      <div className="flex flex-col h-full border rounded-md overflow-hidden bg-background">
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          
          <div className="flex-1 overflow-auto">
            <TabsContent value="decoder" className="h-full m-0"><DecoderTool /></TabsContent>
            <TabsContent value="encoder" className="h-full m-0"><EncoderTool /></TabsContent>
            <TabsContent value="hash" className="h-full m-0"><HashTool /></TabsContent>
            <TabsContent value="subdomain" className="h-full m-0"><SubdomainTool /></TabsContent>
            <TabsContent value="fuzz" className="h-full m-0"><FuzzScannerTool /></TabsContent>
            <TabsContent value="utils" className="h-full m-0"><UtilsTool /></TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
    </div>
    
  );
}