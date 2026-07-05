import { useState } from 'react';
import {
  PlusIcon,
  TrashIcon,
  PencilSimpleIcon,
  LightningIcon,
  TreeStructureIcon,
  ArrowSquareOutIcon,
} from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';
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
import { useRepeaterStore } from '@/stores/repeater';
import { useNavStore } from '@/stores/nav';
import { buildRawHttpRequest } from '@/lib/http-message';
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
  GET: 'bg-green-500/15 text-green-400 border-green-500/30',
  POST: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  PUT: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  DELETE: 'bg-red-500/15 text-red-400 border-red-500/30',
  PATCH: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  OPTIONS: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
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
        <Button size="sm" variant="outline">
          <PlusIcon className="mr-1.5 h-3.5 w-3.5" />
          New Route
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Mock Route</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Domain</Label>
            <Select value={domainId} onValueChange={setDomainId}>
              <SelectTrigger>
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
          <div className="flex gap-2">
            <div className="w-32 space-y-1.5">
              <Label>Method</Label>
              <Select value={method} onValueChange={(v) => setMethod(v as MockRoute['method'])}>
                <SelectTrigger>
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
              <Label>Path</Label>
              <Input
                placeholder="/api/resource/:id"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                className="font-mono text-sm"
              />
            </div>
            <div className="w-20 space-y-1.5">
              <Label>Status</Label>
              <Input
                value={statusCode}
                onChange={(e) => setStatusCode(e.target.value)}
                className="text-center font-mono text-sm"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Response Body (JSON)</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              className="font-mono text-xs"
            />
          </div>
          <Button className="w-full" onClick={handleAdd}>
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
  if (chaos.latencyMode === 'random') parts.push(`${chaos.latencyMin}–${chaos.latencyMax}ms`);
  if (chaos.errorRate) parts.push(`${chaos.errorRate}% err`);
  if (parts.length === 0) return null;
  return (
    <span className="flex items-center gap-1 text-[10px] text-orange-400">
      <LightningIcon className="h-3 w-3" />
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
  const selectedRoute = routes.find((r) => r.id === selectedRouteId) ?? null;

  return (
    <div className="flex h-full min-h-0">
      {/* Left: route list */}
      <div className="flex w-72 shrink-0 flex-col border-r">
        <div className="flex items-center justify-between border-b px-3 py-2.5">
          <p className="text-sm font-medium">Routes ({routes.length})</p>
          <NewRouteDialog domains={domains} onAdd={onAdd} />
        </div>
        <ScrollArea className="flex-1">
          {routes.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
              <TreeStructureIcon className="h-8 w-8 opacity-40" />
              <p className="text-sm">No routes yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {routes.map((route) => {
                const domain = domains.find((d) => d.id === route.domainId);
                return (
                  <div
                    key={route.id}
                    className={`group flex cursor-pointer items-start gap-2 px-3 py-2.5 transition-colors hover:bg-muted/40 ${
                      selectedRouteId === route.id ? 'bg-muted/60' : ''
                    } ${!route.enabled ? 'opacity-50' : ''}`}
                    onClick={() => onSelect(route.id)}
                  >
                    <span
                      className={`mt-0.5 shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-bold leading-tight ${
                        METHOD_COLORS[route.method] ?? ''
                      }`}
                    >
                      {route.method}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-mono text-xs">{route.path}</p>
                      {domain && (
                        <p className="truncate text-[10px] text-muted-foreground">{domain.hostname}</p>
                      )}
                      <div className="mt-0.5 flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground">{route.statusCode}</span>
                        <ChaosIndicator chaos={route.chaos} />
                      </div>
                    </div>
                    <Switch
                      checked={route.enabled}
                      onCheckedChange={(v) => onUpdate(route.id, { enabled: v })}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-0.5 shrink-0 scale-75"
                    />
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Right: route detail editor */}
      <div className="flex min-w-0 flex-1 flex-col">
        {selectedRoute ? (
          <RouteEditor
            key={selectedRoute.id}
            route={selectedRoute}
            domains={domains}
            onUpdate={onUpdate}
            onDelete={onDelete}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <div className="text-center">
              <PencilSimpleIcon className="mx-auto mb-2 h-8 w-8 opacity-30" />
              <p className="text-sm">Select a route to edit</p>
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

  const saveBody = () => onUpdate(route.id, { responseBody: body });
  const saveReqBody = () => onUpdate(route.id, { requestBody: reqBody });

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

  const handleSendToRepeater = () => {
    try {
      const protocol = domain?.ssl ? 'https' : 'http';
      const hostname = domain?.hostname || 'localhost';
      
      const qParams = queryParams.filter(p => p.enabled && p.key);
      const queryStr = qParams.length > 0
        ? '?' + qParams.map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`).join('&')
        : '';
      
      const url = `${protocol}://${hostname}${route.path}${queryStr}`;
      
      const raw = buildRawHttpRequest({
        method: route.method,
        url,
        headers: route.responseHeaders || { 'Content-Type': 'application/json' },
        body: isWriteMethod ? reqBody : '',
      });

      useRepeaterStore.getState().addRequestTab({ raw, url });
      useNavStore.getState().triggerNavBlink('/repeater');
      toast.success(`Sent mock route ${route.method} ${route.path} to Repeater!`);
    } catch (error) {
      console.error(error);
      toast.error('Failed to send mock route to Repeater');
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Route header */}
      <div className="flex items-center gap-3 border-b px-4 py-2.5">
        <span
          className={`rounded border px-2 py-0.5 text-xs font-bold ${
            METHOD_COLORS[route.method] ?? ''
          }`}
        >
          {route.method}
        </span>
        <span className="font-mono text-sm">{route.path}</span>
        {domain && (
          <span className="text-xs text-muted-foreground">on {domain.hostname}</span>
        )}
        <div className="ml-auto flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-xs">
            {route.statusCode}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={handleSendToRepeater}
          >
            <ArrowSquareOutIcon className="mr-1 h-3.5 w-3.5" />
            To Repeater
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive"
            onClick={() => onDelete(route.id)}
          >
            <TrashIcon className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-5 p-4">
          {/* Status + Domain row */}
          <div className="flex gap-4">
            <div className="w-24 space-y-1.5">
              <Label className="text-xs">Status Code</Label>
              <Input
                value={route.statusCode}
                onChange={(e) =>
                  onUpdate(route.id, { statusCode: parseInt(e.target.value, 10) || 200 })
                }
                className="text-center font-mono text-sm"
              />
            </div>
            <div className="flex-1 space-y-1.5">
              <Label className="text-xs">Domain</Label>
              <Select
                value={route.domainId}
                onValueChange={(v) => onUpdate(route.id, { domainId: v })}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {domains.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.hostname}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Incoming Request Configuration */}
          <div className="space-y-4">
            <div>
              <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Incoming Request Matching
              </Label>
            </div>

            {isWriteMethod ? (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">Expected Payload Body (JSON/text matching)</Label>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 text-xs animate-none"
                    onClick={saveReqBody}
                  >
                    Save Request Body
                  </Button>
                </div>
                <Textarea
                  value={reqBody}
                  onChange={(e) => setReqBody(e.target.value)}
                  rows={5}
                  className="font-mono text-xs"
                  spellCheck={false}
                  placeholder='{"amount": 9900}'
                />
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">Expected URL Query Parameters</Label>
                  <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={handleAddParam}>
                    <PlusIcon className="mr-1 h-3 w-3" /> Add Param
                  </Button>
                </div>
                
                {queryParams.length === 0 ? (
                  <div className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
                    No query parameters matched. Matches any query string.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {queryParams.map((param, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Checkbox
                          checked={param.enabled}
                          onCheckedChange={() => handleParamToggle(index)}
                        />
                        <Input
                          placeholder="Key"
                          value={param.key}
                          onChange={(e) => handleParamChange(index, 'key', e.target.value)}
                          className="h-8 font-mono text-xs"
                        />
                        <Input
                          placeholder="Value"
                          value={param.value}
                          onChange={(e) => handleParamChange(index, 'value', e.target.value)}
                          className="h-8 font-mono text-xs"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                          onClick={() => handleRemoveParam(index)}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <Separator />

          {/* Response body */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Response Body</Label>
              <Button size="sm" variant="outline" className="h-6 text-xs" onClick={saveBody}>
                Save Response Body
              </Button>
            </div>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              className="font-mono text-xs"
              spellCheck={false}
            />
          </div>

          <Separator />

          {/* Chaos controls */}
          <div className="space-y-3">
            <Label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <LightningIcon className="h-3.5 w-3.5 text-orange-400" />
              Chaos / Simulation
            </Label>

            <div className="flex flex-wrap gap-3">
              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground">Latency Mode</Label>
                <Select
                  value={route.chaos.latencyMode}
                  onValueChange={(v) =>
                    onUpdate(route.id, {
                      chaos: { ...route.chaos, latencyMode: v as ChaosConfig['latencyMode'] },
                    })
                  }
                >
                  <SelectTrigger className="h-7 w-28 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="fixed">Fixed</SelectItem>
                    <SelectItem value="random">Random</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {route.chaos.latencyMode === 'fixed' && (
                <div className="space-y-1.5">
                  <Label className="text-[11px] text-muted-foreground">Delay (ms)</Label>
                  <Input
                    className="h-7 w-24 text-xs"
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
                    <Label className="text-[11px] text-muted-foreground">Min (ms)</Label>
                    <Input
                      className="h-7 w-20 text-xs"
                      value={route.chaos.latencyMin ?? 100}
                      onChange={(e) =>
                        onUpdate(route.id, {
                          chaos: { ...route.chaos, latencyMin: parseInt(e.target.value, 10) || 0 },
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] text-muted-foreground">Max (ms)</Label>
                    <Input
                      className="h-7 w-20 text-xs"
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

            <div className="flex flex-wrap gap-3">
              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground">Error Rate (%)</Label>
                <Input
                  className="h-7 w-24 text-xs"
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
              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground">Error Status</Label>
                <Input
                  className="h-7 w-24 text-xs"
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
      </ScrollArea>
    </div>
  );
}
