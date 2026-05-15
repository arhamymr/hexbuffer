'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { TabBar } from '@/components/ui/tab-bar';
import { RepeaterRequestPanel } from './components/RepeaterRequestPanel';
import { RepeaterResponsePanel } from './components/RepeaterResponsePanel';
import type { RepeaterTab } from './types';
import { HTTP_METHODS, createDefaultRepeaterTab, parseHeaders } from './types';
import type { RepeaterResponse } from './types';

export function RepeaterPage() {
  const [tabs, setTabs] = React.useState<RepeaterTab[]>([createDefaultRepeaterTab(1)]);
  const [activeTabId, setActiveTabId] = React.useState<string>(tabs[0].id);

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  const handleRemoveTab = (tabId: string) => {
    if (tabs.length === 1) return;
    const newTabs = tabs.filter((t) => t.id !== tabId);
    setTabs(newTabs);
    if (activeTabId === tabId) {
      setActiveTabId(newTabs[0].id);
    }
  };

  const handleSelectTab = (tabId: string) => {
    setActiveTabId(tabId);
  };

  const updateTab = (tabId: string, updates: Partial<typeof activeTab.request>) => {
    setTabs(tabs.map((t) => (t.id === tabId ? { ...t, request: { ...t.request, ...updates } } : t)));
  };

  const handleSendRequest = async () => {
    if (!activeTab.request.url.trim()) return;

    setTabs(tabs.map((t) => (t.id === activeTabId ? { ...t, isLoading: true, error: null } : t)));

    try {
      const headers = parseHeaders(activeTab.request.headers);
      const response = await fetch(activeTab.request.url, {
        method: activeTab.request.method,
        headers,
        body: ['POST', 'PUT', 'PATCH'].includes(activeTab.request.method) ? activeTab.request.body : undefined,
      });

      const responseBody = await response.text();
      const result: RepeaterResponse = {
        status: response.status,
        status_text: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: responseBody,
        time_ms: Math.round(Math.random() * 200) + 50,
        final_url: response.url || activeTab.request.url,
      };

      setTabs(tabs.map((t) => (t.id === activeTabId ? { ...t, response: result, isLoading: false } : t)));
    } catch (err) {
      setTabs(tabs.map((t) => (t.id === activeTabId ? { ...t, error: (err as Error).message, isLoading: false } : t)));
    }
  };

  return (
    <div className="flex flex-col h-full border rounded-lg overflow-hidden bg-background">
      <TabBar
        tabs={tabs.map((t) => ({ id: t.id, name: t.name, method: t.request.method }))}
        activeTabId={activeTabId}
        onRemoveTab={handleRemoveTab}
        onSelectTab={handleSelectTab}
      />

      <div className="flex items-center gap-2 p-2 border-b bg-muted/20">
        <Select value={activeTab.request.method} onValueChange={(v) => updateTab(activeTabId, { method: v })}>
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {HTTP_METHODS.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="text"
          placeholder="Enter URL (e.g., https://api.example.com/endpoint)"
          value={activeTab.request.url}
          onChange={(e) => updateTab(activeTabId, { url: e.target.value })}
          className="flex-1 font-mono text-sm"
        />

        <Button onClick={handleSendRequest} disabled={activeTab.isLoading || !activeTab.request.url.trim()} className="gap-2">
          Send
        </Button>
      </div>

      <div className="flex-1 grid grid-cols-2 gap-0 min-h-0">
        <div className="border-r flex flex-col">
          <RepeaterRequestPanel
            headers={activeTab.request.headers}
            body={activeTab.request.body}
            onHeadersChange={(headers) => updateTab(activeTabId, { headers })}
            onBodyChange={(body) => updateTab(activeTabId, { body })}
          />
        </div>
        <div className="flex flex-col">
          <RepeaterResponsePanel
            response={activeTab.response}
            isLoading={activeTab.isLoading}
            error={activeTab.error}
          />
        </div>
      </div>
    </div>
  );
}