import { useState } from 'react';
import {
  PlusIcon,
  TrashIcon,
  PencilSimpleIcon,
  LightningIcon,
  TreeStructureIcon,
  ArrowSquareOutIcon,
  MagnifyingGlassIcon,
  GlobeIcon,
  FloppyDiskIcon,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { TextEditor } from '@/components/ui/text-editor';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRepeaterStore } from '@/stores/repeater';
import { useCollectionsStore } from '@/stores/collections';
import { useNavStore } from '@/stores/nav';
import { toast } from 'sonner';
import { HTTP_METHODS, DEFAULT_RESPONSE_BODY } from '../constants';
import type { MockDomain, MockRoute, ChaosConfig } from '../types';

interface RoutesProps {
  domains: MockDomain[];
  routes: MockRoute[];
  selectedRouteId: string | null;
  onSelect: (id: string) => void;
  onAdd: (route: Omit<MockRoute, 'id'>) => void;
  onUpdate: (id: string, patch: Partial<MockRoute>) => void;
  onDelete: (id: string) => void;
}

const METHOD_COLORS: Record<string, string> = {
  GET: 'text-green-500 font-bold',
  POST: 'text-blue-500 font-bold',
  PUT: 'text-yellow-500 font-bold',
  DELETE: 'text-red-500 font-bold',
  PATCH: 'text-orange-500 font-bold',
  OPTIONS: 'text-purple-500 font-bold',
};

