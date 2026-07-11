import { toast } from 'sonner';
import {
  PlusIcon,
  ArrowClockwiseIcon,
  TrashIcon,
  EyeIcon,
  EyeSlashIcon,
  CopyIcon,
  PencilSimpleIcon,
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
import { useHostsPanel } from './hooks/use-hosts-panel';

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
}: Props) {
  const {
    dialogOpen,
    checking,
    generating,
    showKeys,
    showFormKey,
    setShowFormKey,
    editingServer,
    form,
    handleDialogOpenChange,
    startAdd,
    startEdit,
    handleAdd,
    handleCheck,
    toggleShowKey,
    handleGeneratePayload,
  } = useHostsPanel({
    onAddServer,
    onUpdateServer,
    onCheckHealth,
    onCreatePayload,
  });

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

      <div className="min-h-0 flex-1 flex flex-col">
        {servers.length === 0 ? (
          <SetupGuide onAddHost={startAdd} />
        ) : (
          <div className="min-h-0 flex-1 overflow-auto p-3">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 items-start">
            {servers.map((s) => {
              const serverPayloads = payloads.filter((p) => p.serverId === s.id);

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

                    {/* Subdomains */}
                    <div className="border-t border-border/40 pt-2 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-muted-foreground">
                          Subdomains
                          {serverPayloads.filter(p => p.status === 'active').length > 0 && (
                            <span className="ml-1 text-muted-foreground/60">
                              ({serverPayloads.filter(p => p.status === 'active').length})
                            </span>
                          )}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 gap-1 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
                          onClick={() => handleGeneratePayload(s)}
                          disabled={generating === s.id}
                          title="Generate a new subdomain"
                        >
                          {generating === s.id ? (
                            <SpinnerGapIcon className="h-3 w-3 animate-spin" />
                          ) : (
                            <PlusIcon className="h-3 w-3" />
                          )}
                          New
                        </Button>
                      </div>

                      {serverPayloads.filter(p => p.status === 'active').length === 0 ? (
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground italic pl-1">
                          <SpinnerGapIcon className="h-3 w-3 animate-spin text-primary" />
                          <span>Generating first subdomain...</span>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {serverPayloads
                            .filter(p => p.status === 'active')
                            .map(p => (
                              <div
                                key={p.id}
                                className="flex items-center gap-1 rounded bg-muted/40 border border-border/30 p-1 pl-2"
                              >
                                <span
                                  className="font-mono text-[9px] text-foreground truncate select-all flex-1"
                                  title={p.payloadUrl}
                                >
                                  {p.payloadUrl}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5 shrink-0 text-muted-foreground hover:text-foreground"
                                  onClick={() => {
                                    navigator.clipboard.writeText(p.payloadUrl);
                                    toast.success('Subdomain URL copied');
                                  }}
                                  title="Copy subdomain URL"
                                >
                                  <CopyIcon className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5 shrink-0 text-muted-foreground hover:text-destructive"
                                  onClick={() => onDeletePayload(p.id)}
                                  title="Delete subdomain"
                                >
                                  <TrashIcon className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
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
          </div>
        )}
      </div>
    </div>
  );
}

const STEPS = [
  {
    n: '1',
    title: 'Add a Host',
    body: 'Connect your OOB listener server (e.g. interactsh, Burp Collaborator, or self-hosted).',
  },
  {
    n: '2',
    title: 'Copy Callback URL',
    body: 'Each host auto-generates a unique callback URL you can inject into target requests.',
  },
  {
    n: '3',
    title: 'Inject & Monitor',
    body: 'Paste the URL into a header, body, or parameter. Interactions appear in the Interactions tab.',
  },
];

function SetupGuide({ onAddHost }: { onAddHost: () => void }) {
  return (
    <div className="flex h-full items-start justify-center overflow-auto p-6">
      <div
        className="w-full max-w-lg"
        style={{
          animation: 'listener-guide-enter 280ms cubic-bezier(0.23, 1, 0.32, 1) both',
        }}
      >
        <style>{`
          @keyframes listener-guide-enter {
            from { opacity: 0; transform: translateY(6px); }
            to   { opacity: 1; transform: translateY(0); }
          }
        `}</style>

        {/* Header */}
        <div className="mb-5">
          <p className="text-sm font-semibold text-foreground">Out-of-Band Listener</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Detect blind vulnerabilities — SSRF, XXE, Log4Shell — by monitoring
            callback interactions from a remote server your targets reach out to.
          </p>
        </div>

        {/* Steps */}
        <div className="mb-5 space-y-0">
          {STEPS.map((step, i) => (
            <div
              key={step.n}
              className="flex gap-3"
              style={{ animationDelay: `${i * 55}ms` }}
            >
              {/* Spine */}
              <div className="flex flex-col items-center">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                  {step.n}
                </div>
                {i < STEPS.length - 1 && (
                  <div className="mt-1 mb-1 w-px flex-1 bg-border/60" />
                )}
              </div>
              {/* Content */}
              <div className="pb-4">
                <p className="text-xs font-semibold text-foreground">{step.title}</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{step.body}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Example snippet */}
        <div className="mb-5 rounded-md border border-border/60 bg-muted/30">
          <div className="flex items-center gap-1.5 border-b border-border/40 px-3 py-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Example — inject into a request
            </span>
          </div>
          <pre className="overflow-x-auto px-3 py-2.5 font-mono text-[10px] leading-relaxed text-foreground">
{`GET /api/fetch?url=https://YOUR_CALLBACK_URL HTTP/1.1
Host: target.example.com

# Or in a header:
X-Forwarded-For: https://YOUR_CALLBACK_URL

# Or in an XML body (XXE):
<!DOCTYPE foo [<!ENTITY xxe SYSTEM "https://YOUR_CALLBACK_URL"> ]>`}
          </pre>
        </div>

        <Button className="h-8 w-full gap-1.5 text-xs" onClick={onAddHost}>
          <PlusIcon className="h-3.5 w-3.5" />
          Add your first host
        </Button>
      </div>
    </div>
  );
}
