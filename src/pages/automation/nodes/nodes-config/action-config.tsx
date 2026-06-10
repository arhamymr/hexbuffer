'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { NODE_TYPE_REGISTRY } from '../../constants';
import type { ActionConfig, AutomationNodeType } from '../../types';

/* ── Shared helpers ── */

interface ActionParams {
  params: Record<string, string>;
  updateParam: (key: string, value: string) => void;
}

function useActionParams(config: ActionConfig, onChange: (patch: Partial<ActionConfig>) => void): ActionParams {
  const params = config.params ?? {};
  const updateParam = (key: string, value: string) => {
    onChange({ params: { ...params, [key]: value } });
  };
  return { params, updateParam };
}

/* ── Individual action config forms ── */

function SendWebhookForm({ params, updateParam }: ActionParams) {
  return (
    <>
      <div className="space-y-1.5">
        <Label className="text-[11px]">Method</Label>
        <Select value={params.method ?? 'POST'} onValueChange={(v) => updateParam('method', v)}>
          <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => (
              <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-[11px]">URL</Label>
        <Input
          className="h-7 text-xs"
          value={params.url ?? ''}
          onChange={(e) => updateParam('url', e.target.value)}
          placeholder="https://hooks.example.com/..."
        />
      </div>
    </>
  );
}

function CreateFindingForm({ params, updateParam }: ActionParams) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px]">Severity</Label>
      <Select value={params.severity ?? 'medium'} onValueChange={(v) => updateParam('severity', v)}>
        <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          {['critical', 'high', 'medium', 'low', 'info'].map((s) => (
            <SelectItem key={s} value={s} className="text-xs capitalize">{s}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function ShowNotificationForm({ params, updateParam }: ActionParams) {
  return (
    <>
      <div className="space-y-1.5">
        <Label className="text-[11px]">Title</Label>
        <Input
          className="h-7 text-xs"
          value={params.title ?? ''}
          onChange={(e) => updateParam('title', e.target.value)}
          placeholder="Workflow Alert"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-[11px]">Body</Label>
        <Input
          className="h-7 text-xs"
          value={params.body ?? ''}
          onChange={(e) => updateParam('body', e.target.value)}
          placeholder="Notification message..."
        />
      </div>
    </>
  );
}

function RunScriptForm({ params, updateParam }: ActionParams) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px]">Command</Label>
      <Input
        className="h-7 text-xs"
        value={params.command ?? ''}
        onChange={(e) => updateParam('command', e.target.value)}
        placeholder="./scripts/scan.sh"
      />
    </div>
  );
}

function StartCrawlForm({ params, updateParam }: ActionParams) {
  return (
    <>
      <div className="space-y-1.5">
        <Label className="text-[11px]">Target URL</Label>
        <Input
          className="h-7 text-xs"
          value={params.url ?? ''}
          onChange={(e) => updateParam('url', e.target.value)}
          placeholder="https://target.example.com"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-[11px]">Max depth</Label>
        <Input
          className="h-7 text-xs"
          value={params.maxDepth ?? '3'}
          onChange={(e) => updateParam('maxDepth', e.target.value)}
          placeholder="3"
        />
      </div>
    </>
  );
}

