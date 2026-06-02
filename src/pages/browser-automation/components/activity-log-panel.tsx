'use client';

import { Download, Search, Terminal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EventLogTable } from '@/pages/live-traffic/components/log-table/event-log-table';
import { LOG_TYPES } from '../constants';
import type { ActivityLog, ActivityLogType } from '../types';

type LogTypeFilter = ActivityLogType | 'all';

interface ActivityLogPanelProps {
  logs: ActivityLog[];
  search: string;
  typeFilter: LogTypeFilter;
  onSearchChange: (value: string) => void;
  onTypeFilterChange: (value: LogTypeFilter) => void;
  onCopyLog: (log: ActivityLog) => void;
  onExport: () => void;
}

export function ActivityLogPanel({
  logs,
  search,
  typeFilter,
  onSearchChange,
  onTypeFilterChange,
  onCopyLog,
  onExport,
}: ActivityLogPanelProps) {
  return (
    <section className="flex min-h-[260px] flex-col border-t bg-background">
      <div className="flex flex-col gap-2 border-b p-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="grid gap-2 sm:grid-cols-[260px_150px_auto]">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Search logs"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
            />
          </div>
          <Select value={typeFilter} onValueChange={(value) => onTypeFilterChange(value as LogTypeFilter)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {LOG_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={onExport} disabled={logs.length === 0}>
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        <EventLogTable
          logs={logs.map((log) => ({ ...log, timestamp: log.createdAt }))}
          onCopyLog={onCopyLog}
          emptyTitle="No matching activity"
          emptyDescription="No crawl log entries match the current filters."
        />
      </div>
    </section>
  );
}
