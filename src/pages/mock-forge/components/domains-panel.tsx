import { useState } from 'react';
import {
  PlusIcon,
  TrashIcon,
  LockSimpleIcon,
  LockSimpleOpenIcon,
  GlobeIcon,
} from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { MockDomain } from '../types';

interface DomainsProps {
  domains: MockDomain[];
  onToggle: (id: string) => void;
  onAdd: (hostname: string, ssl: boolean) => void;
  onDelete: (id: string) => void;
  selectedDomainId: string | null;
  onSelect: (id: string) => void;
}

export function DomainsPanel({
  domains,
  onToggle,
  onAdd,
  onDelete,
  selectedDomainId,
  onSelect,
}: DomainsProps) {
  const [open, setOpen] = useState(false);
  const [hostname, setHostname] = useState('');
  const [ssl, setSsl] = useState(true);

  const handleAdd = () => {
    if (!hostname.trim()) return;
    onAdd(hostname.trim(), ssl);
    setHostname('');
    setSsl(true);
    setOpen(false);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <p className="text-sm font-medium">Local Domains</p>
          <p className="text-xs text-muted-foreground">
            Provision custom hostnames that route to your mock rules
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <PlusIcon className="mr-1.5 h-3.5 w-3.5" />
              Add Domain
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>New Mock Domain</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="mf-hostname">Hostname</Label>
                <Input
                  id="mf-hostname"
                  placeholder="api.my-service.local"
                  value={hostname}
                  onChange={(e) => setHostname(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                />
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  id="mf-ssl"
                  checked={ssl}
                  onCheckedChange={setSsl}
                />
                <Label htmlFor="mf-ssl" className="cursor-pointer">
                  Enable HTTPS (self-signed cert)
                </Label>
              </div>
              <Button className="w-full" onClick={handleAdd}>
                Create Domain
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* List */}
      <ScrollArea className="flex-1">
        {domains.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
            <GlobeIcon className="h-8 w-8 opacity-40" />
            <p className="text-sm">No domains yet — add one above</p>
          </div>
        ) : (
          <div className="divide-y">
            {domains.map((domain) => (
              <div
                key={domain.id}
                className={`group flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40 ${
                  selectedDomainId === domain.id ? 'bg-muted/60' : ''
                }`}
                onClick={() => onSelect(domain.id)}
              >
                {/* SSL icon */}
                <div className="shrink-0 text-muted-foreground">
                  {domain.ssl ? (
                    <LockSimpleIcon className="h-4 w-4 text-green-500" />
                  ) : (
                    <LockSimpleOpenIcon className="h-4 w-4 text-yellow-500" />
                  )}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-sm">{domain.hostname}</p>
                  <p className="text-xs text-muted-foreground">
                    {domain.ssl ? 'https' : 'http'}://
                    {domain.hostname}
                  </p>
                </div>

                {/* Status badge */}
                <Badge
                  variant={domain.status === 'active' ? 'default' : 'secondary'}
                  className="shrink-0 text-[10px]"
                >
                  {domain.status}
                </Badge>

                {/* Toggle */}
                <Switch
                  checked={domain.status === 'active'}
                  onCheckedChange={() => onToggle(domain.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="shrink-0"
                />

                {/* Delete */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(domain.id);
                  }}
                >
                  <TrashIcon className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
