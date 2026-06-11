'use client';

import React from 'react';
import { AlertTriangle, Clock, Globe, Filter, Play, Trash2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useAutomationStore,
  type LiveTrafficHostInsight,
  type LiveTrafficQueueStats,
} from '@/stores/automation';
import { NODE_TYPE_REGISTRY } from '../../constants';
import { getLiveTrafficSetupWarning } from '../../lib/node-warnings';
import type { TriggerConfig } from '../../types';

interface TriggerConfigFormProps {
  config: TriggerConfig;
  onChange: (patch: Partial<TriggerConfig>) => void;
  onRun?: () => void;
}

const OPERATOR_OPTIONS: { value: NonNullable<TriggerConfig['operator']>; label: string }[] = [
  { value: 'equals', label: 'Equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'regex', label: 'Regex' },
];

const METHOD_OPTIONS = ['ANY', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

function formatTime(iso: string): string {
  const date = new Date(iso);
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  const s = date.getSeconds().toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

export function TriggerConfigForm({ config, onChange, onRun }: TriggerConfigFormProps) {
  const isScheduled = config.triggerType === 'trigger:scheduled';
  const isManual = config.triggerType === 'trigger:manual';
  const isLiveTraffic = config.triggerType === 'trigger:live-traffic-captured';
  const liveTrafficWarning = isLiveTraffic ? getLiveTrafficSetupWarning(config) : null;

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-[11px]">Trigger type</Label>
        <p className="text-xs text-muted-foreground">
          {NODE_TYPE_REGISTRY[config.triggerType]?.label ?? config.triggerType}
        </p>
      </div>

      {isScheduled && (
        <div className="space-y-1.5">
          <Label className="text-[11px]">Cron schedule</Label>
          <div className="relative">
            <Clock className="absolute left-2.5 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-7 pl-7 text-xs"
              value={config.schedule ?? ''}
              onChange={(e) => onChange({ schedule: e.target.value })}
              placeholder="0 */6 * * *"
            />
          </div>
        </div>
      )}

      {isManual && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Trigger the workflow manually from this panel.
          </p>
          <Button
            variant="outline"
            size="xs"
            className="h-7 w-full text-xs"
            onClick={onRun}
          >
            <Play className="size-3 mr-1" />
            Run Workflow
          </Button>
        </div>
      )}

      {isLiveTraffic && (
        <>
          <div className="border-t pt-3 space-y-3">
            <p className="text-[11px] font-medium text-muted-foreground">
              <Filter className="size-3 inline mr-1" />
              Traffic filter
            </p>

            {liveTrafficWarning && (
              <Alert className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-200">
                <AlertTriangle className="size-4" />
                <AlertTitle className="text-xs">Live traffic is unfiltered</AlertTitle>
                <AlertDescription className="text-xs text-amber-700/80 dark:text-amber-200/80">
                  {liveTrafficWarning} Capturing every host can make workflows noisy and use more resources.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-1.5">
              <Label className="text-[11px]">Method</Label>
              <Select
                value={config.method?.trim() ? config.method.toUpperCase() : 'ANY'}
                onValueChange={(v) => onChange({ method: v === 'ANY' ? undefined : v })}
              >
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {METHOD_OPTIONS.map((method) => (
                    <SelectItem key={method} value={method} className="text-xs">
                      {method}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px]">
                <Globe className="size-3 inline mr-1" />
                Host whitelist
              </Label>
              <Textarea
                className="min-h-20 resize-none text-xs"
                value={config.host ?? ''}
                onChange={(e) => onChange({ host: e.target.value })}
                placeholder={'example.com\nhttps://app.example.com\napi.example.com:443\n*.target.local'}
              />
              <p className="text-[10px] text-muted-foreground">
                Enter hostnames, full URLs, optional ports, or wildcard domains. Separate with new lines, commas, semicolons, or spaces.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px]">Operator</Label>
              <Select
                value={config.operator ?? 'contains'}
                onValueChange={(v) => onChange({ operator: v as TriggerConfig['operator'] })}
              >
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OPERATOR_OPTIONS.map((op) => (
                    <SelectItem key={op.value} value={op.value} className="text-xs">
                      {op.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px]">Value</Label>
              <Input
                className="h-7 text-xs"
                value={config.value ?? ''}
                onChange={(e) => onChange({ value: e.target.value })}
                placeholder="e.g. /api/login (blank = match all URLs)"
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Fires automatically when the proxy captures a request matching the filters above.
            Leave all filters blank to match every request.
          </p>
        </>
      )}
    </div>
  );
}

interface LiveTrafficHostListProps {
  title: string;
  emptyText: string;
  items: LiveTrafficHostInsight[];
  clearTitle: string;
  onClear: () => void;
  stats?: LiveTrafficQueueStats;
}

function LiveTrafficHostList({
  title,
  emptyText,
  items,
  clearTitle,
  onClear,
  stats,
}: LiveTrafficHostListProps) {
  const noun = title === 'Captured hosts' ? 'captured request' : 'matched request';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-muted-foreground">
            <Globe className="size-3 inline mr-1" />
            {title}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {stats ? stats.pending : items.length} {noun}{(stats ? stats.pending : items.length) === 1 ? '' : 's'}
            {stats && ` / cap ${stats.cap}`}
          </p>
        </div>
        {items.length > 0 && (
          <Button
            variant="ghost"
            size="xs"
            className="h-6 w-6 shrink-0 p-0"
            onClick={onClear}
            title={clearTitle}
          >
            <Trash2 className="size-3" />
          </Button>
        )}
      </div>

      {stats && stats.dropped > 0 && (
        <Alert className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-200">
          <AlertTriangle className="size-4" />
          <AlertTitle className="text-xs">Live traffic queue is dropping requests</AlertTitle>
          <AlertDescription className="text-xs text-amber-700/80 dark:text-amber-200/80">
            Dropped {stats.dropped} oldest pending request{stats.dropped === 1 ? '' : 's'} for this trigger.
          </AlertDescription>
        </Alert>
      )}

      {items.length === 0 ? (
        <div className="rounded-md border border-dashed px-3 py-4 text-center">
          <p className="text-[11px] text-muted-foreground">
            {emptyText}
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-md border bg-muted/30 px-2 py-1.5"
              title={`${item.method} ${item.host}${item.path}`}
            >
              <div className="flex items-center gap-1.5 text-[10px]">
                <span className="shrink-0 text-muted-foreground/70">
                  {formatTime(item.matchedAt)}
                </span>
                <span className="shrink-0 font-medium text-cyan-500">{item.method}</span>
                {item.status != null && (
                  <span className="shrink-0 text-muted-foreground">{item.status}</span>
                )}
                <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                  {item.host}
                </span>
              </div>
              <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">
                {item.path || '/'}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function LiveTrafficQueuePanel({ nodeId }: { nodeId: string }) {
  const allQueuedHosts = useAutomationStore((s) => s.liveTrafficHostInsights);
  const stats = useAutomationStore((s) => s.liveTrafficQueueStatsByTriggerId[nodeId]);
  const queuedHosts = React.useMemo(
    () => allQueuedHosts.filter((item) => item.triggerNodeId === nodeId).slice(-50).reverse(),
    [allQueuedHosts, nodeId]
  );
  const clearLiveTrafficHostInsights = useAutomationStore((s) => s.clearLiveTrafficHostInsights);

  return (
    <LiveTrafficHostList
      title="Queued to execute"
      emptyText="No matched requests queued yet"
      items={queuedHosts}
      clearTitle="Clear queued requests"
      onClear={() => clearLiveTrafficHostInsights(nodeId)}
      stats={stats}
    />
  );
}

export function LiveTrafficCapturedHostsPanel({ nodeId }: { nodeId: string }) {
  const allCapturedHosts = useAutomationStore((s) => s.liveTrafficCapturedHosts);
  const capturedHosts = React.useMemo(
    () => allCapturedHosts.filter((item) => item.triggerNodeId === nodeId).slice(-100).reverse(),
    [allCapturedHosts, nodeId]
  );
  const clearLiveTrafficCapturedHosts = useAutomationStore((s) => s.clearLiveTrafficCapturedHosts);

  return (
    <LiveTrafficHostList
      title="Captured hosts"
      emptyText="No matching hosts captured yet"
      items={capturedHosts}
      clearTitle="Clear captured hosts"
      onClear={() => clearLiveTrafficCapturedHosts(nodeId)}
    />
  );
}
