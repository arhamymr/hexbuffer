'use client';

import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { useBruteForceStore } from '@/stores/bruto-force';
import { BruteForcePreviewPane } from './brute-force-preview-panel';

export function BruteForceResultDrawer() {
  const selectedResult = useBruteForceStore((s) => {
    const tab = s.tabs.find((t) => t.id === s.activeTabId);
    return tab?.selectedResult ?? null;
  });
  const setSelectedResult = useBruteForceStore((s) => s.setSelectedResult);

  return (
    <Drawer
      open={Boolean(selectedResult)}
      onOpenChange={(open) => {
        if (!open) {
          setSelectedResult(null);
        }
      }}
    >
      <DrawerContent className="h-[88vh] max-h-[88vh]">
        <div className="min-h-0 flex-1 flex flex-col p-4">
          <BruteForcePreviewPane />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
