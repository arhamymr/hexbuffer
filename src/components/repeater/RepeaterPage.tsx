'use client';

import * as React from 'react';
import { invoke } from '@tauri-apps/api/core';
import { X, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RequestEditor } from './RequestEditor';
import { ResponseViewer } from './ResponseViewer';
import {
  RepeaterTab,
  HttpRequest,
  HttpResponse,
  ViewMode,
  createNewTab,
  createTabWithRequest,
  parseRawRequest,
  HttpRequestTemplate,
} from './types';

interface RepeaterPageProps {
  initialRequest?: HttpRequestTemplate | null;
}

export function RepeaterPage({ initialRequest }: RepeaterPageProps) {
  const [tabs, setTabs] = React.useState<RepeaterTab[]>(
    initialRequest ? [createTabWithRequest(initialRequest)] : [createNewTab()]
  );
  const [activeTabId, setActiveTabId] = React.useState<string>(tabs[0].id);
  const [rawPasteDialogOpen, setRawPasteDialogOpen] = React.useState(false);
  const [rawPasteContent, setRawPasteContent] = React.useState('');
  const [requestViewMode, setRequestViewMode] = React.useState<ViewMode>('raw');
  const [responseViewMode, setResponseViewMode] = React.useState<ViewMode>('raw');

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'Enter') {
          e.preventDefault();
          sendRequest();
        } else if (e.key === 't' || e.key === 'T') {
          e.preventDefault();
          addNewTab();
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          navigateHistory(-1);
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          navigateHistory(1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab]);

  const addNewTab = () => {
    const newTab = createNewTab();
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTab.id);
  };

  const closeTab = (tabId: string) => {
    const tabIndex = tabs.findIndex((t) => t.id === tabId);
    const newTabs = tabs.filter((t) => t.id !== tabId);
    if (newTabs.length === 0) {
      const newTab = createNewTab();
      setTabs([newTab]);
      setActiveTabId(newTab.id);
    } else if (activeTabId === tabId) {
      const newActiveIndex = Math.min(tabIndex, newTabs.length - 1);
      setActiveTabId(newTabs[newActiveIndex].id);
    }
    setTabs(newTabs);
  };

  const sendRequest = async () => {
    if (!activeTab) return;

    const request = activeTab.request;
    if (!request.url) return;

    updateTab(activeTab.id, {
      isLoading: true,
      history: [...activeTab.history, request].slice(-200),
      historyIndex: activeTab.history.length,
    });

    try {
      const response = await invoke<HttpResponse>('send_http_request', { request });
      updateTab(activeTab.id, {
        response,
        isLoading: false,
      });
    } catch (error) {
      updateTab(activeTab.id, {
        response: {
          status: 0,
          status_text: 'Error',
          headers: {},
          body: String(error),
          time_ms: 0,
          final_url: request.url,
        },
        isLoading: false,
      });
    }
  };

  const updateTab = (tabId: string, updates: Partial<RepeaterTab>) => {
    setTabs((prev) =>
      prev.map((tab) =>
        tab.id === tabId ? { ...tab, ...updates } : tab
      )
    );
  };

  const updateRequest = (tabId: string, request: Partial<HttpRequest>) => {
    setTabs((prev) =>
      prev.map((tab) =>
        tab.id === tabId
          ? { ...tab, request: { ...tab.request, ...request } }
          : tab
      )
    );
  };

  const navigateHistory = (direction: number) => {
    if (!activeTab) return;
    const newIndex = activeTab.historyIndex + direction;
    if (newIndex >= 0 && newIndex < activeTab.history.length) {
      const historicalRequest = activeTab.history[newIndex];
      updateTab(activeTab.id, {
        request: historicalRequest,
        historyIndex: newIndex,
      });
    }
  };

  const handlePasteRaw = () => {
    const parsed = parseRawRequest(rawPasteContent);
    if (parsed) {
      updateRequest(activeTab.id, parsed);
    }
    setRawPasteDialogOpen(false);
    setRawPasteContent('');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold">Repeater</h1>
          {activeTab && activeTab.isLoading && (
            <Badge variant="secondary" className="animate-pulse">
              Sending...
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setRawPasteDialogOpen(true)}>
            Paste Raw
          </Button>
          <Button variant="outline" size="sm" onClick={addNewTab}>
            <Plus className="h-4 w-4 mr-1" />
            New Tab
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-1 mb-4 border-b pb-2">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`group flex items-center gap-1 px-3 py-1.5 rounded-md cursor-pointer ${
              activeTabId === tab.id
                ? 'bg-muted border border-input'
                : 'hover:bg-muted/50'
            }`}
            onClick={() => setActiveTabId(tab.id)}
          >
            <span className="text-sm font-medium truncate max-w-[120px]">
              {tab.name}
            </span>
            {tabs.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        ))}
      </div>

      {activeTab && (
        <div className="flex-1 grid grid-cols-2 gap-4 min-h-0">
          <div className="flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => navigateHistory(-1)}
                  disabled={activeTab.historyIndex <= 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => navigateHistory(1)}
                  disabled={
                    activeTab.historyIndex >= activeTab.history.length - 1 ||
                    activeTab.history.length === 0
                  }
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex gap-1">
                {(['raw', 'pretty', 'hex', 'params'] as ViewMode[]).map((mode) => (
                  <Button
                    key={mode}
                    variant={requestViewMode === mode ? 'secondary' : 'ghost'}
                    size="sm"
                    className="text-xs"
                    onClick={() => setRequestViewMode(mode)}
                  >
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex-1 min-h-0 border rounded-lg overflow-hidden">
              <RequestEditor
                request={activeTab.request}
                viewMode={requestViewMode}
                onChange={(request) => updateRequest(activeTab.id, request)}
              />
            </div>
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-2">
                <label className="text-sm text-muted-foreground">
                  Follow Redirects:
                </label>
                <input
                  type="checkbox"
                  checked={activeTab.request.follow_redirects}
                  onChange={(e) =>
                    updateRequest(activeTab.id, {
                      follow_redirects: e.target.checked,
                    })
                  }
                />
              </div>
              <Button onClick={sendRequest} disabled={activeTab.isLoading}>
                {activeTab.isLoading ? 'Sending...' : 'Send'}
              </Button>
            </div>
          </div>

          <div className="flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-2">
              {activeTab.response && (
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      activeTab.response.status >= 200 && activeTab.response.status < 300
                        ? 'default'
                        : activeTab.response.status >= 400
                        ? 'destructive'
                        : 'secondary'
                    }
                  >
                    {activeTab.response.status} {activeTab.response.status_text}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {activeTab.response.body.length} bytes
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {activeTab.response.time_ms}ms
                  </span>
                </div>
              )}
              <div className="flex gap-1">
                {(['raw', 'pretty', 'hex', 'render'] as ViewMode[]).map((mode) => (
                  <Button
                    key={mode}
                    variant={responseViewMode === mode ? 'secondary' : 'ghost'}
                    size="sm"
                    className="text-xs"
                    onClick={() => setResponseViewMode(mode)}
                  >
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex-1 min-h-0 border rounded-lg overflow-hidden">
              <ResponseViewer
                response={activeTab.response}
                viewMode={responseViewMode}
                isLoading={activeTab.isLoading}
              />
            </div>
          </div>
        </div>
      )}

      <Dialog open={rawPasteDialogOpen} onOpenChange={setRawPasteDialogOpen}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>Paste Raw HTTP Request</DialogTitle>
            <DialogDescription>
              Paste a raw HTTP request to parse it into the editor
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="raw-request">Raw Request</Label>
              <textarea
                id="raw-request"
                className="flex min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                placeholder="GET /path HTTP/1.1&#10;Host: example.com&#10;&#10;"
                value={rawPasteContent}
                onChange={(e) => setRawPasteContent(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRawPasteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handlePasteRaw} disabled={!rawPasteContent.trim()}>
              Parse & Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}