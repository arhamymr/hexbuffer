'use client';

import * as React from 'react';

interface RepeaterTab {
  id: string;
  name: string;
  method: string;
  url: string;
  headers: string;
  body: string;
}

export function RepeaterPage() {
  const [tabs, setTabs] = React.useState<RepeaterTab[]>([
    { id: '1', name: 'Tab 1', method: 'GET', url: '', headers: '', body: '' }
  ]);
  const [activeTabId, setActiveTabId] = React.useState('1');

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  const handleAddTab = () => {
    const newTab: RepeaterTab = {
      id: Date.now().toString(),
      name: `Tab ${tabs.length + 1}`,
      method: 'GET',
      url: '',
      headers: '',
      body: '',
    };
    setTabs([...tabs, newTab]);
    setActiveTabId(newTab.id);
  };

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

  const updateTab = (tabId: string, updates: Partial<RepeaterTab>) => {
    setTabs(tabs.map((t) => (t.id === tabId ? { ...t, ...updates } : t)));
  };

  return (
    <div className="flex flex-col h-full border rounded-lg overflow-hidden bg-background">
      <div className="flex items-center gap-1 border-b px-2 py-1">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`flex items-center gap-1 px-2 py-1 text-xs rounded cursor-pointer ${
              tab.id === activeTabId ? 'bg-muted' : 'hover:bg-muted/50'
            }`}
          >
            <span onClick={() => handleSelectTab(tab.id)}>{tab.name}</span>
            {tabs.length > 1 && (
              <button
                onClick={() => handleRemoveTab(tab.id)}
                className="ml-1 hover:text-destructive"
              >
                ×
              </button>
            )}
          </div>
        ))}
        <button
          onClick={handleAddTab}
          className="px-2 py-1 text-xs hover:bg-muted/50 rounded"
        >
          + New
        </button>
      </div>

      <div className="flex items-center gap-2 border-b px-2 py-2">
        <select
          value={activeTab.method}
          onChange={(e) => updateTab(activeTab.id, { method: e.target.value })}
          className="px-2 py-1 border rounded text-sm"
        >
          <option>GET</option>
          <option>POST</option>
          <option>PUT</option>
          <option>DELETE</option>
          <option>PATCH</option>
        </select>
        <input
          type="text"
          value={activeTab.url}
          onChange={(e) => updateTab(activeTab.id, { url: e.target.value })}
          placeholder="Enter URL"
          className="flex-1 px-2 py-1 border rounded text-sm"
        />
        <button className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm">
          Send
        </button>
      </div>

      <div className="flex-1 grid grid-cols-2 gap-0 min-h-0">
        <div className="border-r flex flex-col">
          <div className="border-b px-2 py-1 text-xs font-medium">Headers</div>
          <textarea
            value={activeTab.headers}
            onChange={(e) => updateTab(activeTab.id, { headers: e.target.value })}
            placeholder="Content-Type: application/json"
            className="flex-1 p-2 resize-none text-sm font-mono"
          />
        </div>
        <div className="flex flex-col">
          <div className="border-b px-2 py-1 text-xs font-medium">Body</div>
          <textarea
            value={activeTab.body}
            onChange={(e) => updateTab(activeTab.id, { body: e.target.value })}
            placeholder="Request body"
            className="flex-1 p-2 resize-none text-sm font-mono"
          />
        </div>
      </div>

      <div className="flex-1 border-t">
        <div className="border-b px-2 py-1 text-xs font-medium">Response</div>
        <div className="p-4 text-sm text-muted-foreground">
          Response will appear here
        </div>
      </div>
    </div>
  );
}