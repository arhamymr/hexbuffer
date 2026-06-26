import React from 'react';
import { Label } from '@/components/ui/label';
import { NODE_TYPE_REGISTRY } from '../../constants';
import type { ActionConfig, AutomationNodeType } from '../../types';
import {
  BooleanField,
  Field,
  REQUEST_SOURCE_OPTIONS,
  SelectField,
  TextField,
  useActionParams,
  type ActionParams,
} from './action-fields';

function SendToRepeaterForm({ params, updateParam }: ActionParams) {
  return (
    <>
      <Field label="Tab name" value={params.tabName} onChange={(v) => updateParam('tabName', v)} placeholder="Automation replay" />
      <SelectField label="Request source" value={params.source} fallback="request" onChange={(v) => updateParam('source', v)} options={REQUEST_SOURCE_OPTIONS} />
      <BooleanField label="Open after send" value={params.open} fallback="true" onChange={(v) => updateParam('open', v)} />
    </>
  );
}

function AiAnalyzeForm({ params, updateParam }: ActionParams) {
  return (
    <>
      <TextField label="Prompt / template" value={params.prompt} onChange={(v) => updateParam('prompt', v)} placeholder="Analyze this request and response for security issues." />
      <SelectField
        label="Profile"
        value={params.profile}
        fallback="security"
        onChange={(v) => updateParam('profile', v)}
        options={[
          { value: 'security', label: 'Security' },
          { value: 'performance', label: 'Performance' },
          { value: 'qa', label: 'QA' },
          { value: 'custom', label: 'Custom' },
        ]}
      />
      <BooleanField label="Include request" value={params.includeRequest} fallback="true" onChange={(v) => updateParam('includeRequest', v)} />
      <BooleanField label="Include response" value={params.includeResponse} fallback="true" onChange={(v) => updateParam('includeResponse', v)} />
    </>
  );
}

function CreateFindingForm({ params, updateParam }: ActionParams) {
  return (
    <>
      <Field label="Title" value={params.title} onChange={(v) => updateParam('title', v)} placeholder="Potential vulnerability" />
      <SelectField
        label="Severity"
        value={params.severity}
        fallback="medium"
        onChange={(v) => updateParam('severity', v)}
        options={['critical', 'high', 'medium', 'low', 'info'].map((value) => ({ value, label: value }))}
      />
      <TextField label="Description" value={params.description} onChange={(v) => updateParam('description', v)} placeholder="Describe the issue or use {{url}}, {{host}}, {{status}} templates." />
      <SelectField label="Evidence source" value={params.evidenceSource} fallback="payload" onChange={(v) => updateParam('evidenceSource', v)} options={REQUEST_SOURCE_OPTIONS} />
    </>
  );
}

