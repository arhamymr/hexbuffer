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
import { useInvokerStore } from '@/stores/invoker';
import { findRequestPayloadPositions, parseRawRequest } from '../types';

export function InvokerRequestDialog() {
  const rawRequestDialogOpen = useInvokerStore((s) => {
    const tab = s.tabs.find((t) => t.id === s.activeTabId);
    return tab?.rawRequestDialogOpen ?? false;
  });
  const rawRequestContent = useInvokerStore((s) => {
    const tab = s.tabs.find((t) => t.id === s.activeTabId);
    return tab?.rawRequestContent ?? '';
  });
  const setRawRequestDialogOpen = useInvokerStore((s) => s.setRawRequestDialogOpen);
  const setRawRequestContent = useInvokerStore((s) => s.setRawRequestContent);
  const setBaseRequest = useInvokerStore((s) => s.setBaseRequest);
  const updateConfig = useInvokerStore((s) => s.updateConfig);

  const handleImport = () => {
    const parsed = parseRawRequest(rawRequestContent);
    if (parsed) {
      setBaseRequest(parsed as any);
      const positions = findRequestPayloadPositions(parsed);
      updateConfig({ positions });
    }
    setRawRequestDialogOpen(false);
    setRawRequestContent('');
  };

  return (
    <Dialog open={rawRequestDialogOpen} onOpenChange={setRawRequestDialogOpen}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>Import Raw HTTP Request</DialogTitle>
          <DialogDescription>
            Paste a raw HTTP request to use as the base. Use $ to mark payload positions.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Raw Request</Label>
            <textarea
              className="flex min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
              placeholder="GET /path?id=$123$ HTTP/1.1&#10;Host: example.com&#10;&#10;"
              value={rawRequestContent}
              onChange={(event) => setRawRequestContent(event.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setRawRequestDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={!rawRequestContent.trim()}>
            Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
