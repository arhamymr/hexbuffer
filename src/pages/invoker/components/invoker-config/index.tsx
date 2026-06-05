'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AttackTab,
  PayloadsTab,
  RequestTab,
} from './config/index';

export function InvokerConfigDialog() {
  return (
    <div className="flex h-full min-h-0 flex-col rounded-lg border bg-background">
      <div className="min-h-0 overflow-auto p-3">
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
    </div>
  );
}