function SendWebhookForm({ params, updateParam }: ActionParams) {
  return (
    <>
      <SelectField
        label="Method"
        value={params.method}
        fallback="POST"
        onChange={(v) => updateParam('method', v)}
        options={['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((value) => ({ value, label: value }))}
      />
      <Field label="URL" value={params.url} onChange={(v) => updateParam('url', v)} placeholder="https://hooks.example.com/..." />
      <TextField label="Headers" value={params.headers} onChange={(v) => updateParam('headers', v)} placeholder={'Authorization: Bearer ...\nContent-Type: application/json'} />
      <TextField label="Body template" value={params.bodyTemplate} onChange={(v) => updateParam('bodyTemplate', v)} placeholder='{"url":"{{url}}","status":"{{status}}"}' />
    </>
  );
}

function ShowNotificationForm({ params, updateParam }: ActionParams) {
  return (
    <>
      <Field label="Title" value={params.title} onChange={(v) => updateParam('title', v)} placeholder="Workflow Alert" />
      <TextField label="Body" value={params.body} onChange={(v) => updateParam('body', v)} placeholder="Notification message..." />
      <SelectField
        label="Level"
        value={params.level}
        fallback="info"
        onChange={(v) => updateParam('level', v)}
        options={['info', 'success', 'warning', 'error'].map((value) => ({ value, label: value }))}
      />
    </>
  );
}

function RunScriptForm({ params, updateParam }: ActionParams) {
  return (
    <>
      <TextField label="Command" value={params.command} onChange={(v) => updateParam('command', v)} placeholder="./scripts/scan.sh {{url}}" />
      <Field label="Working directory" value={params.workingDirectory} onChange={(v) => updateParam('workingDirectory', v)} placeholder="/path/to/project" />
      <Field label="Timeout seconds" type="number" value={params.timeoutSeconds} onChange={(v) => updateParam('timeoutSeconds', v)} placeholder="30" />
    </>
  );
}

function StartCrawlForm({ params, updateParam }: ActionParams) {
  return (
    <>
      <Field label="Target URL" value={params.url} onChange={(v) => updateParam('url', v)} placeholder="https://target.example.com" />
      <Field label="Max depth" type="number" value={params.maxDepth ?? '3'} onChange={(v) => updateParam('maxDepth', v)} placeholder="3" />
      <SelectField
        label="Scope"
        value={params.scope}
        fallback="same-host"
        onChange={(v) => updateParam('scope', v)}
        options={[
          { value: 'same-host', label: 'Same host' },
          { value: 'same-origin', label: 'Same origin' },
          { value: 'all', label: 'All links' },
        ]}
      />
    </>
  );
}

function StopCrawlForm({ params, updateParam }: ActionParams) {
  return (
    <>
      <Field label="Crawl ID" value={params.crawlId} onChange={(v) => updateParam('crawlId', v)} placeholder="{{crawlId}}" />
      <SelectField
        label="Stop scope"
        value={params.scope}
        fallback="current"
        onChange={(v) => updateParam('scope', v)}
        options={[
          { value: 'current', label: 'Current crawl' },
          { value: 'host', label: 'Matching host' },
          { value: 'all', label: 'All crawls' },
        ]}
      />
    </>
  );
}

function SendToInterceptForm({ params, updateParam }: ActionParams) {
  return (
    <>
      <SelectField label="Request source" value={params.source} fallback="request" onChange={(v) => updateParam('source', v)} options={REQUEST_SOURCE_OPTIONS} />
      <SelectField
        label="Queue mode"
        value={params.queueMode}
        fallback="front"
        onChange={(v) => updateParam('queueMode', v)}
        options={[
          { value: 'front', label: 'Front' },
          { value: 'back', label: 'Back' },
          { value: 'replace', label: 'Replace current' },
        ]}
      />
      <BooleanField label="Pause request" value={params.pause} fallback="true" onChange={(v) => updateParam('pause', v)} />
    </>
  );
}

function StartInvokerForm({ params, updateParam }: ActionParams) {
  return (
    <>
      <SelectField
        label="Attack mode"
        value={params.mode}
        fallback="sniper"
        onChange={(v) => updateParam('mode', v)}
        options={['sniper', 'battering-ram', 'pitchfork', 'cluster-bomb'].map((value) => ({ value, label: value }))}
      />
      <Field label="Target" value={params.target} onChange={(v) => updateParam('target', v)} placeholder="{{url}}" />
      <Field label="Wordlist" value={params.wordlist} onChange={(v) => updateParam('wordlist', v)} placeholder="/path/to/wordlist.txt" />
    </>
  );
}

function PortScanForm({ params, updateParam }: ActionParams) {
  return (
    <>
      <Field label="Target host" value={params.target} onChange={(v) => updateParam('target', v)} placeholder="example.com or 192.168.1.1" />
      <SelectField
        label="Port preset"
        value={params.preset}
        fallback="web"
        onChange={(v) => updateParam('preset', v)}
        options={['quick', 'web', 'top-100', 'full', 'custom'].map((value) => ({ value, label: value }))}
      />
      <Field label="Custom ports" value={params.ports} onChange={(v) => updateParam('ports', v)} placeholder="80,443,8080" />
    </>
  );
}

function EncodeDecodeForm({ params, updateParam }: ActionParams) {
  return (
    <>
      <SelectField label="Mode" value={params.mode} fallback="encode" onChange={(v) => updateParam('mode', v)} options={['encode', 'decode'].map((value) => ({ value, label: value }))} />
      <SelectField label="Codec" value={params.codec} fallback="url" onChange={(v) => updateParam('codec', v)} options={['url', 'base64', 'hex'].map((value) => ({ value, label: value }))} />
      <SelectField label="Source field" value={params.sourceField} fallback="body" onChange={(v) => updateParam('sourceField', v)} options={REQUEST_SOURCE_OPTIONS} />
    </>
  );
}

function HashDataForm({ params, updateParam }: ActionParams) {
  return (
    <>
      <SelectField
        label="Algorithm"
        value={params.algorithm}
        fallback="sha256"
        onChange={(v) => updateParam('algorithm', v)}
        options={['md5', 'sha1', 'sha256', 'sha512'].map((value) => ({ value, label: value.toUpperCase() }))}
      />
      <SelectField label="Source field" value={params.sourceField} fallback="body" onChange={(v) => updateParam('sourceField', v)} options={REQUEST_SOURCE_OPTIONS} />
    </>
  );
}

function ExportJsonForm({ params, updateParam }: ActionParams) {
  return (
    <>
      <Field label="Filename" value={params.filename} onChange={(v) => updateParam('filename', v)} placeholder="export.json" />
      <SelectField label="Format" value={params.format} fallback="pretty" onChange={(v) => updateParam('format', v)} options={[{ value: 'pretty', label: 'Pretty' }, { value: 'compact', label: 'Compact' }]} />
      <SelectField label="Source" value={params.source} fallback="payload" onChange={(v) => updateParam('source', v)} options={REQUEST_SOURCE_OPTIONS} />
    </>
  );
}

function CreateDocumentForm({ params, updateParam }: ActionParams) {
  return (
    <>
      <Field label="Title" value={params.title} onChange={(v) => updateParam('title', v)} placeholder="Automation Document" />
      <SelectField
        label="Template"
        value={params.template}
        fallback="blank"
        onChange={(v) => updateParam('template', v)}
        options={['blank', 'developer', 'qa', 'security-researcher'].map((value) => ({ value, label: value }))}
      />
    </>
  );
}

function AddToDocumentForm({ params, updateParam }: ActionParams) {
  return (
    <>
      <Field label="Document ID" value={params.documentId} onChange={(v) => updateParam('documentId', v)} placeholder="Leave blank to use active document" />
      <Field label="Section" value={params.section} onChange={(v) => updateParam('section', v)} placeholder="e.g. potentialVulnerabilities" />
      <TextField label="Content" value={params.content} onChange={(v) => updateParam('content', v)} placeholder="Content to add. Supports {{url}}, {{host}}, {{status}}." />
    </>
  );
}

function AddToReportForm({ params, updateParam }: ActionParams) {
  return (
    <>
      <Field label="Document ID" value={params.documentId} onChange={(v) => updateParam('documentId', v)} placeholder="Leave blank to use active document" />
      <Field label="Section key" value={params.section} onChange={(v) => updateParam('section', v)} placeholder="e.g. potentialVulnerabilities" />
      <Field label="Title" value={params.title ?? 'Workflow Report'} onChange={(v) => updateParam('title', v)} placeholder="Section title" />
      <TextField label="Content" value={params.content} onChange={(v) => updateParam('content', v)} placeholder="Content to append. Supports {{url}}, {{host}}, {{status}}." />
      <SelectField label="Mode" value={params.mode} fallback="append" onChange={(v) => updateParam('mode', v)} options={[{ value: 'append', label: 'Append' }, { value: 'replace', label: 'Replace' }]} />
    </>
  );
}

function ConnectCdpForm({ params, updateParam }: ActionParams) {
  return (
    <>
      <Field label="Target URL" value={params.targetUrl} onChange={(v) => updateParam('targetUrl', v)} placeholder="{{url}}" />
      <SelectField
        label="Browser target mode"
        value={params.targetMode}
        fallback="active-tab"
        onChange={(v) => updateParam('targetMode', v)}
        options={[
          { value: 'active-tab', label: 'Active tab' },
          { value: 'new-tab', label: 'New tab' },
          { value: 'existing-url', label: 'Existing URL' },
        ]}
      />
      <BooleanField label="Open inspector" value={params.openInspector} fallback="true" onChange={(v) => updateParam('openInspector', v)} />
    </>
  );
}

const ACTION_CONFIG_MAP: Record<string, React.FC<ActionParams>> = {
  'action:send-to-repeater': SendToRepeaterForm,
  'action:ai-analyze': AiAnalyzeForm,
  'action:create-finding': CreateFindingForm,
  'action:add-to-report': AddToReportForm,
  'action:send-webhook': SendWebhookForm,
  'action:show-notification': ShowNotificationForm,
  'action:run-script': RunScriptForm,
  'action:start-crawl': StartCrawlForm,
  'action:stop-crawl': StopCrawlForm,
  'action:send-to-intercept': SendToInterceptForm,
  'action:start-invoker': StartInvokerForm,
  'action:port-scan': PortScanForm,
  'action:encode-decode': EncodeDecodeForm,
  'action:hash-data': HashDataForm,
  'action:export-json': ExportJsonForm,
  'action:create-document': CreateDocumentForm,
  'action:add-to-document': AddToDocumentForm,
  'action:connect-cdp': ConnectCdpForm,
};

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
          Unknown action type.
        </p>
      )}
    </div>
  );
}
