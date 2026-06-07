'use client';

import { useEffect, useMemo, useState } from 'react';
import { Clipboard, KeyRound, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HighlightedText } from '@/components/highlighted-text';
import { Input } from '@/components/ui/input';
import { ActivityStatusBadge, LevelBadge } from '@/components/status-badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { EventLogTable } from '@/pages/live-traffic/components/log-table/event-log-table';
import { copyText } from '@/lib/clipboard';
import type { ActivityLog, HumanInputRequest, LogExtraValue } from '../types';

interface ActivityLogPanelProps {
  logs: ActivityLog[];
  searchQuery?: string;
  onSubmitHumanInput?: (
    request: HumanInputRequest,
    action: 'continue' | 'skip-branch' | 'stop-crawl',
    fields?: Record<string, string>
  ) => Promise<void> | void;
}

function DetailRow({ label, value, searchQuery = '' }: { label: string; value: string | undefined; searchQuery?: string }) {
  return (
    <div className="grid grid-cols-[100px_minmax(0,1fr)] gap-3 border-b py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words font-mono text-xs">
        <HighlightedText text={value ?? '-'} query={searchQuery} />
      </span>
    </div>
  );
}

function isRecord(value: LogExtraValue | undefined): value is Record<string, LogExtraValue> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function stringifyDebugValue(value: LogExtraValue | undefined) {
  if (value === undefined) return undefined;
  if (value === null) return 'null';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value, null, 2);
}

function RedactionResultSection({ extra, searchQuery = '' }: { extra: ActivityLog['extra']; searchQuery?: string }) {
  const aiRedaction = isRecord(extra?.aiRedaction) ? extra.aiRedaction : undefined;
  if (!aiRedaction) return null;

  const count = typeof aiRedaction.redactionCount === 'number' ? aiRedaction.redactionCount : 0;
  const categories = Array.isArray(aiRedaction.categories)
    ? aiRedaction.categories.filter((item): item is string => typeof item === 'string')
    : [];
  const preview = aiRedaction.redactedPreview;
  const previewJson = preview === undefined
    ? ''
    : typeof preview === 'string'
      ? preview
      : JSON.stringify(preview, null, 2);

  return (
    <div className="rounded-md border p-3">
      <div className="mb-2 text-sm font-medium">Redaction Result</div>
      <DetailRow label="Redactions" value={String(count)} searchQuery={searchQuery} />
      <DetailRow
        label="Categories"
        value={categories.length ? categories.join(', ') : 'No sensitive values detected'}
        searchQuery={searchQuery}
      />
      {previewJson ? (
        <pre className="mt-3 max-h-80 overflow-auto rounded-md bg-muted p-3 font-mono text-xs leading-5 text-muted-foreground">
          <HighlightedText text={previewJson} query={searchQuery} />
        </pre>
      ) : null}
    </div>
  );
}

const PLAYWRIGHT_DEBUG_ROWS: Array<[string, string]> = [
  ['Action', 'action'],
  ['Selector', 'selector'],
  ['Field Name', 'fieldName'],
  ['Field ID', 'fieldId'],
  ['Field Label', 'fieldLabel'],
  ['Placeholder', 'fieldPlaceholder'],
  ['Field Type', 'fieldType'],
  ['Value Provided', 'valueProvided'],
  ['Submit Action', 'submitAction'],
  ['Submit Selector', 'submitSelector'],
  ['Key', 'key'],
  ['URL Before', 'urlBefore'],
  ['URL After', 'urlAfter'],
  ['Status', 'status'],
  ['Wait Until', 'waitUntil'],
  ['Timeout', 'timeoutMs'],
  ['Result', 'result'],
  ['Duration', 'durationMs'],
  ['Fields Found', 'fieldsFound'],
  ['Fields Filled', 'fieldsFilled'],
  ['Path', 'path'],
  ['Error', 'error'],
];

