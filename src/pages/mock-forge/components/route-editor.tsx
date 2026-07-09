import { useState } from 'react';
import {
  TrashIcon,
  PencilSimpleIcon,
  ArrowSquareOutIcon,
  FloppyDiskIcon,
  CopyIcon,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TextEditor } from '@/components/ui/text-editor';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { HTTP_METHODS } from '../constants';
import type { MockDomain, MockRoute } from '../types';
import { useRouteEditor } from './hooks/use-routes-panel';
import { PlusIcon } from '@phosphor-icons/react';

const METHOD_COLORS: Record<string, string> = {
  GET: 'text-green-500 font-bold',
  POST: 'text-blue-500 font-bold',
  PUT: 'text-yellow-500 font-bold',
  DELETE: 'text-red-500 font-bold',
  PATCH: 'text-orange-500 font-bold',
  OPTIONS: 'text-purple-500 font-bold',
};

interface RouteEditorProps {
  route: MockRoute;
  domains: MockDomain[];
  onUpdate: (id: string, patch: Partial<MockRoute>) => void;
  onDelete: (id: string) => void;
  onAdd: (route: Omit<MockRoute, 'id'>) => void;
}

export function RouteEditor({ route, domains, onUpdate, onDelete, onAdd }: RouteEditorProps) {
  const {
    body, setBody,
    reqBody, setReqBody,
    activeTab, setActiveTab,
    isWriteMethod,
    queryParams,
    saveBody,
    saveReqBody,
    handleClone,
    handleAddParam,
    handleRemoveParam,
    handleParamChange,
    handleParamToggle,
    handleSendToRepeater,
  } = useRouteEditor(route, domains, onUpdate, onAdd);

  const [editingHeader, setEditingHeader] = useState(false);
  const [statusCodeStr, setStatusCodeStr] = useState(String(route.statusCode));
  const [editMethod, setEditMethod] = useState<MockRoute['method']>(route.method);
  const [editPath, setEditPath] = useState(route.path);

  const handleSaveHeader = () => {
    if (!editPath.trim()) return;
    onUpdate(route.id, { method: editMethod, path: editPath.trim() });
    toast.success('Route updated.');
    setEditingHeader(false);
  };
  const handleCancelHeader = () => {
    setEditMethod(route.method);
    setEditPath(route.path);
    setEditingHeader(false);
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      {/* Route header */}
      <div className="flex flex-col border-b bg-muted/10 shrink-0">
        {editingHeader ? (
          <div className="flex items-center gap-2 p-2">
            <Select value={editMethod} onValueChange={(v) => setEditMethod(v as MockRoute['method'])}>
              <SelectTrigger className="h-7 w-24 text-xs bg-muted/40 border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HTTP_METHODS.map((m) => (
                  <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={editPath}
              onChange={(e) => setEditPath(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSaveHeader(); if (e.key === 'Escape') handleCancelHeader(); }}
              className="h-7 flex-1 font-mono text-xs bg-muted/40 focus-visible:ring-primary focus-visible:ring-1"
              autoFocus
            />
            <Button size="sm" className="h-7 px-2 text-xs" onClick={handleSaveHeader}>Save</Button>
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={handleCancelHeader}>Cancel</Button>
          </div>
        ) : (
          <div className="flex items-center gap-3 p-2">
            <span className={`text-xs ${METHOD_COLORS[route.method] ?? ''}`}>{route.method}</span>
            <span className="font-mono text-xs">{route.path}</span>
            <button
              onClick={() => setEditingHeader(true)}
              className="ml-0.5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Edit method & path"
            >
              <PencilSimpleIcon className="h-3 w-3" />
            </button>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground">HTTP {route.statusCode}</span>
              <Button variant="outline" size="sm" className="h-7 px-2 text-xs cursor-pointer border-border" onClick={handleSendToRepeater}>
                <ArrowSquareOutIcon className="mr-1 h-3.5 w-3.5" />
                To Repeater
              </Button>
              <Button variant="outline" size="sm" className="h-7 px-2 text-xs cursor-pointer border-border" onClick={handleClone} title="Clone this route">
                <CopyIcon className="mr-1 h-3.5 w-3.5" />
                Clone
              </Button>
              <Button variant="destructive" size="icon" className="cursor-pointer rounded" onClick={() => onDelete(route.id)}>
                <TrashIcon className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="px-2 pt-2 bg-muted/5">
        <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as 'config' | 'response')}>
          <TabsList>
            <TabsTrigger value="config">Configuration</TabsTrigger>
            <TabsTrigger value="response">Response</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 w-full">
          {activeTab === 'config' ? (
            <div className="space-y-2">
              {/* General Route Config */}
              <div className="space-y-4 rounded-md border border-border p-2 bg-muted">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider pb-1">Route Config</h4>
                <div className="flex gap-4">
                  <div className="space-y-1.5 w-20">
                    <Label className="text-xs text-muted-foreground">Status Code</Label>
                    <Input
                      value={statusCodeStr}
                      onChange={(e) => setStatusCodeStr(e.target.value)}
                      onBlur={() => {
                        const n = parseInt(statusCodeStr, 10);
                        const code = isNaN(n) ? 200 : n;
                        setStatusCodeStr(String(code));
                        onUpdate(route.id, { statusCode: code });
                      }}
                      type="number"
                    />
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Domain Hostname</Label>
                    <Select value={route.domainId} onValueChange={(v) => onUpdate(route.id, { domainId: v })}>
                      <SelectTrigger className="text-xs w-full bg-muted">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {domains.map((d) => (
                          <SelectItem key={d.id} value={d.id} className="text-xs font-mono">{d.hostname}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Request Matching */}
              <div className="space-y-4 rounded-md border border-border p-2 bg-muted">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Incoming Matcher</h4>
                  {isWriteMethod && (
                    <Button size="sm" className="bg-primary hover:bg-primary-dark text-black font-semibold h-6 text-[10px] rounded cursor-pointer" onClick={saveReqBody}>
                      Save Matcher
                    </Button>
                  )}
                </div>

                {isWriteMethod ? (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Expected Payload Body (JSON)</Label>
                    <div className="h-[180px] rounded border border-border overflow-hidden bg-code-bg">
                      <TextEditor value={reqBody} onChange={(val) => setReqBody(val || '')} language="json" height="100%" />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground">Expected Query Parameters</Label>
                      <Button size="sm" variant="ghost" className="h-6 px-1.5 text-xs text-primary hover:bg-primary/10 rounded cursor-pointer" onClick={handleAddParam}>
                        <PlusIcon className="mr-1 h-3 w-3 stroke-[2]" /> Add Param
                      </Button>
                    </div>

                    {queryParams.length === 0 ? (
                      <div className="rounded-md border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground font-mono bg-muted/10">
                        Matches any query string parameter ruleset
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                        {queryParams.map((param, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <Checkbox
                              checked={param.enabled}
                              onCheckedChange={() => handleParamToggle(index)}
                              className="data-[state=checked]:bg-primary shrink-0"
                            />
                            <Input placeholder="Key" value={param.key} onChange={(e) => handleParamChange(index, 'key', e.target.value)} className="h-7.5 font-mono text-xs bg-muted/20 border-border" />
                            <Input placeholder="Value" value={param.value} onChange={(e) => handleParamChange(index, 'value', e.target.value)} className="h-7.5 font-mono text-xs bg-muted/20 border-border" />
                            <Button variant="ghost" size="icon" className="h-7.5 w-7.5 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 shrink-0 rounded cursor-pointer" onClick={() => handleRemoveParam(index)}>
                              <TrashIcon className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>


            </div>
          ) : (
            <div className="space-y-5">
              {/* Response Headers */}
              <div className="space-y-4 rounded-md border border-border p-2 bg-muted">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Response Headers</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="text-muted-foreground">Content-Type</span>
                    <span className="text-foreground">application/json</span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="text-muted-foreground">X-Powered-By</span>
                    <span className="text-foreground">MockForge Gateway</span>
                  </div>
                </div>
              </div>

              {/* Response Body Editor */}
              <div className="space-y-4 rounded-md border border-border p-2 bg-muted flex flex-col">
                <div className="flex items-center justify-between shrink-0">
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Response Body</h4>
                  <Button size="sm" onClick={saveBody}>
                    <FloppyDiskIcon />
                    Save Response
                  </Button>
                </div>
                <div className="h-[360px] rounded border border-border overflow-hidden bg-code-bg mt-2 flex-1">
                  <TextEditor value={body} onChange={(val) => setBody(val || '')} language="json" height="100%" />
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
