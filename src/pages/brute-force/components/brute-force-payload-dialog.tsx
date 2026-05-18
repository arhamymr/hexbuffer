'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface BruteForcePayloadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLoadPayloads: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export function BruteForcePayloadDialog({
  open,
  onOpenChange,
  onLoadPayloads,
}: BruteForcePayloadDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Load Payloads from File</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <input type="file" onChange={onLoadPayloads} accept=".txt,.lst,.wordlist" />
        </div>
        <DialogFooter>
          <Button variant="outline" size="xs" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