function DebugDataSection({ extra, searchQuery = '' }: { extra: ActivityLog['extra']; searchQuery?: string }) {
  if (!extra) return null;

  const playwright = isRecord(extra.playwright) ? extra.playwright : undefined;
  const knownRows = playwright
    ? PLAYWRIGHT_DEBUG_ROWS
        .map(([label, key]) => {
          const value = stringifyDebugValue(playwright[key]);
          if (value === undefined) return null;
          return [label, value] as const;
        })
        .filter((row): row is readonly [string, string] => row !== null)
    : [];

  const knownKeys = new Set(PLAYWRIGHT_DEBUG_ROWS.map(([, key]) => key));
  const remainingPlaywright = playwright
    ? Object.fromEntries(Object.entries(playwright).filter(([key]) => !knownKeys.has(key)))
    : undefined;
  const otherExtra = Object.fromEntries(Object.entries(extra).filter(([key]) => !['playwright', 'aiRedaction'].includes(key)));
  const fallback = {
    ...(remainingPlaywright && Object.keys(remainingPlaywright).length ? { playwright: remainingPlaywright } : {}),
    ...otherExtra,
  };
  const fallbackJson = Object.keys(fallback).length ? JSON.stringify(fallback, null, 2) : '';

  if (!knownRows.length && !fallbackJson) return null;

  return (
    <div className="rounded-md border p-3">
      <div className="mb-2 text-sm font-medium">Debug Data</div>
      {knownRows.length ? (
        <div className="mb-3">
          {knownRows.map(([label, value]) => (
            <DetailRow key={label} label={label} value={value} searchQuery={searchQuery} />
          ))}
        </div>
      ) : null}
      {fallbackJson ? (
        <pre className="max-h-80 overflow-auto rounded-md bg-muted p-3 font-mono text-xs leading-5 text-muted-foreground">
          <HighlightedText text={fallbackJson} query={searchQuery} />
        </pre>
      ) : null}
    </div>
  );
}

