import { useState } from 'react';
import {
  PlusIcon,
  TrashIcon,
  LockSimpleIcon,
  LockSimpleOpenIcon,
  GlobeIcon,
  MagnifyingGlassIcon,
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
import type { MockDomain, MockRoute } from '../types';

interface DomainsProps {
  domains: MockDomain[];
  routes: MockRoute[];
  onToggle: (id: string) => void;
  onAdd: (hostname: string, ssl: boolean) => void;
  onDelete: (id: string) => void;
  selectedDomainId: string | null;
  onSelect: (id: string) => void;
}

export function DomainsPanel({
  domains,
  routes,
  onToggle,
  onAdd,
  onDelete,
  selectedDomainId,
  onSelect,
}: DomainsProps) {
  const [open, setOpen] = useState(false);
  const [hostname, setHostname] = useState('');
  const [ssl, setSsl] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const handleAdd = () => {
    if (!hostname.trim()) return;
    onAdd(hostname.trim(), ssl);
    setHostname('');
    setSsl(true);
    setOpen(false);
  };

  const filteredDomains = domains.filter((d) =>
    d.hostname.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      {/* Top Header Controls */}
      <div className="flex flex-col gap-3 border-b p-3 bg-muted/10">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Local Mock Domains</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Provision custom hostnames that route mock traffic to your mock rule definitions.
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-primary hover:bg-primary-dark text-black font-semibold h-8 rounded-md px-3 cursor-pointer">
                <PlusIcon className="mr-1.5 h-3.5 w-3.5 stroke-[2]" />
                Add Domain
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-sm border-border bg-background">
              <DialogHeader>
                <DialogTitle className="text-sm font-bold text-foreground">New Mock Domain</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="mf-hostname" className="text-xs text-muted-foreground">Hostname</Label>
                  <Input
                    id="mf-hostname"
                    placeholder="api.my-service.local"
                    value={hostname}
                    onChange={(e) => setHostname(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                    className="h-9 font-mono text-sm bg-muted/40 focus-visible:ring-primary focus-visible:ring-1"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    id="mf-ssl"
                    checked={ssl}
                    onCheckedChange={setSsl}
                  />
                  <Label htmlFor="mf-ssl" className="cursor-pointer text-xs text-foreground font-medium">
                    Enable HTTPS (Generate self-signed certificate)
                  </Label>
                </div>
                <Button className="w-full bg-primary hover:bg-primary-dark text-black font-semibold h-9 rounded-md mt-2 cursor-pointer" onClick={handleAdd}>
                  Create Domain
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search domains..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-xs bg-muted/30 focus-visible:ring-primary focus-visible:ring-1 border-border"
          />
        </div>
      </div>

      {/* List Column Headers */}
      {filteredDomains.length > 0 && (
        <div className="flex items-center px-4 py-2 border-b text-[10px] font-bold text-muted-foreground uppercase tracking-wider bg-muted/10">
          <div className="w-8 shrink-0">SSL</div>
          <div className="flex-1">Hostname</div>
          <div className="w-32 text-center">Routes Mapped</div>
          <div className="w-20 text-center">Status</div>
          <div className="w-10 shrink-0"></div>
        </div>
      )}

      {/* List */}
      <ScrollArea className="flex-1">
        {filteredDomains.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
            <GlobeIcon className="h-8 w-8 opacity-40 text-muted-foreground" />
            <p className="text-sm font-medium">
              {searchQuery ? 'No domains match search query' : 'No domains yet — add one above'}
            </p>
          </div>
        ) : (
          <div className="divide-y border-b">
            {filteredDomains.map((domain) => {
              const domainRoutesCount = routes.filter((r) => r.domainId === domain.id).length;
              const isSelected = selectedDomainId === domain.id;
              return (
                <div
                  key={domain.id}
                  className={`group flex items-center px-4 py-2.5 transition-colors hover:bg-muted/30 cursor-pointer ${
                    isSelected ? 'bg-muted/40' : ''
                  }`}
                  onClick={() => onSelect(domain.id)}
                >
                  {/* SSL status icon */}
                  <div className="w-8 shrink-0 flex items-center">
                    {domain.ssl ? (
                      <div className="flex items-center justify-center h-5 w-5 rounded bg-green-500/10 text-green-400 border border-green-500/20" title="HTTPS Enabled">
                        <LockSimpleIcon className="h-3 w-3" />
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-5 w-5 rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/20" title="HTTP (No SSL)">
                        <LockSimpleOpenIcon className="h-3 w-3" />
                      </div>
                    )}
                  </div>

                  {/* Hostname info */}
                  <div className="min-w-0 flex-1 pl-1">
                    <p className="truncate font-mono text-sm font-medium text-foreground">{domain.hostname}</p>
                    <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                      {domain.ssl ? 'https' : 'http'}://{domain.hostname}
                    </p>
                  </div>

                  {/* Routes mapped count */}
                  <div className="w-32 text-center flex justify-center">
                    <Badge className={`text-[10px] font-mono font-medium rounded-[4px] px-1.5 py-0.5 leading-none bg-muted text-muted-foreground border-none`}>
                      {domainRoutesCount} {domainRoutesCount === 1 ? 'route' : 'routes'}
                    </Badge>
                  </div>

                  {/* Status Toggle Switch */}
                  <div className="w-20 flex justify-center items-center">
                    <Switch
                      checked={domain.status === 'active'}
                      onCheckedChange={() => onToggle(domain.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="shrink-0"
                    />
                  </div>

                  {/* Action buttons (Delete) */}
                  <div className="w-10 shrink-0 flex justify-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-150 rounded cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(domain.id);
                      }}
                    >
                      <TrashIcon className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
