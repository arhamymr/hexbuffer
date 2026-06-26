import React, { useState, useEffect } from 'react';
import { useApiCollectionStore } from '@/stores/api-collection';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TextEditor } from '@/components/ui/text-editor';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trash2, Plus, Play, Save, CheckCircle, XCircle } from 'lucide-react';
import type { KeyValuePair } from '../types';

interface ForgePanelProps {
  onSend: () => void;
  onSave: () => void;
}

export function ForgePanel({ onSend, onSave }: ForgePanelProps) {
  const store = useApiCollectionStore();
  const req = store.activeRequest;

  const [activeReqTab, setActiveReqTab] = useState('params');
  const [activeResTab, setActiveResTab] = useState('pretty');

  // 1. Synchronize URL query params
  const getQueryParams = (): KeyValuePair[] => {
    try {
      const urlObj = new URL(req.url);
      const params: KeyValuePair[] = [];
      urlObj.searchParams.forEach((value, key) => {
        params.push({ key, value, enabled: true });
      });
      return params;
    } catch {
      return [];
    }
  };

  const [queryParams, setQueryParams] = useState<KeyValuePair[]>(getQueryParams());

  useEffect(() => {
    setQueryParams(getQueryParams());
  }, [req.url]);

  const handleQueryParamChange = (index: number, field: 'key' | 'value', value: string) => {
    const updated = [...queryParams];
    updated[index][field] = value;
    setQueryParams(updated);
    rebuildUrl(updated);
  };

  const handleQueryParamToggle = (index: number) => {
    const updated = [...queryParams];
    updated[index].enabled = !updated[index].enabled;
    setQueryParams(updated);
    rebuildUrl(updated);
  };

  const handleAddQueryParam = () => {
    const updated = [...queryParams, { key: '', value: '', enabled: true }];
    setQueryParams(updated);
  };

  const handleRemoveQueryParam = (index: number) => {
    const updated = queryParams.filter((_, i) => i !== index);
    setQueryParams(updated);
    rebuildUrl(updated);
  };

  const rebuildUrl = (params: KeyValuePair[]) => {
    try {
      let baseUrl = req.url.split('?')[0];
      const activeParams = params.filter((p) => p.enabled && p.key);
      if (activeParams.length > 0) {
        const query = activeParams
          .map((p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
          .join('&');
        baseUrl = `${baseUrl}?${query}`;
      }
      store.updateActiveRequest(() => ({ url: baseUrl }));
    } catch {}
  };

  // 2. Header Manager
  const handleHeaderChange = (index: number, field: 'key' | 'value', value: string) => {
    const updated = [...req.headers];
    updated[index][field] = value;
    store.updateActiveRequest(() => ({ headers: updated }));
  };

  const handleHeaderToggle = (index: number) => {
    const updated = [...req.headers];
    updated[index].enabled = !updated[index].enabled;
    store.updateActiveRequest(() => ({ headers: updated }));
  };

  const handleAddHeader = () => {
    const updated = [...req.headers, { key: '', value: '', enabled: true }];
    store.updateActiveRequest(() => ({ headers: updated }));
  };

  const handleRemoveHeader = (index: number) => {
    const updated = req.headers.filter((_, i) => i !== index);
    store.updateActiveRequest(() => ({ headers: updated }));
  };

  // Helper to format responses
  const getFormattedBody = (): string => {
    if (!req.response) return '';
    try {
      const obj = JSON.parse(req.response.body);
      return JSON.stringify(obj, null, 2);
    } catch {
      return req.response.body;
    }
  };

  const activeEndpoint = store.stashEndpoints.find((e) => e.id === store.activeEndpointId);

  return (
    <div className="flex flex-col h-full min-h-0 space-y-4 p-4">
      {/* Request Target Row */}
      <div className="flex space-x-2 shrink-0">
        <Select
          value={req.method}
          onValueChange={(val) => store.updateActiveRequest(() => ({ method: val }))}
        >
          <SelectTrigger className="w-28 font-semibold">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'].map((m) => (
              <SelectItem key={m} value={m} className="font-semibold">
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          placeholder="Enter request URL (e.g. https://api.example.com/v1/users)"
          className="flex-1 font-mono text-sm"
          value={req.url}
          onChange={(e) => store.updateActiveRequest(() => ({ url: e.target.value }))}
        />

        <Button onClick={onSend} disabled={req.isLoading}>
          <Play className="h-4 w-4 mr-2" /> Send
        </Button>

        <Button variant="outline" onClick={onSave} title="Save changes to Collection">
          <Save className="h-4 w-4 mr-2" /> Save
        </Button>
      </div>

      {activeEndpoint && (
        <div className="text-[10px] text-muted-foreground font-mono shrink-0 px-1">
          Editing request: <span className="font-semibold text-foreground">{activeEndpoint.name}</span>
        </div>
      )}

      {/* Main Panel splitting Request Builder / Response viewer */}
      <div className="flex-1 min-h-0 grid grid-rows-2 gap-4">
        {/* Request Details Tab Area */}
        <div className="border rounded-lg p-2 bg-background/50 flex flex-col min-h-0">
          <Tabs value={activeReqTab} onValueChange={setActiveReqTab} className="flex-1 flex flex-col min-h-0">
            <TabsList className="shrink-0 justify-start w-full border-b bg-transparent h-auto p-0 space-x-2">
              {['params', 'headers', 'body', 'scripts'].map((t) => (
                <TabsTrigger
                  key={t}
                  value={t}
                  className="bg-transparent border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none px-4 py-2 capitalize text-xs"
                >
                  {t}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Params tab */}
            <TabsContent value="params" className="flex-1 min-h-0 mt-2">
              <ScrollArea className="h-full">
                <div className="space-y-2">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Query Parameters</span>
                    <Button variant="ghost" size="sm" className="h-7 px-2" onClick={handleAddQueryParam}>
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add Parameter
                    </Button>
                  </div>
                  {queryParams.map((p, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={p.enabled}
                        onChange={() => handleQueryParamToggle(index)}
                        className="rounded border-muted shrink-0"
                      />
                      <Input
                        placeholder="Parameter Name"
                        className="h-8 font-mono text-xs"
                        value={p.key}
                        onChange={(e) => handleQueryParamChange(index, 'key', e.target.value)}
                      />
                      <Input
                        placeholder="Value"
                        className="h-8 font-mono text-xs"
                        value={p.value}
                        onChange={(e) => handleQueryParamChange(index, 'value', e.target.value)}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                        onClick={() => handleRemoveQueryParam(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {queryParams.length === 0 && (
                    <div className="text-center text-xs text-muted-foreground py-8">
                      No URL query parameters. Add parameter above to configure.
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Headers tab */}
            <TabsContent value="headers" className="flex-1 min-h-0 mt-2">
              <ScrollArea className="h-full">
                <div className="space-y-2">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Headers</span>
                    <Button variant="ghost" size="sm" className="h-7 px-2" onClick={handleAddHeader}>
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add Header
                    </Button>
                  </div>
                  {req.headers.map((h, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={h.enabled}
                        onChange={() => handleHeaderToggle(index)}
                        className="rounded border-muted shrink-0"
                      />
                      <Input
                        placeholder="Header Name"
                        className="h-8 font-mono text-xs"
                        value={h.key}
                        onChange={(e) => handleHeaderChange(index, 'key', e.target.value)}
                      />
                      <Input
                        placeholder="Value"
                        className="h-8 font-mono text-xs"
                        value={h.value}
                        onChange={(e) => handleHeaderChange(index, 'value', e.target.value)}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                        onClick={() => handleRemoveHeader(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {req.headers.length === 0 && (
                    <div className="text-center text-xs text-muted-foreground py-8">
                      No custom headers.
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Body tab */}
            <TabsContent value="body" className="flex-1 min-h-0 mt-2 flex flex-col">
              <div className="flex items-center space-x-4 mb-2 shrink-0">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Body Format:</span>
                <div className="flex space-x-3 text-xs">
                  {['none', 'raw', 'json'].map((t) => (
                    <label key={t} className="flex items-center space-x-1 cursor-pointer font-medium">
                      <input
                        type="radio"
                        checked={req.bodyType === t}
                        onChange={() => store.updateActiveRequest(() => ({ bodyType: t as any }))}
                        className="text-primary focus:ring-primary"
                      />
                      <span className="capitalize">{t}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              <div className="flex-1 min-h-0 border rounded-md overflow-hidden bg-background">
                {req.bodyType === 'none' ? (
                  <div className="h-full flex items-center justify-center text-xs text-muted-foreground font-medium">
                    This request does not have a body payload.
                  </div>
                ) : (
                  <TextEditor
                    value={req.body}
                    onChange={(val) => store.updateActiveRequest(() => ({ body: val || '' }))}
                  />
                )}
              </div>
            </TabsContent>

            {/* Scripts tab */}
            <TabsContent value="scripts" className="flex-1 min-h-0 mt-2 flex flex-col space-y-4">
              <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
                {/* Pre request script */}
                <div className="flex flex-col min-h-0 space-y-1">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">Pre-Request Script</Label>
                  <div className="flex-1 min-h-0 border rounded-md overflow-hidden bg-background">
                    <TextEditor
                      value={req.preScript}
                      onChange={(val) => store.updateActiveRequest(() => ({ preScript: val || '' }))}
                    />
                  </div>
                </div>
                {/* Test script */}
                <div className="flex flex-col min-h-0 space-y-1">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">Test / Assertion Script</Label>
                  <div className="flex-1 min-h-0 border rounded-md overflow-hidden bg-background">
                    <TextEditor
                      value={req.testScript}
                      onChange={(val) => store.updateActiveRequest(() => ({ testScript: val || '' }))}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Response View Area */}
        <div className="border rounded-lg p-2 bg-background/50 flex flex-col min-h-0">
          {req.isLoading ? (
            <div className="h-full flex flex-col items-center justify-center space-y-2">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span className="text-xs font-medium text-muted-foreground">Executing endpoint request...</span>
            </div>
          ) : req.error ? (
            <div className="h-full flex flex-col items-center justify-center p-4 text-center">
              <XCircle className="h-8 w-8 text-destructive mb-2" />
              <span className="text-sm font-semibold text-destructive">Execution Failed</span>
              <span className="text-xs text-muted-foreground max-w-md mt-1 font-mono bg-destructive/10 p-2 rounded border border-destructive/20">{req.error}</span>
            </div>
          ) : req.response ? (
            <div className="h-full flex flex-col min-h-0">
              {/* Response Status Bar */}
              <div className="flex items-center space-x-4 border-b pb-2 shrink-0 text-xs">
                <div className="flex items-center space-x-1.5">
                  <span className="text-muted-foreground uppercase font-bold">Status:</span>
                  <span
                    className={`font-semibold px-1 rounded ${
                      req.response.status >= 200 && req.response.status < 300
                        ? 'bg-emerald-500/10 text-emerald-600'
                        : 'bg-destructive/10 text-destructive'
                    }`}
                  >
                    {req.response.status} {req.response.statusText}
                  </span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="text-muted-foreground uppercase font-bold">Time:</span>
                  <span className="font-semibold text-foreground">{req.response.timeMs} ms</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="text-muted-foreground uppercase font-bold">Size:</span>
                  <span className="font-semibold text-foreground">
                    {new Blob([req.response.body]).size} bytes
                  </span>
                </div>
              </div>

              {/* Response body & details tab */}
              <Tabs value={activeResTab} onValueChange={setActiveResTab} className="flex-1 flex flex-col min-h-0 mt-2">
                <TabsList className="shrink-0 justify-start w-full border-b bg-transparent h-auto p-0 space-x-2">
                  {['pretty', 'raw', 'headers', 'testResults'].map((t) => (
                    <TabsTrigger
                      key={t}
                      value={t}
                      className="bg-transparent border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none px-4 py-2 capitalize text-xs"
                    >
                      {t === 'testResults' ? 'Test Results' : t}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {/* Pretty (Formatted JSON) */}
                <TabsContent value="pretty" className="flex-1 min-h-0 mt-2">
                  <div className="h-full border rounded-md overflow-hidden bg-background">
                    <TextEditor value={getFormattedBody()} options={{ readOnly: true }} />
                  </div>
                </TabsContent>

                {/* Raw Body */}
                <TabsContent value="raw" className="flex-1 min-h-0 mt-2">
                  <div className="h-full border rounded-md overflow-hidden bg-background">
                    <TextEditor value={req.response.body} options={{ readOnly: true }} />
                  </div>
                </TabsContent>

                {/* Headers */}
                <TabsContent value="headers" className="flex-1 min-h-0 mt-2">
                  <ScrollArea className="h-full">
                    <div className="space-y-1 text-xs font-mono">
                      {Object.entries(req.response.headers).map(([key, value]) => (
                        <div key={key} className="flex border-b py-1">
                          <span className="w-1/3 text-muted-foreground font-semibold truncate pr-2">{key}</span>
                          <span className="w-2/3 text-foreground break-all">{value}</span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>

                {/* Test Results */}
                <TabsContent value="testResults" className="flex-1 min-h-0 mt-2">
                  <ScrollArea className="h-full">
                    <div className="space-y-2 pr-2">
                      {req.testResults.map((tr, index) => (
                        <div
                          key={index}
                          className={`p-2 border rounded-md flex items-center justify-between text-xs ${
                            tr.passed ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-destructive/5 border-destructive/20'
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            {tr.passed ? (
                              <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                            ) : (
                              <XCircle className="h-4 w-4 text-destructive shrink-0" />
                            )}
                            <span className="font-semibold">{tr.name}</span>
                          </div>
                          {!tr.passed && tr.message && (
                            <span className="text-[10px] text-destructive font-mono">{tr.message}</span>
                          )}
                        </div>
                      ))}
                      {req.testScript && req.testResults.length === 0 && (
                        <div className="text-center text-xs text-muted-foreground py-8">
                          Scripts did not output any assertion checks. Use `pm.test` inside scripts to register assertions.
                        </div>
                      )}
                      {!req.testScript && (
                        <div className="text-center text-xs text-muted-foreground py-8">
                          No test scripts defined for this request.
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-4">
              <span className="text-sm font-medium text-muted-foreground">
                No response received yet.
              </span>
              <span className="text-xs text-muted-foreground/60 max-w-[200px] mt-1">
                Enter target URL and click Send to execute the endpoint.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
