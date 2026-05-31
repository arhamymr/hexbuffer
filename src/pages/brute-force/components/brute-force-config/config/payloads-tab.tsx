'use client';

import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TextEditor } from '@/components/ui/text-editor';
import { useBruteForceStore } from '@/stores/bruto-force';
import { createDefaultPayloadConfig } from '../../../types';
import { BruteForcePayloadPresetDialog } from '../../brute-force-payload-preset-dialog';

export function PayloadsTab() {
  const [presetDialogOpen, setPresetDialogOpen] = React.useState(false);
  const [activePositionName, setActivePositionName] = React.useState<string | null>(null);
  const config = useBruteForceStore((s) => {
    const tab = s.tabs.find((t) => t.id === s.activeTabId);
    return tab?.config;
  });
  const updatePositionPayload = useBruteForceStore((s) => s.updatePositionPayload);

  const positions = config?.positions ?? [];
  const selectedPositionName = activePositionName ?? positions[0]?.name ?? '';

  React.useEffect(() => {
    if (!positions.some((position) => position.name === selectedPositionName)) {
      setActivePositionName(positions[0]?.name ?? null);
    }
  }, [positions, selectedPositionName]);

  if (!config) return null;

  if (positions.length === 0) {
    return (
      <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
        Mark payload positions in the request with § markers before assigning payloads.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {positions.map((position) => {
          const payload = config.position_payloads[position.name] ?? createDefaultPayloadConfig();
          return (
            <Badge key={position.name} variant="secondary">
              {position.name}: {payload.values.length} payloads
            </Badge>
          );
        })}
      </div>

      <Tabs value={selectedPositionName} onValueChange={setActivePositionName}>
        <TabsList className="mb-2 flex h-auto w-full flex-wrap justify-start">
          {positions.map((position) => (
            <TabsTrigger key={position.name} value={position.name} className="max-w-[180px]">
              <span className="truncate">
                {position.name}
                {position.default_value ? `: ${position.default_value}` : ''}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>

        {positions.map((position) => {
          const payload = config.position_payloads[position.name] ?? createDefaultPayloadConfig();

          return (
            <TabsContent key={position.name} value={position.name} className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label className='truncate'>
                  Payloads for {position.name}
                  {position.default_value ? ` (${position.default_value})` : ''}
                </Label>
                <Badge variant={payload.values.length > 0 ? 'default' : 'secondary'}>
                  {payload.values.length} payloads
                </Badge>
              </div>

              <div className="h-36 overflow-hidden rounded-md border">
                <TextEditor
                  language="plaintext"
                  value={payload.values.join('\n')}
                  onChange={(value) =>
                    updatePositionPayload(position.name, {
                      payload_type: 'SimpleList',
                      values: (value ?? '').split('\n').filter((line) => line.trim()),
                      file_path: undefined,
                    })
                  }
                  options={{
                    lineNumbers: 'off',
                    scrollBeyondLastLine: false,
                    wordWrap: 'off',
                  }}
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => {
                    setActivePositionName(position.name);
                    setPresetDialogOpen(true);
                  }}
                >
                  Browse Presets
                </Button>
                <PayloadFileButton positionName={position.name} />
                {payload.file_path && (
                  <Badge variant="secondary" className="max-w-full truncate">
                    {payload.file_path}
                  </Badge>
                )}
              </div>
            </TabsContent>
          );
        })}
      </Tabs>

      <BruteForcePayloadPresetDialog
        open={presetDialogOpen}
        onOpenChange={setPresetDialogOpen}
        onUsePayload={(payload) => {
          if (!selectedPositionName) {
            return;
          }

          updatePositionPayload(selectedPositionName, {
            payload_type: 'SimpleList',
            values: payload.values,
            file_path: `Preset: ${payload.name}`,
          });
        }}
      />
    </div>
  );
}

function PayloadFileButton({ positionName }: { positionName: string }) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const updatePositionPayload = useBruteForceStore((s) => s.updatePositionPayload);

  const handleLoadPayloads = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const content = loadEvent.target?.result as string;
      updatePositionPayload(positionName, {
        payload_type: 'SimpleList',
        values: content.split(/\r?\n/).filter((line) => line.trim()),
        file_path: file.name,
      });
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  return (
    <>
      <Button variant="outline" size="xs" onClick={() => inputRef.current?.click()}>
        Load from File
      </Button>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept=".txt,.lst,.wordlist"
        onChange={handleLoadPayloads}
      />
    </>
  );
}
