'use client';

import { useState } from 'react';
import { Clipboard, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ActivityStatusBadge, LevelBadge } from '@/components/status-badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { EventLogTable } from '@/pages/live-traffic/components/log-table/event-log-table';
import { copyText } from '@/lib/clipboard';
import type { ActivityLog } from '../types';

interface ActivityLogPanelProps {
  logs: ActivityLog[];
}

function DetailRow({ label, value }: { label: string; value: string | undefined }) {
  return (
    <div className="grid grid-cols-[100px_minmax(0,1fr)] gap-3 border-b py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words font-mono text-xs">{value ?? '-'}</span>
    </div>
  );
}

function LogDetailPane({
  log,
  onClose,
}: {
  log: ActivityLog;
  onClose: () => void;
}) {
  return (
    <div className="flex h-full flex-col border rounded-md bg-background">
      <div className="flex items-center justify-between border-b px-4 py-2">
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
            {log.message}
          </p>

          <div className="rounded-md border p-3">
            <DetailRow label="ID" value={log.id} />
            <DetailRow label="Session" value={log.sessionId} />
            <DetailRow label="Level" value={log.level} />
            <DetailRow label="Type" value={log.type} />
            <DetailRow label="URL" value={log.url} />
            <DetailRow label="Timestamp" value={new Date(log.createdAt).toLocaleString()} />
          </div>

          <div className="rounded-md border p-3">
            <div className="mb-2 text-sm font-medium">Message</div>
            <p className="whitespace-pre-wrap font-mono text-xs leading-6 text-muted-foreground">
              {log.message}
            </p>
          </div>
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

export function ActivityLogPanel({ logs }: ActivityLogPanelProps) {
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);

  return (
    <section className="flex h-full min-h-0 overflow-hidden border-t bg-background">
      {/* Table side — always visible, scrolls independently */}
      <div
        className="h-full min-h-0 overflow-hidden transition-all duration-300 ease-in-out"
        style={{ width: selectedLog ? '50%' : '100%' }}
      >
        <EventLogTable
          logs={[...logs].reverse().map((log) => ({ ...log, timestamp: log.createdAt }))}
          onCopyLog={(row) => {
            const original = logs.find((l) => l.id === row.id);
            if (original) {
              copyText(
                `${new Date(original.createdAt).toLocaleTimeString()} [${original.type}] ${original.message}`
              );
            }
          }}
          onRowClick={(row) => {
            const original = logs.find((l) => l.id === row.id);
            if (original) setSelectedLog(original);
          }}
          emptyTitle="No matching activity"
          emptyDescription="No crawl log entries match the current filters."
        />
      </div>

      {/* Detail side — slides in from the right, scrolls independently */}
      <div
        className="p-2 border-l bg-muted h-full min-h-0 overflow-hidden transition-all duration-300 ease-in-out"
        style={{
          width: selectedLog ? '50%' : '0%',
          opacity: selectedLog ? 1 : 0,
        }}
      >
        {selectedLog && (
          <LogDetailPane
            log={selectedLog}
            onClose={() => setSelectedLog(null)}
          />
        )}
      </div>
    </section>
  );
}
