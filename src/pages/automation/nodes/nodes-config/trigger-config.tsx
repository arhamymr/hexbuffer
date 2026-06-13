'use client';

import React from 'react';
import { AlertTriangle, Clock, Globe, Filter, Play, Trash2, Network, Radio, ScanLine } from 'lucide-react';
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
import { getLiveTrafficSetupWarning, getTriggerHostSetupWarning } from '../../lib/node-warnings';
import type { TriggerConfig } from '../../types';
import {
  DIRECTION_OPTIONS,
  HostWhitelistFilter,
  HttpMethodFilter,
  METHOD_OPTIONS,
  OPERATOR_OPTIONS,
  TriggerInfoPanel,
  UrlPatternFilter,
} from './trigger-fields';

interface TriggerConfigFormProps {
  config: TriggerConfig;
  onChange: (patch: Partial<TriggerConfig>) => void;
  onRun?: () => void;
}

const SEVERITY_OPTIONS = ['info', 'low', 'medium', 'high', 'critical'];
const EMPTY_LIVE_TRAFFIC_INSIGHTS: LiveTrafficHostInsight[] = [];

/* ── Help text per trigger ── */

const TRIGGER_HELP: Partial<Record<TriggerConfig['triggerType'], string>> = {
  'trigger:intercept-request':
    'Fires when a request is intercepted by the proxy and matches the filters above. Leave all filters blank to intercept every request.',
  'trigger:browser-page-crawled':
    'Fires when a browser page finishes crawling and the URL matches the filter above. Leave blank to match all pages.',
  'trigger:port-scan-result':
    'Fires when a port scan discovers open ports matching the filter. Specify ports as comma-separated numbers (e.g. 80, 443, 8080).',
  'trigger:websocket-message':
    'Fires when a WebSocket message matching the filters is sent or received.',
  'trigger:scan-completed':
    'Fires when a full browser crawl finishes. Use this to chain post-crawl actions like AI analysis or report generation.',
};

