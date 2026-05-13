'use client';

import * as React from 'react';
import { useRepeaterStore } from '@/stores/repeaterStore';
import { useSendRequest } from './hooks';
import { RepeaterTabBar } from './components/RepeaterTabBar';
import { RepeaterUrlBar } from './components/RepeaterUrlBar';
import { RepeaterRequestPanel } from './components/RepeaterRequestPanel';
import { RepeaterResponsePanel } from './components/RepeaterResponsePanel';

export function RepeaterPage() {
  const { tabs, activeTabId, addTab, removeTab, setActiveTab, updateRequest } = useRepeaterStore();
  const { sendRequest } = useSendRequest();

  const activeTab = tabs.find((t) => t.id === activeTabId);

  React.useEffect(() => {
    if (tabs.length === 0) {
      addTab();
    }
  }, []);

  const handleAddTab = () => {
    addTab();
  };

  const handleRemoveTab = (tabId: string) => {
    removeTab(tabId);
  };

  const handleSelectTab = (tabId: string) => {
    setActiveTab(tabId);
  };

  const handleSend = () => {
    if (activeTabId) {
      sendRequest(activeTabId);
    }
  };

  if (!activeTab) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-muted-foreground">
          <p>No tab selected</p>
          <button
            onClick={handleAddTab}
            className="mt-2 text-primary hover:underline"
          >
            Create a new tab
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full border rounded-lg overflow-hidden bg-background">
      <RepeaterTabBar
        tabs={tabs}
        activeTabId={activeTabId}
        onAddTab={handleAddTab}
        onRemoveTab={handleRemoveTab}
        onSelectTab={handleSelectTab}
      />

      <RepeaterUrlBar
        method={activeTab.request.method}
        url={activeTab.request.url}
        isLoading={activeTab.isLoading}
        onMethodChange={(method) =>
          updateRequest(activeTab.id, { method })
        }
        onUrlChange={(url) =>
          updateRequest(activeTab.id, { url })
        }
        onSend={handleSend}
      />

      <div className="flex-1 grid grid-cols-2 gap-0 min-h-0">
        <div className="border-r overflow-hidden">
          <RepeaterRequestPanel
            headers={activeTab.request.headers}
            body={activeTab.request.body}
            onHeadersChange={(headers) =>
              updateRequest(activeTab.id, { headers })
            }
            onBodyChange={(body) =>
              updateRequest(activeTab.id, { body })
            }
          />
        </div>

        <div className="overflow-hidden">
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