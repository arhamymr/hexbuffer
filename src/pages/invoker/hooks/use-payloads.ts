import * as React from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { readTextFile } from '@tauri-apps/plugin-fs';
import { toast } from 'sonner';
import { useInvokerStore } from '@/stores/invoker';

export function useInvokerPayloads() {
  const updateConfig = useInvokerStore((s) => s.updateConfig);
  const setPayloadDialogOpen = useInvokerStore((s) => s.setPayloadDialogOpen);

  const handleLoadPayloads = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }

      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        const content = loadEvent.target?.result as string;
        const values = content.split('\n').filter((line) => line.trim());

        const state = useInvokerStore.getState();
        const tab = state.tabs.find((t) => t.id === state.activeTabId);
        const config = tab?.config;

        updateConfig({
          payload_config: {
            ...config!.payload_config,
            values,
            file_path: undefined,
          },
        });
        setPayloadDialogOpen(false);
        toast.success(`${values.length} payloads loaded`);
      };
      reader.onerror = () => toast.error('Failed to read payload file');
      reader.readAsText(file);
      event.target.value = '';
    },
    [updateConfig, setPayloadDialogOpen],
  );

  const handleSelectPayloadFile = React.useCallback(async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [
          { name: 'Payload lists', extensions: ['txt', 'lst', 'wordlist'] },
          { name: 'All files', extensions: ['*'] },
        ],
      });

      if (!selected || Array.isArray(selected)) {
        return;
      }

      const content = await readTextFile(selected);
      const values = content.split(/\r?\n/).filter((line) => line.trim());

      const state = useInvokerStore.getState();
      const tab = state.tabs.find((t) => t.id === state.activeTabId);
      const config = tab?.config;

      updateConfig({
        payload_config: {
          ...config!.payload_config,
          values,
          file_path: selected,
        },
      });
      setPayloadDialogOpen(false);
      toast.success(`${values.length} payloads loaded`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(message || 'Failed to load payload file');
    }
  }, [updateConfig, setPayloadDialogOpen]);

  return {
    handleLoadPayloads,
    handleSelectPayloadFile,
  };
}