function LogDetailPane({
  log,
  onClose,
  onSubmitHumanInput,
  searchQuery = '',
}: {
  log: ActivityLog;
  onClose: () => void;
  onSubmitHumanInput?: ActivityLogPanelProps['onSubmitHumanInput'];
  searchQuery?: string;
}) {
  const request = log.humanInputRequest;
  const requestedFields = useMemo(() => {
    const fields = request?.requestedFields.length ? request.requestedFields : ['username', 'password'];
    return [...new Set(fields)];
  }, [request]);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [submittingAction, setSubmittingAction] = useState<string | null>(null);

  useEffect(() => {
    setFieldValues(Object.fromEntries(requestedFields.map((field) => [field, ''])));
  }, [log.id, requestedFields]);

  const submitAction = async (
    action: 'continue' | 'skip-branch' | 'stop-crawl',
    fields?: Record<string, string>
  ) => {
    if (!request || !onSubmitHumanInput) return;

    setSubmittingAction(action);
    try {
      await onSubmitHumanInput(request, action, fields);
    } finally {
      setSubmittingAction(null);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          Activity Detail
          <LevelBadge level={log.level} />
          <ActivityStatusBadge status={log.type} />
        </div>
        <Button variant="ghost" size="icon-sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-4 p-4">
          <p className="whitespace-pre-wrap font-mono text-xs leading-6 text-muted-foreground">
            <HighlightedText text={log.message} query={searchQuery} />
          </p>

          <div className="rounded-md border p-3">
            <DetailRow label="ID" value={log.id} searchQuery={searchQuery} />
            <DetailRow label="Session" value={log.sessionId} searchQuery={searchQuery} />
            <DetailRow label="Level" value={log.level} searchQuery={searchQuery} />
            <DetailRow label="Type" value={log.type} searchQuery={searchQuery} />
            <DetailRow label="URL" value={log.url} searchQuery={searchQuery} />
            <DetailRow label="Timestamp" value={new Date(log.createdAt).toLocaleString()} searchQuery={searchQuery} />
          </div>

          <div className="rounded-md border p-3">
            <div className="mb-2 text-sm font-medium">Message</div>
            <p className="whitespace-pre-wrap font-mono text-xs leading-6 text-muted-foreground">
              <HighlightedText text={log.message} query={searchQuery} />
            </p>
          </div>

          <DebugDataSection extra={log.extra} searchQuery={searchQuery} />
          <RedactionResultSection extra={log.extra} searchQuery={searchQuery} />

          {request ? (
            <form
              className="rounded-md border p-3"
              onSubmit={(event) => {
                event.preventDefault();
                void submitAction('continue', fieldValues);
              }}
            >
              <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                <KeyRound className="h-4 w-4 text-muted-foreground" />
                Human Input
              </div>
              <p className="mb-3 text-xs leading-5 text-muted-foreground">
                Playwright paused on this page and needs these values before it submits the form and crawls the result.
              </p>
              <div className="space-y-3">
                {requestedFields.map((field) => {
                  const isSecret = /pass|otp|mfa|2fa|token|code/i.test(field);
                  return (
                    <label key={field} className="block space-y-1.5">
                      <span className="text-xs font-medium text-muted-foreground">{field}</span>
                      <Input
                        type={isSecret ? 'password' : 'text'}
                        value={fieldValues[field] ?? ''}
                        onChange={(event) =>
                          setFieldValues((current) => ({ ...current, [field]: event.target.value }))
                        }
                      />
                    </label>
                  );
                })}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" type="submit" disabled={!onSubmitHumanInput || submittingAction !== null}>
                  Continue
                </Button>
                <Button
                  size="sm"
                  type="button"
                  variant="outline"
                  disabled={!onSubmitHumanInput || submittingAction !== null}
                  onClick={() => void submitAction('skip-branch')}
                >
                  Skip Branch
                </Button>
                <Button
                  size="sm"
                  type="button"
                  variant="outline"
                  disabled={!onSubmitHumanInput || submittingAction !== null}
                  onClick={() => void submitAction('stop-crawl')}
                >
                  Stop Crawl
                </Button>
              </div>
            </form>
          ) : null}
        </div>
      </ScrollArea>

      <div className="border-t p-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            copyText(
              `${new Date(log.createdAt).toLocaleTimeString()} [${log.type}] ${log.message}`
            );
          }}
        >
          <Clipboard className="h-4 w-4" />
          Copy Log
        </Button>
      </div>
    </div>
  );
}

export function ActivityLogPanel({ logs, searchQuery = '', onSubmitHumanInput }: ActivityLogPanelProps) {
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const selectedLog = selectedLogId ? logs.find((log) => log.id === selectedLogId) ?? null : null;

  return (
    <section className="flex h-full min-h-0 overflow-hidden border-t bg-background">
      {/* Table side — always visible, scrolls independently */}
      <div
        className="h-full min-h-0 overflow-hidden transition-all duration-300 ease-in-out"
        style={{ width: selectedLog ? '50%' : '100%' }}
      >
        <EventLogTable
          logs={[...logs].reverse().map((log) => ({ ...log, timestamp: log.createdAt }))}
          searchQuery={searchQuery}
          onRowClick={(row) => {
            const original = logs.find((l) => l.id === row.id);
            if (original) setSelectedLogId(original.id);
          }}
          emptyTitle="No Activity"
        />
      </div>

      {/* Detail side — slides in from the right, scrolls independently */}
      <div
        className="border-l h-full min-h-0 overflow-hidden transition-all duration-300 ease-in-out"
        style={{
          width: selectedLog ? '50%' : '0%',
          opacity: selectedLog ? 1 : 0,
        }}
      >
        {selectedLog && (
          <LogDetailPane
            log={selectedLog}
            onClose={() => setSelectedLogId(null)}
            onSubmitHumanInput={onSubmitHumanInput}
            searchQuery={searchQuery}
          />
        )}
      </div>
    </section>
  );
}
