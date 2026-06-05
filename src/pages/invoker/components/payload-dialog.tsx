'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useInvokerStore } from '@/stores/invoker';
import { useInvokerPayloads } from '../hooks/use-payloads';

export function InvokerPayloadDialog() {
  const payloadDialogOpen = useInvokerStore((s) => {
    const tab = s.tabs.find((t) => t.id === s.activeTabId);
    return tab?.payloadDialogOpen ?? false;
  });
  const setPayloadDialogOpen = useInvokerStore((s) => s.setPayloadDialogOpen);
  const { handleLoadPayloads, handleSelectPayloadFile } = useInvokerPayloads();

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
