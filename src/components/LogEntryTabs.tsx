'use client';

import { useState } from 'react';
import type { ProxyLogEntry } from '@/stores/trafficStore';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LogEntryDetails } from './LogEntryDetails';
import { LogEntryHeaders } from './LogEntryHeaders';
import { LogEntryBody } from './LogEntryBody';
import { LogEntryCookies } from './LogEntryCookies';
import { LogEntryCurl } from './LogEntryCurl';

type TabValue = 'details' | 'headers' | 'body' | 'cookies' | 'curl';

interface LogEntryTabsProps {
  proxyData: ProxyLogEntry;
}

export function LogEntryTabs({ proxyData }: LogEntryTabsProps) {
  const [activeTab, setActiveTab] = useState<TabValue>('details');

  return (
    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
      <TabsList className="mb-2">
        <TabsTrigger value="details">Details</TabsTrigger>
        <TabsTrigger value="headers">Headers</TabsTrigger>
        <TabsTrigger value="body">Body</TabsTrigger>
        <TabsTrigger value="cookies">Cookies</TabsTrigger>
        <TabsTrigger value="curl">cURL</TabsTrigger>
      </TabsList>

      {activeTab === 'details' && <LogEntryDetails proxyData={proxyData} />}
      {activeTab === 'headers' && <LogEntryHeaders proxyData={proxyData} />}
      {activeTab === 'body' && <LogEntryBody proxyData={proxyData} />}
      {activeTab === 'cookies' && <LogEntryCookies proxyData={proxyData} />}
      {activeTab === 'curl' && <LogEntryCurl proxyData={proxyData} />}
    </Tabs>
  );
}
