import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PlusIcon, ArrowClockwiseIcon, TrashIcon } from '@phosphor-icons/react';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import type { ListenerServer, CreateServerRequest } from '../types';

const serverFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required.'),
  url: z
    .string()
    .trim()
    .min(1, 'HardDrivesIcon URL is required.')
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
  onAddServer: (req: CreateServerRequest) => Promise<ListenerServer>;
  onDeleteServer: (id: string) => Promise<void>;
  onCheckHealth: (id: string) => Promise<ListenerServer>;
}

export function ListenerSettings({
  servers,
  onAddServer,
  onDeleteServer,
  onCheckHealth,
}: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [checking, setChecking] = useState<string | null>(null);
  const form = useForm<ServerFormValues>({
    resolver: zodResolver(serverFormSchema),
    defaultValues: serverFormDefaults,
    mode: 'onChange',
  });

  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      form.reset(serverFormDefaults);
    }
  };

  const handleAdd = async (values: ServerFormValues) => {
    form.clearErrors('root');
    try {
      await onAddServer({
        name: values.name.trim(),
        url: values.url.trim().replace(/\/$/, ''),
        apiKey: values.apiKey.trim(),
      });
    } catch (error) {
      form.setError('root', {
        message: error instanceof Error ? error.message : String(error),
      });
      return;
    }

    setDialogOpen(false);
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

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-10 shrink-0 items-center justify-between border-b bg-muted px-3 py-2">
        <span className="text-xs font-medium">
          {servers.length} server{servers.length !== 1 ? 's' : ''}
        </span>
        <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
          <DialogTrigger asChild>
            <Button variant="outline" className="h-7 gap-1 text-xs">
              <PlusIcon className="h-3 w-3" />
              Add Server
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Listener Server</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleAdd)} className="space-y-3">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Name</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="My Listener"
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
                    <FormItem>
                      <FormLabel className="text-xs">HardDrivesIcon URL</FormLabel>
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
                    <FormItem>
                      <FormLabel className="text-xs">API KeyIcon</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="password"
                          placeholder="••••••••"
                          className="h-8 text-xs"
                        />
                      </FormControl>
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
                  className="h-7 w-full"
                >
                  {form.formState.isSubmitting ? 'Connecting...' : 'Connect'}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-2">
        {servers.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            No servers configured. Add a listener server to get started.
          </div>
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {servers.map((s) => (
              <Card key={s.id} className="p-2">
                <CardContent className="space-y-2 p-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs font-medium">{s.name}</span>
                    <Badge variant={s.status === 'connected' ? 'default' : 'secondary'}>
                      {s.status}
                    </Badge>
                  </div>
                  <p className="truncate font-mono text-[10px] text-muted-foreground">{s.url}</p>
                  <p className="font-mono text-[10px] text-muted-foreground">
                    Key: {s.apiKey.slice(0, 4)}••••••
                  </p>
                  <div className="flex gap-2 pt-1">
                    <Button
                      variant="outline"
                      className="h-7 gap-1 text-[10px]"
                      onClick={() => handleCheck(s.id)}
                      disabled={checking === s.id}
                    >
                      <ArrowClockwiseIcon
                        className={`h-3 w-3 ${checking === s.id ? 'animate-spin' : ''}`}
                      />
                      CheckIcon
                    </Button>
                    <Button
                      variant="destructive"
                      className="h-7 gap-1 text-[10px]"
                      onClick={() => onDeleteServer(s.id)}
                    >
                      <TrashIcon className="h-3 w-3" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
