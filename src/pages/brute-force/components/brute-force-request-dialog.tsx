'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

interface BruteForceRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rawRequestContent: string;
  onRawRequestChange: (value: string) => void;
  onImport: () => void;
}

export function BruteForceRequestDialog({
  open,
  onOpenChange,
  rawRequestContent,
  onRawRequestChange,
  onImport,
}: BruteForceRequestDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>Import Raw HTTP Request</DialogTitle>
          <DialogDescription>
            Paste a raw HTTP request to use as the base. Use § to mark payload positions.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Raw Request</Label>
            <textarea
              className="flex min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
              placeholder="GET /path?id=§123§ HTTP/1.1&#10;Host: example.com&#10;&#10;"
              value={rawRequestContent}
              onChange={(event) => onRawRequestChange(event.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="xs" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="xs" onClick={onImport} disabled={!rawRequestContent.trim()}>
            Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
