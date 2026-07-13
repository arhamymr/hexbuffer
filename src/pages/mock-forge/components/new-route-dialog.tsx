import { useState } from 'react';
import { PlusIcon } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { HTTP_METHODS, DEFAULT_RESPONSE_BODY } from '../constants';
import type { MockDomain, MockRoute } from '../types';

interface NewRouteDialogProps {
  domains: MockDomain[];
  onAdd: (route: Omit<MockRoute, 'id'>) => void;
}

export function NewRouteDialog({ domains, onAdd }: NewRouteDialogProps) {
  const [open, setOpen] = useState(false);
  const [domainId, setDomainId] = useState(domains[0]?.id ?? '');
  const [method, setMethod] = useState<MockRoute['method']>('GET');
  const [path, setPath] = useState('/api/resource/:id');
  const [statusCode, setStatusCode] = useState('200');
  const [body, setBody] = useState(DEFAULT_RESPONSE_BODY);

  const handleAdd = () => {
    if (!path.trim() || !domainId) return;
    onAdd({
      domainId,
      method,
      path: path.trim(),
      statusCode: parseInt(statusCode, 10) || 200,
      responseBody: body,
      responseHeaders: { 'Content-Type': 'application/json' },
      matchers: [],
      enabled: true,
      matcherEnabled: true,
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <PlusIcon className="mr-1 h-3 w-3 stroke-[2]" />
          New Route
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg border-border bg-background">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold text-foreground">New Mock Route</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Domain</Label>
            <Select value={domainId} onValueChange={setDomainId}>
              <SelectTrigger className="h-9 bg-muted/40">
                <SelectValue placeholder="Select domain" />
              </SelectTrigger>
              <SelectContent>
                {domains.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.hostname}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-3">
            <div className="w-28 space-y-1.5">
              <Label className="text-xs text-muted-foreground">Method</Label>
              <Select value={method} onValueChange={(v) => setMethod(v as MockRoute['method'])}>
                <SelectTrigger className="h-9 bg-muted/40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HTTP_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 space-y-1.5">
              <Label className="text-xs text-muted-foreground">Path</Label>
              <Input
                placeholder="/api/resource/:id"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                className="h-9 font-mono text-sm bg-muted/40 focus-visible:ring-primary focus-visible:ring-1"
              />
            </div>
            <div className="w-20 space-y-1.5">
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Input
                value={statusCode}
                onChange={(e) => setStatusCode(e.target.value)}
                className="h-9 text-center font-mono text-sm bg-muted/40 focus-visible:ring-primary focus-visible:ring-1"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Response Body (JSON)</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              className="font-mono text-xs bg-muted/40 focus-visible:ring-primary focus-visible:ring-1"
            />
          </div>
          <Button className="w-full bg-primary hover:bg-primary-dark text-black font-semibold h-9 rounded-md mt-2 cursor-pointer" onClick={handleAdd}>
            Create Route
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