function formatTime(iso: string): string {
  const date = new Date(iso);
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  const s = date.getSeconds().toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

export function TriggerConfigForm({ config, onChange, onRun }: TriggerConfigFormProps) {
  const tt = config.triggerType;
  const isScheduled = tt === 'trigger:scheduled';
  const isManual = tt === 'trigger:manual';
  const isLiveTraffic = tt === 'trigger:live-traffic-captured';
  const liveTrafficWarning = isLiveTraffic ? getLiveTrafficSetupWarning(config) : null;

  // HTTP-based trigger that shares method/host/URL-pattern filters
  const isHttpRequest = tt === 'trigger:intercept-request';

  const helpText = TRIGGER_HELP[tt];

  const isPageCrawled = tt === 'trigger:browser-page-crawled';
  const isPortScanResult = tt === 'trigger:port-scan-result';
  const isWebSocketMessage = tt === 'trigger:websocket-message';
  const websocketWarning = isWebSocketMessage ? getTriggerHostSetupWarning(config) : null;
  const isInfoOnly = tt === 'trigger:scan-completed';

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-[11px]">Trigger type</Label>
        <p className="text-xs text-muted-foreground">
          {NODE_TYPE_REGISTRY[tt]?.label ?? tt}
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
              <Alert className="border-amber-500/60 bg-amber-500/15 py-3 text-amber-800 shadow-sm shadow-amber-500/10 dark:text-amber-100">
                <AlertTriangle className="size-5" />
                <AlertTitle className="text-sm font-semibold">Host whitelist required</AlertTitle>
                <AlertDescription className="text-xs text-amber-800/85 dark:text-amber-100/85">
                  {liveTrafficWarning} Add a specific host to keep capture strict and prevent unrelated traffic from entering the queue.
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
                Host whitelist <span className="text-amber-500">*</span>
              </Label>
              <Textarea
                className="min-h-20 resize-none text-xs"
                value={config.host ?? ''}
                onChange={(e) => onChange({ host: e.target.value })}
                placeholder={'0xbuffer.com\nmycarrier.telkom.co.id\nhttps://app.example.com\napi.example.com:443\n*.target.local'}
              />
              <p className="text-[10px] text-muted-foreground">
                Required. Enter hostnames, full URLs, optional ports, or wildcard domains. Separate with new lines, commas, semicolons, or spaces.
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
            At least one host is required before this trigger can run.
          </p>
        </>
      )}

      {/* ── HTTP Request triggers (intercept-request) ── */}
      {isHttpRequest && (
        <>
          <div className="border-t pt-3 space-y-3">
            <p className="text-[11px] font-medium text-muted-foreground">
              <Filter className="size-3 inline mr-1" />
              Request filter
            </p>
            <HttpMethodFilter
              value={config.method}
              onChange={(v) => onChange({ method: v })}
            />
            <HostWhitelistFilter
              value={config.host}
              onChange={(v) => onChange({ host: v })}
            />
            <UrlPatternFilter
              operator={config.operator}
              value={config.value}
              onOperatorChange={(v) => onChange({ operator: v as TriggerConfig['operator'] })}
              onValueChange={(v) => onChange({ value: v })}
            />
          </div>
          {helpText && <p className="text-xs text-muted-foreground">{helpText}</p>}
        </>
      )}

      {/* ── Page Crawled trigger ── */}
      {isPageCrawled && (
        <>
          <div className="border-t pt-3 space-y-3">
            <p className="text-[11px] font-medium text-muted-foreground">
              <Filter className="size-3 inline mr-1" />
              Page filter
            </p>
            <HostWhitelistFilter
              value={config.host}
              onChange={(v) => onChange({ host: v })}
            />
            <UrlPatternFilter
              operator={config.operator}
              value={config.value}
              onOperatorChange={(v) => onChange({ operator: v as TriggerConfig['operator'] })}
              onValueChange={(v) => onChange({ value: v })}
            />
          </div>
          {helpText && <p className="text-xs text-muted-foreground">{helpText}</p>}
        </>
      )}

      {/* ── Port Scan Result trigger ── */}
      {isPortScanResult && (
        <>
          <div className="border-t pt-3 space-y-3">
            <p className="text-[11px] font-medium text-muted-foreground">
              <Network className="size-3 inline mr-1" />
              Port filter
            </p>
            <div className="space-y-1.5">
              <Label className="text-[11px]">Port(s)</Label>
              <Input
                className="h-7 text-xs"
                value={config.port ?? ''}
                onChange={(e) => onChange({ port: e.target.value })}
                placeholder="e.g. 80, 443, 8080 (blank = all ports)"
              />
            </div>
            <HostWhitelistFilter
              value={config.host}
              onChange={(v) => onChange({ host: v })}
            />
          </div>
          {helpText && <p className="text-xs text-muted-foreground">{helpText}</p>}
        </>
      )}

      {/* ── WebSocket Message trigger ── */}
      {isWebSocketMessage && (
        <>
          <div className="border-t pt-3 space-y-3">
            <p className="text-[11px] font-medium text-muted-foreground">
              <Radio className="size-3 inline mr-1" />
              Message filter
            </p>
            {websocketWarning && (
              <Alert className="border-amber-500/60 bg-amber-500/15 py-3 text-amber-800 shadow-sm shadow-amber-500/10 dark:text-amber-100">
                <AlertTriangle className="size-5" />
                <AlertTitle className="text-sm font-semibold">Host whitelist required</AlertTitle>
                <AlertDescription className="text-xs text-amber-800/85 dark:text-amber-100/85">
                  {websocketWarning} Add a specific WebSocket host so unrelated sockets cannot enter the queue.
                </AlertDescription>
              </Alert>
            )}
            <HostWhitelistFilter
              value={config.host}
              onChange={(v) => onChange({ host: v })}
            />
            <div className="space-y-1.5">
              <Label className="text-[11px]">Direction</Label>
              <Select
                value={config.direction ?? ''}
                onValueChange={(v) => onChange({ direction: v as TriggerConfig['direction'] })}
              >
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue placeholder="Both directions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="" className="text-xs">Both</SelectItem>
                  {DIRECTION_OPTIONS.map((d) => (
                    <SelectItem key={d.value} value={d.value} className="text-xs">
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <UrlPatternFilter
              operator={config.operator}
              value={config.value}
              onOperatorChange={(v) => onChange({ operator: v as TriggerConfig['operator'] })}
              onValueChange={(v) => onChange({ value: v })}
            />
          </div>
          {helpText && (
            <p className="text-xs text-muted-foreground">
              {helpText} At least one host is required before this trigger can run.
            </p>
          )}
        </>
      )}

      {/* ── Info-only triggers (scan-completed) ── */}
      {isInfoOnly && (
        <>
          <TriggerInfoPanel
            icon={ScanLine}
            description={helpText ?? NODE_TYPE_REGISTRY[tt]?.description ?? ''}
          />
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

function dedupeById<T extends { id: string }>(items: T[]): T[] {
  return Array.from(new Map(items.map((item) => [item.id, item])).values());
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
        <div className="max-h-72 space-y-1 overflow-y-auto pr-1">
          {items.map((item, index) => (
            <div
              key={`${title}-${item.id}-${index}`}
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
  const queuedPreview = useAutomationStore(
    (s) => s.liveTrafficPreviewByTriggerId[nodeId] ?? EMPTY_LIVE_TRAFFIC_INSIGHTS
  );
  const stats = useAutomationStore((s) => s.liveTrafficQueueStatsByTriggerId[nodeId]);
  const queuedHosts = React.useMemo(() => dedupeById(queuedPreview).reverse(), [queuedPreview]);
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
  const capturedPreview = useAutomationStore(
    (s) => s.liveTrafficCapturedPreviewByTriggerId[nodeId] ?? EMPTY_LIVE_TRAFFIC_INSIGHTS
  );
  const capturedHosts = React.useMemo(() => dedupeById(capturedPreview).reverse(), [capturedPreview]);
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

export function LiveTrafficPanel({ nodeId }: { nodeId: string }) {
  return (
    <div className="space-y-5">
      <LiveTrafficQueuePanel nodeId={nodeId} />
      <LiveTrafficCapturedHostsPanel nodeId={nodeId} />
    </div>
  );
}
