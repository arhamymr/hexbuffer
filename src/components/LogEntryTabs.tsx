'use client';

import { useState } from 'react';
import type { ApiCall } from '@/types';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LogEntryDetails } from './LogEntryDetails';
import { LogEntryHeaders } from './LogEntryHeaders';
import { LogEntryBody } from './LogEntryBody';
import { LogEntryCookies } from './LogEntryCookies';
import { LogEntryCurl } from './LogEntryCurl';

type TabValue = 'details' | 'headers' | 'body' | 'cookies' | 'curl';

interface LogEntryTabsProps {
  call: ApiCall;
}

export function LogEntryTabs({ call }: LogEntryTabsProps) {
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

      {activeTab === 'details' && <LogEntryDetails call={call} />}
      {activeTab === 'headers' && <LogEntryHeaders call={call} />}
      {activeTab === 'body' && <LogEntryBody call={call} />}
      {activeTab === 'cookies' && <LogEntryCookies call={call} />}
      {activeTab === 'curl' && <LogEntryCurl call={call} />}
    </Tabs>
  );
}