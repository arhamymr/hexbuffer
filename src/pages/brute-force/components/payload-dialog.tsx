'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useBruteForceStore } from '@/stores/bruto-force';
import { useBruteForcePayloads } from '../hooks/use-brute-force-payloads';

export function BruteForcePayloadDialog() {
  const payloadDialogOpen = useBruteForceStore((s) => {
    const tab = s.tabs.find((t) => t.id === s.activeTabId);
    return tab?.payloadDialogOpen ?? false;
  });
  const setPayloadDialogOpen = useBruteForceStore((s) => s.setPayloadDialogOpen);
  const { handleLoadPayloads, handleSelectPayloadFile } = useBruteForcePayloads();

  return (
    <Dialog open={payloadDialogOpen} onOpenChange={setPayloadDialogOpen}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Load Payloads from File</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Button type="button" size="xs" onClick={handleSelectPayloadFile}>
            Choose File
          </Button>
          <input type="file" onChange={handleLoadPayloads} accept=".txt,.lst,.wordlist" />
        </div>
        <DialogFooter>
          <Button variant="outline" size="xs" onClick={() => setPayloadDialogOpen(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
