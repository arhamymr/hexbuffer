'use client';

import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import type { AttackResult } from '../types';
import { BruteForcePreviewPane } from './brute-force-preview-pane';

interface BruteForceResultDrawerProps {
  open: boolean;
  result: AttackResult | null;
  onOpenChange: (open: boolean) => void;
}

export function BruteForceResultDrawer({
  open,
  result,
  onOpenChange,
}: BruteForceResultDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="h-[88vh] max-h-[88vh]">
        <DrawerHeader className="border-b text-left">
          <DrawerTitle>Response Detail</DrawerTitle>
          <DrawerDescription>
            Full response for the selected brute-force result.
          </DrawerDescription>
        </DrawerHeader>
        <div className="min-h-0 flex-1 p-4">
          <BruteForcePreviewPane selectedResult={result} />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
