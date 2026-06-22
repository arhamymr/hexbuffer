import { useState } from 'react';
import { Copy, MoreHorizontal, Plus, Archive, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type {
  ListenerPayload,
  ListenerServer,
  CreatePayloadRequest,
} from '../types';

interface Props {
  payloads: ListenerPayload[];
  servers: ListenerServer[];
  onCreatePayload: (req: CreatePayloadRequest) => Promise<ListenerPayload>;
  onDeletePayload: (id: string) => Promise<void>;
  onArchivePayload: (id: string) => Promise<void>;
}

export function ListenerPayloads({
  payloads,
  servers,
  onCreatePayload,
  onDeletePayload,
  onArchivePayload,
}: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [serverId, setServerId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  const handleCreate = async () => {
    if (!serverId || !name) return;
    await onCreatePayload({
      serverId,
      name,
      description,
      tags: tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    });
    setDialogOpen(false);
    setServerId('');
    setName('');
    setDescription('');
    setTagsInput('');
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-10 shrink-0 items-center justify-between border-b bg-muted px-3 py-2">
        <span className="text-xs font-medium">
          {payloads.length} payload{payloads.length !== 1 ? 's' : ''}
        </span>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="h-7 gap-1 text-xs">
              <Plus className="h-3 w-3" />
              New Payload
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Payload</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Server</Label>
                <Select value={serverId} onValueChange={setServerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select server" />
                  </SelectTrigger>
                  <SelectContent>
                    {servers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. XSS on login page"
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional description"
                  className="text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Tags (comma-separated)</Label>
                <Input
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="xss, sqli, blind"
                  className="h-8 text-xs"
                />
              </div>
              <Button onClick={handleCreate} disabled={!serverId || !name} className="h-7 w-full">
                Create
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {payloads.length === 0 ? (
          <div className="flex h-full items-center justify-center p-2 text-xs text-muted-foreground">
            No payloads yet. Click "New Payload" to create one.
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-muted/50">
              <tr className="border-b">
                <th className="px-3 py-1.5 text-left font-medium">Identifier</th>
                <th className="px-3 py-1.5 text-left font-medium">Name</th>
                <th className="px-3 py-1.5 text-left font-medium">Payload URL</th>
                <th className="px-3 py-1.5 text-left font-medium">Status</th>
                <th className="px-3 py-1.5 text-left font-medium">Hits</th>
                <th className="px-3 py-1.5 text-left font-medium">Created</th>
                <th className="px-3 py-1.5" />
              </tr>
            </thead>
            <tbody>
              {payloads.map((p) => (
                <tr key={p.id} className="border-b hover:bg-muted/30">
                  <td className="px-3 py-1.5 font-mono">{p.identifier}</td>
                  <td className="px-3 py-1.5">{p.name}</td>
                  <td className="max-w-[320px] truncate px-3 py-1.5 font-mono text-[10px]">
                    {p.payloadUrl}
                  </td>
                  <td className="px-3 py-1.5">
                    <Badge variant={p.status === 'active' ? 'default' : 'secondary'}>
                      {p.status}
                    </Badge>
                  </td>
                  <td className="px-3 py-1.5">{p.interactionCount}</td>
                  <td className="px-3 py-1.5 text-muted-foreground">
                    {new Date(p.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-1.5">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-7 w-7">
                          <MoreHorizontal className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => navigator.clipboard.writeText(p.payloadUrl)}
                        >
                          <Copy className="mr-2 h-3 w-3" />
                          Copy URL
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onArchivePayload(p.id)}>
                          <Archive className="mr-2 h-3 w-3" />
                          Archive
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onDeletePayload(p.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-3 w-3" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
