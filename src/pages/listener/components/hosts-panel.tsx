import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  PlusIcon,
  ArrowClockwiseIcon,
  TrashIcon,
  EyeIcon,
  EyeSlashIcon,
  CopyIcon,
  PencilSimpleIcon,
  CaretDownIcon,
  CaretRightIcon,
  ArchiveIcon,
  SpinnerGapIcon,
} from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type {
  ListenerServer,
  CreateServerRequest,
  ListenerPayload,
  CreatePayloadRequest,
} from '../types';

const serverFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required.'),
  url: z
    .string()
    .trim()
    .min(1, 'Server URL is required.')
    .refine((value) => {
      try {
        const url = new URL(value);
        return ['http:', 'https:'].includes(url.protocol);
      } catch {
        return false;
      }
    }, 'Enter a valid HTTP or HTTPS URL.'),
  apiKey: z.string().trim().min(1, 'API key is required.'),
});

type ServerFormValues = z.infer<typeof serverFormSchema>;

const serverFormDefaults: ServerFormValues = {
  name: '',
  url: '',
  apiKey: '',
};

interface Props {
  servers: ListenerServer[];
  payloads: ListenerPayload[];
  onAddServer: (req: CreateServerRequest) => Promise<ListenerServer>;
  onUpdateServer: (server: ListenerServer) => Promise<ListenerServer>;
  onDeleteServer: (id: string) => Promise<void>;
  onCheckHealth: (id: string) => Promise<ListenerServer>;
  onCreatePayload: (req: CreatePayloadRequest) => Promise<ListenerPayload>;
  onDeletePayload: (id: string) => Promise<void>;
  onArchivePayload: (id: string) => Promise<void>;
}

