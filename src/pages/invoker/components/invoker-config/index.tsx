'use client';

import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AttackTab,
  PayloadsTab,
  RequestTab,
} from './config/index';

export function InvokerConfigDialog({
  isRunning,
  progress,
  startBlockedReason,
}: {
  isRunning: boolean;
  progress: { current: number; total: number } | null;
  startBlockedReason: string | null;
}) {
  return (
   <div className="min-h-0 overflow-auto">
        {/* Progress badge */}
        {isRunning && progress && (
          <div className="mb-3">
            <Badge variant="secondary" className="animate-pulse rounded-sm">
              {progress.current} / {progress.total}
            </Badge>
          </div>
        )}

        {/* Start blocked warning */}
        {!isRunning && startBlockedReason && (
          <div className="mb-3 max-w-full items-center rounded-sm border border-amber-300/80 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-800 dark:border-amber-500/50 dark:bg-amber-500/10 dark:text-amber-200">
            {startBlockedReason}
          </div>
        )}
        <Tabs defaultValue="request">
          <TabsList className="grid grid-cols-2 mb-2">
            <TabsTrigger value="request">Request</TabsTrigger>
            <TabsTrigger value="attack">Config</TabsTrigger>
          </TabsList>

          <TabsContent value="request">
            <RequestTab />
          </TabsContent>

          <TabsContent value="attack">
            <div className="space-y-6">
              <AttackTab />
              <PayloadsTab />
            </div>
          </TabsContent>
        </Tabs>
      </div>
  );
}