function NewRouteDialog({
  domains,
  onAdd,
}: {
  domains: MockDomain[];
  onAdd: (route: Omit<MockRoute, 'id'>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [domainId, setDomainId] = useState(domains[0]?.id ?? '');
  const [method, setMethod] = useState<MockRoute['method']>('GET');
  const [path, setPath] = useState('/api/resource/:id');
  const [statusCode, setStatusCode] = useState('200');
  const [body, setBody] = useState(DEFAULT_RESPONSE_BODY);

  const handleAdd = () => {
    if (!path.trim() || !domainId) return;
    onAdd({
      domainId,
      method,
      path: path.trim(),
      statusCode: parseInt(statusCode, 10) || 200,
      responseBody: body,
      responseHeaders: { 'Content-Type': 'application/json' },
      matchers: [],
      chaos: { latencyMode: 'none' },
      enabled: true,
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <PlusIcon className="mr-1 h-3 w-3 stroke-[2]" />
          New Route
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg border-border bg-background">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold text-foreground">New Mock Route</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Domain</Label>
            <Select value={domainId} onValueChange={setDomainId}>
              <SelectTrigger className="h-9 bg-muted/40">
                <SelectValue placeholder="Select domain" />
              </SelectTrigger>
              <SelectContent>
                {domains.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.hostname}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-3">
            <div className="w-28 space-y-1.5">
              <Label className="text-xs text-muted-foreground">Method</Label>
              <Select value={method} onValueChange={(v) => setMethod(v as MockRoute['method'])}>
                <SelectTrigger className="h-9 bg-muted/40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HTTP_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 space-y-1.5">
              <Label className="text-xs text-muted-foreground">Path</Label>
              <Input
                placeholder="/api/resource/:id"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                className="h-9 font-mono text-sm bg-muted/40 focus-visible:ring-primary focus-visible:ring-1"
              />
            </div>
            <div className="w-20 space-y-1.5">
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Input
                value={statusCode}
                onChange={(e) => setStatusCode(e.target.value)}
                className="h-9 text-center font-mono text-sm bg-muted/40 focus-visible:ring-primary focus-visible:ring-1"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Response Body (JSON)</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              className="font-mono text-xs bg-muted/40 focus-visible:ring-primary focus-visible:ring-1"
            />
          </div>
          <Button className="w-full bg-primary hover:bg-primary-dark text-black font-semibold h-9 rounded-md mt-2 cursor-pointer" onClick={handleAdd}>
            Create Route
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ChaosIndicator({ chaos }: { chaos: ChaosConfig }) {
  const parts: string[] = [];
  if (chaos.latencyMode === 'fixed') parts.push(`${chaos.latencyFixed}ms`);
  if (chaos.latencyMode === 'random') parts.push(`${chaos.latencyMin}-${chaos.latencyMax}ms`);
  if (chaos.errorRate) parts.push(`${chaos.errorRate}% err`);
  if (parts.length === 0) return null;
  return (
    <span className="flex items-center gap-1 text-[9px] font-mono text-orange-400">
      <LightningIcon className="h-2.5 w-2.5 fill-orange-400" />
      {parts.join(' · ')}
    </span>
  );
}

export function RoutesPanel({
  domains,
  routes,
  selectedRouteId,
  onSelect,
  onAdd,
  onUpdate,
  onDelete,
}: RoutesProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredRoutes = routes.filter((route) => {
    const domain = domains.find((d) => d.id === route.domainId);
    const search = searchQuery.toLowerCase();
    return (
      route.path.toLowerCase().includes(search) ||
      route.method.toLowerCase().includes(search) ||
      (domain && domain.hostname.toLowerCase().includes(search))
    );
  });

  // Group routes by domainId
  const routesByDomain = filteredRoutes.reduce((acc, route) => {
    const domainId = route.domainId || 'no-domain';
    if (!acc[domainId]) acc[domainId] = [];
    acc[domainId].push(route);
    return acc;
  }, {} as Record<string, MockRoute[]>);

  const selectedRoute = routes.find((r) => r.id === selectedRouteId) ?? null;

  return (
    <div className="flex h-full min-h-0 flex-1">
      {/* Left: route list */}
      <div className="flex w-72 shrink-0 flex-col border-r bg-background">
        <div className="flex flex-col gap-2 border-b p-2 bg-muted/10">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Mock Rules ({filteredRoutes.length})</h3>
            <NewRouteDialog domains={domains} onAdd={onAdd} />
          </div>
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-2.5 top-2.5 h-3 w-3 text-muted-foreground" />
            <Input
              placeholder="Filter routes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-7.5 h-7.5 text-xs bg-muted/30 focus-visible:ring-primary focus-visible:ring-1 border-border"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          {filteredRoutes.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
              <TreeStructureIcon className="h-8 w-8 opacity-40" />
              <p className="text-sm font-medium">No matching routes</p>
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-border/20">
              {Object.entries(routesByDomain).map(([domainId, domainRoutes]) => {
                const domain = domains.find((d) => d.id === domainId);
                return (
                  <div key={domainId} className="flex flex-col pb-2">
                    {/* Domain Header Group */}
                    <div className="flex min-w-0 items-center gap-1.5 px-3 py-1.5 bg-muted/20 border-b border-border/40 text-[9px] font-mono font-bold text-muted-foreground uppercase tracking-wider select-none overflow-hidden">
                      <GlobeIcon className="h-3 w-3 shrink-0" />
                      <span className="truncate">{domain ? domain.hostname : 'Fallback Host'}</span>
                    </div>

                    {/* Routes in this domain */}
                    <div className="divide-y divide-border/10">
                      {domainRoutes.map((route) => {
                        const isSelected = selectedRouteId === route.id;
                        return (
                          <div
                            key={route.id}
                            className={`group flex cursor-pointer items-start gap-2 px-3 py-2 transition-colors hover:bg-muted/40 ${isSelected ? 'bg-muted/50' : ''
                              } ${!route.enabled ? 'opacity-40' : ''}`}
                            onClick={() => onSelect(route.id)}
                          >
                            <span className={`text-[10px] mt-0.5 shrink-0 ${METHOD_COLORS[route.method] ?? ''}`}>
                              {route.method}
                            </span>
                            <div className="min-w-0 flex-1 overflow-hidden pl-0.5">
                              <p className="truncate font-mono text-xs font-medium text-foreground">{route.path}</p>
                              <div className="mt-0.5 flex items-center gap-2 overflow-hidden">
                                <span className="shrink-0 text-[10px] font-mono font-semibold text-muted-foreground">{route.statusCode}</span>
                                <ChaosIndicator chaos={route.chaos} />
                              </div>
                            </div>
                            <Switch
                              checked={route.enabled}
                              onCheckedChange={(v) => onUpdate(route.id, { enabled: v })}
                              onClick={(e) => e.stopPropagation()}
                              className="mt-0.5 shrink-0 scale-75 cursor-pointer"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Right: route detail editor */}
      <div className="flex min-w-0 flex-1 flex-col bg-background">
        {selectedRoute ? (
          <RouteEditor
            key={selectedRoute.id}
            route={selectedRoute}
            domains={domains}
            onUpdate={onUpdate}
            onDelete={onDelete}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground bg-muted/5">
            <div className="text-center">
              <PencilSimpleIcon className="mx-auto mb-2 h-8 w-8 opacity-30 text-muted-foreground" />
              <p className="text-sm font-medium">Select a mock route ruleset to configure</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function RouteEditor({
  route,
  domains,
  onUpdate,
  onDelete,
}: {
  route: MockRoute;
  domains: MockDomain[];
  onUpdate: (id: string, patch: Partial<MockRoute>) => void;
  onDelete: (id: string) => void;
}) {
  const domain = domains.find((d) => d.id === route.domainId);
  const [body, setBody] = useState(route.responseBody);
  const [reqBody, setReqBody] = useState(route.requestBody || '');
  const [activeTab, setActiveTab] = useState<'config' | 'response'>('config');

  const saveBody = () => {
    onUpdate(route.id, { responseBody: body });
    toast.success('Response body mock updated.');
  };
  const saveReqBody = () => {
    onUpdate(route.id, { requestBody: reqBody });
    toast.success('Expected request payload saved.');
  };

  const isWriteMethod = ['POST', 'PUT', 'PATCH'].includes(route.method);
  const queryParams = route.requestQueryParams || [];

  const handleAddParam = () => {
    onUpdate(route.id, {
      requestQueryParams: [...queryParams, { key: '', value: '', enabled: true }],
    });
  };

  const handleRemoveParam = (index: number) => {
    onUpdate(route.id, {
      requestQueryParams: queryParams.filter((_, i) => i !== index),
    });
  };

  const handleParamChange = (index: number, field: 'key' | 'value', val: string) => {
    const updated = [...queryParams];
    updated[index] = { ...updated[index], [field]: val };
    onUpdate(route.id, { requestQueryParams: updated });
  };

  const handleParamToggle = (index: number) => {
    const updated = [...queryParams];
    updated[index] = { ...updated[index], enabled: !updated[index].enabled };
    onUpdate(route.id, { requestQueryParams: updated });
  };

  const handleSendToRepeater = async () => {
    try {
      const protocol = domain?.ssl ? 'https' : 'http';
      const hostname = domain?.hostname || 'localhost';

      const qParams = queryParams.filter(p => p.enabled && p.key);
      const queryStr = qParams.length > 0
        ? '?' + qParams.map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`).join('&')
        : '';

      const url = `${protocol}://${hostname}${route.path}${queryStr}`;

      const repeaterStore = useRepeaterStore.getState();
      let ws = repeaterStore.workspaces.find(w => w.name === 'mock-forge');
      let wsId = '';
      if (!ws) {
        wsId = repeaterStore.createWorkspace('mock-forge');
      } else {
        wsId = ws.id;
        repeaterStore.setActiveWorkspaceId(wsId);
      }

      const collectionsStore = useCollectionsStore.getState();
      let stash = collectionsStore.stashes.find(s => s.parentId === wsId);
      let stashId = '';
      if (!stash) {
        stashId = await collectionsStore.createStash('mock-forge', wsId);
      } else {
        stashId = stash.id;
      }

      const endpointName = `${route.method} ${route.path}`;
      const epId = await collectionsStore.createEndpoint(stashId, endpointName);

      const headersObj = route.responseHeaders || { 'Content-Type': 'application/json' };
      const parsedHeaders = Object.entries(headersObj).map(([key, value]) => ({
        key,
        value,
        enabled: true,
      }));

      collectionsStore.setSelectedNodeId(`ep-${epId}`);
      collectionsStore.updateActiveRequest(() => ({
        method: route.method,
        url,
        headers: parsedHeaders,
        body: isWriteMethod ? reqBody : '',
        bodyType: isWriteMethod ? 'json' : 'none',
        preScript: '',
        testScript: '',
        response: null,
        isLoading: false,
        error: null,
        testResults: [],
        queryParams: queryParams.map(p => ({ key: p.key, value: p.value, enabled: p.enabled })),
      }));

      await collectionsStore.saveActiveEndpoint();
      useNavStore.getState().triggerNavBlink('/repeater');
      toast.success(`Sent mock route ${route.method} ${route.path} to Repeater!`);
    } catch (error) {
      console.error(error);
      toast.error('Failed to send mock route to Repeater');
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      {/* Route header */}
      <div className="flex items-center gap-3 border-b p-2 bg-muted/10 shrink-0">
        <span className={`text-xs ${METHOD_COLORS[route.method] ?? ''}`}>
          {route.method}
        </span>
        <span className="font-mono text-xs">{route.path}</span>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground">
            HTTP {route.statusCode}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2 text-xs cursor-pointer border-border"
            onClick={handleSendToRepeater}
          >
            <ArrowSquareOutIcon className="mr-1 h-3.5 w-3.5" />
            To Repeater
          </Button>
          <Button
            variant="destructive"
            size="icon"
            className="cursor-pointer rounded"
            onClick={() => onDelete(route.id)}
          >
            <TrashIcon className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
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
                      value={route.statusCode}
                      onChange={(e) =>
                        onUpdate(route.id, { statusCode: parseInt(e.target.value, 10) || 200 })
                      }
                    />
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Domain Hostname</Label>
                    <Select
                      value={route.domainId}
                      onValueChange={(v) => onUpdate(route.id, { domainId: v })}
                    >
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
                    <Button
                      size="sm"
                      className="bg-primary hover:bg-primary-dark text-black font-semibold h-6 text-[10px] rounded cursor-pointer"
                      onClick={saveReqBody}
                    >
                      Save Matcher
                    </Button>
                  )}
                </div>

                {isWriteMethod ? (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Expected Payload Body (JSON)</Label>
                    <div className="h-[180px] rounded border border-border overflow-hidden bg-code-bg">
                      <TextEditor
                        value={reqBody}
                        onChange={(val) => setReqBody(val || '')}
                        language="json"
                        height="100%"
                      />
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
                            <Input
                              placeholder="Key"
                              value={param.key}
                              onChange={(e) => handleParamChange(index, 'key', e.target.value)}
                              className="h-7.5 font-mono text-xs bg-muted/20 border-border"
                            />
                            <Input
                              placeholder="Value"
                              value={param.value}
                              onChange={(e) => handleParamChange(index, 'value', e.target.value)}
                              className="h-7.5 font-mono text-xs bg-muted/20 border-border"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7.5 w-7.5 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 shrink-0 rounded cursor-pointer"
                              onClick={() => handleRemoveParam(index)}
                            >
                              <TrashIcon className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Chaos Simulation */}
              <div className="space-y-4 rounded-md border border-border p-2 bg-muted">
                <h4 className="flex items-center gap-1.5 text-xs font-bold text-foreground uppercase tracking-wider">
                  <LightningIcon className="h-3.5 w-3.5 text-orange-400 fill-orange-400" />
                  Chaos Instrumentation
                </h4>

                <div className="flex flex-wrap gap-4">
                  <div className="space-y-1.5 flex-1 min-w-[120px]">
                    <Label className="text-xs text-muted-foreground">Latency Mode</Label>
                    <Select
                      value={route.chaos.latencyMode}
                      onValueChange={(v) =>
                        onUpdate(route.id, {
                          chaos: { ...route.chaos, latencyMode: v as ChaosConfig['latencyMode'] },
                        })
                      }
                    >
                      <SelectTrigger className="h-8 text-xs bg-muted/20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none" className="text-xs">None</SelectItem>
                        <SelectItem value="fixed" className="text-xs">Fixed Delay</SelectItem>
                        <SelectItem value="random" className="text-xs">Random Range</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {route.chaos.latencyMode === 'fixed' && (
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Delay (ms)</Label>
                      <Input
                        className="h-8 w-24 text-xs font-mono bg-muted/20"
                        value={route.chaos.latencyFixed ?? 200}
                        onChange={(e) =>
                          onUpdate(route.id, {
                            chaos: { ...route.chaos, latencyFixed: parseInt(e.target.value, 10) || 0 },
                          })
                        }
                      />
                    </div>
                  )}

                  {route.chaos.latencyMode === 'random' && (
                    <>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Min (ms)</Label>
                        <Input
                          className="h-8 w-20 text-xs font-mono bg-muted/20"
                          value={route.chaos.latencyMin ?? 100}
                          onChange={(e) =>
                            onUpdate(route.id, {
                              chaos: { ...route.chaos, latencyMin: parseInt(e.target.value, 10) || 0 },
                            })
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Max (ms)</Label>
                        <Input
                          className="h-8 w-20 text-xs font-mono bg-muted/20"
                          value={route.chaos.latencyMax ?? 1000}
                          onChange={(e) =>
                            onUpdate(route.id, {
                              chaos: { ...route.chaos, latencyMax: parseInt(e.target.value, 10) || 0 },
                            })
                          }
                        />
                      </div>
                    </>
                  )}
                </div>

                <div className="flex flex-wrap gap-4 pt-1">
                  <div className="space-y-1.5 flex-1">
                    <Label className="text-xs text-muted-foreground">Failure Rate (%)</Label>
                    <Input
                      className="h-8 w-full text-xs font-mono bg-muted/20"
                      placeholder="0"
                      value={route.chaos.errorRate ?? ''}
                      onChange={(e) =>
                        onUpdate(route.id, {
                          chaos: {
                            ...route.chaos,
                            errorRate: e.target.value ? parseInt(e.target.value, 10) : undefined,
                          },
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1.5 flex-1">
                    <Label className="text-xs text-muted-foreground">Failure Code</Label>
                    <Input
                      className="h-8 w-full text-xs font-mono bg-muted/20"
                      placeholder="502"
                      value={route.chaos.errorStatus ?? ''}
                      onChange={(e) =>
                        onUpdate(route.id, {
                          chaos: {
                            ...route.chaos,
                            errorStatus: e.target.value ? parseInt(e.target.value, 10) : undefined,
                          },
                        })
                      }
                    />
                  </div>
                </div>
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
                  <Button
                    size="sm" onClick={saveBody}
                  >
                    <FloppyDiskIcon />
                    Save Response
                  </Button>
                </div>

                <div className="h-[360px] rounded border border-border overflow-hidden bg-code-bg mt-2 flex-1">
                  <TextEditor
                    value={body}
                    onChange={(val) => setBody(val || '')}
                    language="json"
                    height="100%"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

