"use client";

import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { LogEntryBurpView } from './LogEntryBurpView';
import type { ApiCall } from '@/types';

interface LogDetailDrawerProps {
  call: ApiCall | null;
  onClose: () => void;
}

export function LogDetailDrawer({ call, onClose }: LogDetailDrawerProps) {
  return (
    <Drawer open={call !== null} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="w-full h-full max-h-[60vh]">
        <div className="p-4 overflow-y-auto h-full">
          {call && <LogEntryBurpView call={call} />}
        </div>
      </DrawerContent>
    </Drawer>
  );
}