function StartInvokerForm({ params, updateParam }: ActionParams) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px]">Attack mode</Label>
      <Select value={params.mode ?? 'sniper'} onValueChange={(v) => updateParam('mode', v)}>
        <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          {['sniper', 'battering-ram', 'pitchfork', 'cluster-bomb'].map((m) => (
            <SelectItem key={m} value={m} className="text-xs capitalize">{m}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function PortScanForm({ params, updateParam }: ActionParams) {
  return (
    <>
      <div className="space-y-1.5">
        <Label className="text-[11px]">Target host</Label>
        <Input
          className="h-7 text-xs"
          value={params.target ?? ''}
          onChange={(e) => updateParam('target', e.target.value)}
          placeholder="example.com or 192.168.1.1"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-[11px]">Port preset</Label>
        <Select value={params.preset ?? 'web'} onValueChange={(v) => updateParam('preset', v)}>
          <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {['quick', 'web', 'top-100', 'full', 'custom'].map((p) => (
              <SelectItem key={p} value={p} className="text-xs capitalize">{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  );
}

function EncodeDecodeForm({ params, updateParam }: ActionParams) {
  return (
    <>
      <div className="space-y-1.5">
        <Label className="text-[11px]">Mode</Label>
        <Select value={params.mode ?? 'encode'} onValueChange={(v) => updateParam('mode', v)}>
          <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {['encode', 'decode'].map((m) => (
              <SelectItem key={m} value={m} className="text-xs capitalize">{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-[11px]">Codec</Label>
        <Select value={params.codec ?? 'url'} onValueChange={(v) => updateParam('codec', v)}>
          <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {['url', 'base64', 'hex'].map((c) => (
              <SelectItem key={c} value={c} className="text-xs capitalize">{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  );
}

function HashDataForm({ params, updateParam }: ActionParams) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px]">Algorithm</Label>
      <Select value={params.algorithm ?? 'sha256'} onValueChange={(v) => updateParam('algorithm', v)}>
        <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          {['md5', 'sha1', 'sha256', 'sha512', 'sha3-256'].map((a) => (
            <SelectItem key={a} value={a} className="text-xs">{a.toUpperCase()}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function ExportJsonForm({ params, updateParam }: ActionParams) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px]">Filename</Label>
      <Input
        className="h-7 text-xs"
        value={params.filename ?? ''}
        onChange={(e) => updateParam('filename', e.target.value)}
        placeholder="export.json"
      />
    </div>
  );
}

function CreateDocumentForm({ params, updateParam }: ActionParams) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px]">Template</Label>
      <Select value={params.template ?? 'blank'} onValueChange={(v) => updateParam('template', v)}>
        <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          {['blank', 'developer', 'qa', 'security-researcher'].map((t) => (
            <SelectItem key={t} value={t} className="text-xs capitalize">{t}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function AddToDocumentForm({ params, updateParam }: ActionParams) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px]">Section</Label>
      <Input
        className="h-7 text-xs"
        value={params.section ?? ''}
        onChange={(e) => updateParam('section', e.target.value)}
        placeholder="e.g. potentialVulnerabilities"
      />
    </div>
  );
}

/* ── Action type → component map ── */

const ACTION_CONFIG_MAP: Record<string, React.FC<ActionParams>> = {
  'action:send-webhook': SendWebhookForm,
  'action:create-finding': CreateFindingForm,
  'action:show-notification': ShowNotificationForm,
  'action:run-script': RunScriptForm,
  'action:start-crawl': StartCrawlForm,
  'action:start-invoker': StartInvokerForm,
  'action:port-scan': PortScanForm,
  'action:encode-decode': EncodeDecodeForm,
  'action:hash-data': HashDataForm,
  'action:export-json': ExportJsonForm,
  'action:create-document': CreateDocumentForm,
  'action:add-to-document': AddToDocumentForm,
};

/* ─── Main ActionConfigForm ── */

interface ActionConfigFormProps {
  config: ActionConfig;
  type: AutomationNodeType;
  onChange: (patch: Partial<ActionConfig>) => void;
}

export function ActionConfigForm({ config, type, onChange }: ActionConfigFormProps) {
  const { params, updateParam } = useActionParams(config, onChange);

  const ConfigComponent = ACTION_CONFIG_MAP[type];

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-[11px]">Action type</Label>
        <p className="text-xs text-muted-foreground">
          {NODE_TYPE_REGISTRY[type]?.label ?? type}
        </p>
      </div>

      {ConfigComponent ? (
        <ConfigComponent params={params} updateParam={updateParam} />
      ) : (
        <p className="text-xs text-muted-foreground">
          This action needs no extra configuration.
        </p>
      )}
    </div>
  );
}
