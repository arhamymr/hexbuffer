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
import type { ActivityLog, HumanInputRequest } from '../types';

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
