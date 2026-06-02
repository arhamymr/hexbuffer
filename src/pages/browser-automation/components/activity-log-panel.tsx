'use client';

import { useState } from 'react';
import { Clipboard } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { ScrollArea } from '@/components/ui/scroll-area';
import { EventLogTable } from '@/pages/live-traffic/components/log-table/event-log-table';
import { cn } from '@/lib/utils';
import { copyText } from '@/lib/clipboard';
import type { ActivityLog } from '../types';

interface ActivityLogPanelProps {
  logs: ActivityLog[];
}

const levelStyles: Record<string, string> = {
  info: 'border-sky-500/25 text-sky-700 dark:text-sky-300',
  warning: 'border-amber-500/25 text-amber-700 dark:text-amber-300',
  error: 'border-red-500/25 text-red-700 dark:text-red-300',
};

function DetailRow({ label, value }: { label: string; value: string | undefined }) {
  return (
    <div className="grid grid-cols-[100px_minmax(0,1fr)] gap-3 border-b py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words font-mono text-xs">{value ?? '-'}</span>
    </div>
  );
}

export function ActivityLogPanel({ logs }: ActivityLogPanelProps) {
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);

  return (
    <section className="flex min-h-[260px] flex-col border-t bg-background">
      <div className="min-h-0 flex-1">
        <EventLogTable
          logs={logs.map((log) => ({ ...log, timestamp: log.createdAt }))}
          onCopyLog={(row) => {
            const original = logs.find((l) => l.id === row.id);
            if (original) {
              copyText(`${new Date(original.createdAt).toLocaleTimeString()} [${original.type}] ${original.message}`);
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

      <Drawer open={Boolean(selectedLog)} onOpenChange={(open) => !open && setSelectedLog(null)} direction="right">
        <DrawerContent className="sm:max-w-xl">
          {selectedLog && (
            <>
              <DrawerHeader>
                <DrawerTitle className="flex items-center gap-2">
                  Activity Detail
                  <Badge
                    variant="outline"
                    className={cn('h-5 px-1.5 text-[10px] capitalize', levelStyles[selectedLog.level])}
                  >
                    {selectedLog.level}
                  </Badge>
                  <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                    {selectedLog.type}
                  </Badge>
                </DrawerTitle>
                <DrawerDescription className="font-mono text-xs">
                  {selectedLog.message}
                </DrawerDescription>
              </DrawerHeader>

              <ScrollArea className="min-h-0 flex-1 px-4">
                <div className="space-y-4 pb-4">
                  <div className="rounded-md border p-3">
                    <DetailRow label="ID" value={selectedLog.id} />
                    <DetailRow label="Session" value={selectedLog.sessionId} />
                    <DetailRow label="Level" value={selectedLog.level} />
                    <DetailRow label="Type" value={selectedLog.type} />
                    <DetailRow label="URL" value={selectedLog.url} />
                    <DetailRow label="Timestamp" value={new Date(selectedLog.createdAt).toLocaleString()} />
                  </div>

                  <div className="rounded-md border p-3">
                    <div className="mb-2 text-sm font-medium">Message</div>
                    <p className="whitespace-pre-wrap font-mono text-xs leading-6 text-muted-foreground">
                      {selectedLog.message}
                    </p>
                  </div>
                </div>
              </ScrollArea>

              <DrawerFooter>
                <Button variant="outline" onClick={() => {
                  copyText(`${new Date(selectedLog.createdAt).toLocaleTimeString()} [${selectedLog.type}] ${selectedLog.message}`);
                }}>
                  <Clipboard className="h-4 w-4" />
                  Copy Log
                </Button>
              </DrawerFooter>
            </>
          )}
        </DrawerContent>
      </Drawer>
    </section>
  );
}
