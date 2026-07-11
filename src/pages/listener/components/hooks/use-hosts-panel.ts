import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import type {
  ListenerServer,
  CreateServerRequest,
  CreatePayloadRequest,
  ListenerPayload,
} from '../../types';

export const serverFormSchema = z.object({
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

export type ServerFormValues = z.infer<typeof serverFormSchema>;

export const serverFormDefaults: ServerFormValues = {
  name: '',
  url: '',
  apiKey: '',
};

interface UseHostsPanelParams {
  onAddServer: (req: CreateServerRequest) => Promise<ListenerServer>;
  onUpdateServer: (server: ListenerServer) => Promise<ListenerServer>;
  onCheckHealth: (id: string) => Promise<ListenerServer>;
  onCreatePayload: (req: CreatePayloadRequest) => Promise<ListenerPayload>;
}

export function useHostsPanel({
  onAddServer,
  onUpdateServer,
  onCheckHealth,
  onCreatePayload,
}: UseHostsPanelParams) {
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

  return {
    dialogOpen,
    checking,
    generating,
    showKeys,
    showFormKey,
    setShowFormKey,
    editingServer,
    expandedPayloads,
    form,
    handleDialogOpenChange,
    startAdd,
    startEdit,
    handleAdd,
    handleCheck,
    toggleShowKey,
    toggleExpandPayloads,
    handleGeneratePayload,
  };
}