export function ListenerHosts({
  servers,
  payloads,
  onAddServer,
  onUpdateServer,
  onDeleteServer,
  onCheckHealth,
  onCreatePayload,
  onDeletePayload,
  onArchivePayload,
}: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [checking, setChecking] = useState<string | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [showFormKey, setShowFormKey] = useState(false);
  const [editingServer, setEditingServer] = useState<ListenerServer | null>(null);
  const [expandedPayloads, setExpandedPayloads] = useState<Record<string, boolean>>({});

  const form = useForm<ServerFormValues>({
    resolver: zodResolver(serverFormSchema),
    defaultValues: serverFormDefaults,
    mode: 'onChange',
  });

  const generateRandomApiKey = () => {
    const chars = 'abcdef0123456789';
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
  };

  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open);
    setShowFormKey(false);
    if (!open) {
      setEditingServer(null);
      form.reset(serverFormDefaults);
    }
  };

  const startAdd = () => {
    setEditingServer(null);
    form.reset({
      name: '',
      url: '',
      apiKey: generateRandomApiKey(),
    });
    setDialogOpen(true);
  };

  const startEdit = (server: ListenerServer) => {
    setEditingServer(server);
    form.reset({
      name: server.name,
      url: server.url,
      apiKey: server.apiKey,
    });
    setDialogOpen(true);
  };

  const handleAdd = async (values: ServerFormValues) => {
    form.clearErrors('root');
    try {
      if (editingServer) {
        await onUpdateServer({
          ...editingServer,
          name: values.name.trim(),
          url: values.url.trim().replace(/\/$/, ''),
          apiKey: values.apiKey.trim(),
        });
        toast.success('Host configuration updated');
      } else {
        await onAddServer({
          name: values.name.trim(),
          url: values.url.trim().replace(/\/$/, ''),
          apiKey: values.apiKey.trim(),
        });
        toast.success('Host connected');
      }
    } catch (error) {
      form.setError('root', {
        message: error instanceof Error ? error.message : String(error),
      });
      return;
    }

    setDialogOpen(false);
    setEditingServer(null);
    form.reset(serverFormDefaults);
  };

  const handleCheck = async (id: string) => {
    setChecking(id);
    try {
      await onCheckHealth(id);
    } finally {
      setChecking(null);
    }
  };

  const toggleShowKey = (id: string) => {
    setShowKeys((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleExpandPayloads = (id: string) => {
    setExpandedPayloads((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // ponytail: inline generator simplifies user flow & removes payloads tab
  const handleGeneratePayload = async (server: ListenerServer) => {
    setGenerating(server.id);
    try {
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      await onCreatePayload({
        serverId: server.id,
        name: `Payload [${timeStr}]`,
        description: `Generated for ${server.name}`,
        tags: [],
      });
      toast.success('Callback payload URL generated');
      // ensure expanded to show the generated payload
      setExpandedPayloads((prev) => ({ ...prev, [server.id]: true }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to generate payload');
    } finally {
      setGenerating(null);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="flex h-10 shrink-0 items-center justify-between border-b bg-muted/40 px-3 py-2">
        <span className="text-xs font-mono font-medium text-muted-foreground">
          {servers.length} host{servers.length !== 1 ? 's' : ''} configured
        </span>
        <Button variant="outline" className="h-7 gap-1 text-xs" onClick={startAdd}>
          <PlusIcon className="h-3.5 w-3.5" />
          Add Host
        </Button>

        <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-sm font-semibold">
                {editingServer ? 'Edit Listener Host' : 'Add Listener Host'}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleAdd)} className="space-y-3 pt-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-xs text-muted-foreground">Name</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="My Listener Server"
                          className="h-8 text-xs"
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="url"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-xs text-muted-foreground">Host URL / IP Address</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="https://collab.example.com"
                          className="h-8 text-xs"
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="apiKey"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-xs text-muted-foreground">API / Secret Key</FormLabel>
                      <div className="flex gap-1.5">
                        <FormControl>
                          <Input
                            {...field}
                            type={showFormKey ? 'text' : 'password'}
                            placeholder="••••••••"
                            className="h-8 text-xs flex-1"
                          />
                        </FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-8 w-8 p-0"
                          onClick={() => setShowFormKey(!showFormKey)}
                          title={showFormKey ? 'Hide Key' : 'Show Key'}
                        >
                          {showFormKey ? (
                            <EyeSlashIcon className="h-3.5 w-3.5" />
                          ) : (
                            <EyeIcon className="h-3.5 w-3.5" />
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-8 w-8 p-0"
                          onClick={() => {
                            navigator.clipboard.writeText(field.value);
                            toast.success('Key copied to clipboard');
                          }}
                          disabled={!field.value}
                          title="Copy Key"
                        >
                          <CopyIcon className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                {form.formState.errors.root?.message && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.root.message}
                  </p>
                )}
                <Button
                  type="submit"
                  disabled={form.formState.isSubmitting}
                  className="h-8 w-full text-xs mt-2"
                >
                  {form.formState.isSubmitting
                    ? 'Connecting...'
                    : editingServer
                      ? 'Save Changes'
                      : 'Connect Host'}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-3">
        {servers.length === 0 ? (
          <div className="flex h-full items-center justify-center p-4 text-xs text-muted-foreground">
            No hosts configured. Add a listener server host to get started.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 items-start">
            {servers.map((s) => {
              const serverPayloads = payloads.filter((p) => p.serverId === s.id);
              const isExpanded = expandedPayloads[s.id] ?? false;

              return (
                <Card key={s.id} className="border bg-card text-card-foreground shadow-sm">
                  <CardContent className="space-y-3 p-3">
                    {/* Header */}
                    <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2">
                      <div className="min-w-0 flex-1">
                        <span className="truncate block text-xs font-semibold">{s.name}</span>
                        <p
                          className="truncate font-mono text-[9px] text-muted-foreground mt-0.5"
                          title={s.url}
                        >
                          {s.url}
                        </p>
                      </div>
                      <Badge
                        variant={s.status === 'connected' ? 'default' : 'secondary'}
                        className="text-[9px] uppercase font-semibold shrink-0"
                      >
                        {s.status}
                      </Badge>
                    </div>

                    {/* API keys / server metadata */}
                    <div className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground/80">
                      <span>API Key:</span>
                      <span className="select-all">
                        {showKeys[s.id] ? s.apiKey : `${s.apiKey.slice(0, 4)}••••••`}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4.5 w-4.5 text-muted-foreground hover:text-foreground ml-auto"
                        onClick={() => toggleShowKey(s.id)}
                        title={showKeys[s.id] ? 'Hide Key' : 'Show Key'}
                      >
                        {showKeys[s.id] ? (
                          <EyeSlashIcon className="h-3 w-3" />
                        ) : (
                          <EyeIcon className="h-3 w-3" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4.5 w-4.5 text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          navigator.clipboard.writeText(s.apiKey);
                          toast.success('Key copied to clipboard');
                        }}
                        title="Copy Key"
                      >
                        <CopyIcon className="h-3 w-3" />
                      </Button>
                    </div>

                    {/* Payloads Section inside Host card */}
                    <div className="border-t border-border/40 pt-2 space-y-2">
                      <div className="flex items-center justify-between">
                        <button
                          className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
                          onClick={() => toggleExpandPayloads(s.id)}
                        >
                          {isExpanded ? (
                            <CaretDownIcon className="h-3.5 w-3.5" />
                          ) : (
                            <CaretRightIcon className="h-3.5 w-3.5" />
                          )}
                          Payload URLs ({serverPayloads.length})
                        </button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-1.5 text-[10px] gap-1 text-primary hover:text-primary-foreground hover:bg-primary"
                          onClick={() => handleGeneratePayload(s)}
                          disabled={generating === s.id}
                        >
                          {generating === s.id ? (
                            <SpinnerGapIcon className="h-3 w-3 animate-spin" />
                          ) : (
                            <PlusIcon className="h-3 w-3" />
                          )}
                          Generate URL
                        </Button>
                      </div>

                      {isExpanded && (
                        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                          {serverPayloads.length === 0 ? (
                            <p className="text-[10px] text-muted-foreground italic pl-4 py-1">
                              No payload URLs generated yet.
                            </p>
                          ) : (
                            serverPayloads.map((p) => (
                              <div
                                key={p.id}
                                className="flex items-center gap-1.5 rounded bg-muted/40 p-1 pl-2 text-[10px] hover:bg-muted transition-colors border border-transparent hover:border-border/30"
                              >
                                <div className="min-w-0 flex-1">
                                  <span className="font-medium text-foreground block truncate" title={p.name}>
                                    {p.name}
                                  </span>
                                  <span className="font-mono text-[9px] text-muted-foreground block truncate select-all">
                                    {p.payloadUrl}
                                  </span>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5 shrink-0 text-muted-foreground hover:text-foreground"
                                  onClick={() => {
                                    navigator.clipboard.writeText(p.payloadUrl);
                                    toast.success('Payload URL copied');
                                  }}
                                  title="Copy URL"
                                >
                                  <CopyIcon className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5 shrink-0 text-muted-foreground hover:text-destructive"
                                  onClick={() => onArchivePayload(p.id)}
                                  title="Archive Payload"
                                >
                                  <ArchiveIcon className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5 shrink-0 text-muted-foreground hover:text-destructive"
                                  onClick={() => onDeletePayload(p.id)}
                                  title="Delete Payload"
                                >
                                  <TrashIcon className="h-3 w-3" />
                                </Button>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2 border-t border-border/40">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 flex-1 gap-1 text-[10px]"
                        onClick={() => handleCheck(s.id)}
                        disabled={checking === s.id}
                      >
                        <ArrowClockwiseIcon
                          className={`h-3 w-3 ${checking === s.id ? 'animate-spin' : ''}`}
                        />
                        Check Status
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 flex-1 gap-1 text-[10px]"
                        onClick={() => startEdit(s)}
                      >
                        <PencilSimpleIcon className="h-3 w-3" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-[10px] text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => onDeleteServer(s.id)}
                      >
                        <TrashIcon className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
