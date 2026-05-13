"use client";

import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from '@/components/ui/drawer';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ApiCall } from '@/types';

interface JsonDetailDrawerProps {
  call: ApiCall | null;
  onClose: () => void;
}

export function JsonDetailDrawer({ call, onClose }: JsonDetailDrawerProps) {
  return (
    <Drawer open={call !== null} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="w-full max-h-[90vh]">
        <ScrollArea className="h-full p-4">
          {call && (
            <pre className="text-xs font-mono whitespace-pre-wrap">
              {JSON.stringify(call, null, 2)}
            </pre>
          )}
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
}