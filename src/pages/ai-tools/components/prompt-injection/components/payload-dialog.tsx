'use client';

import * as React from 'react';
import { FileUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TextEditor } from '@/components/ui/text-editor';
import { PayloadChecklist } from './payload-checklist';
import { getPayloadModeLabel } from './utils';
import type { AttackSettings, PayloadMode, ToolConfig } from './types';

interface PromptInjectionPayloadDialogProps {
  open: boolean;
  config: ToolConfig;
  draftPayloadMode: PayloadMode;
  draftManualPayloads: string;
  draftImportedPayloads: string[];
  draftSelectedPayloads: Set<string>;
  draftAllPayloads: string[];
  attackSettings: AttackSettings;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onOpenChange: (open: boolean) => void;
  onDraftPayloadModeChange: (mode: PayloadMode) => void;
  onDraftManualPayloadsChange: (value: string) => void;
  onAttackSettingsChange: React.Dispatch<React.SetStateAction<AttackSettings>>;
  onLoadPayloadFile: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onLoadBundledPayloads: () => void;
  onToggleDraftPayload: (payload: string) => void;
  onSelectAllPayloads: () => void;
  onSave: () => void;
}

export function PromptInjectionPayloadDialog({
  open,
  config,
  draftPayloadMode,
  draftManualPayloads,
  draftImportedPayloads,
  draftSelectedPayloads,
  draftAllPayloads,
  attackSettings,
  fileInputRef,
  onOpenChange,
  onDraftPayloadModeChange,
  onDraftManualPayloadsChange,
  onAttackSettingsChange,
  onLoadPayloadFile,
  onLoadBundledPayloads,
  onToggleDraftPayload,
  onSelectAllPayloads,
  onSave,
}: PromptInjectionPayloadDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[720px]">
        <DialogHeader>
          <DialogTitle>{config.payloadLabel}</DialogTitle>
          <DialogDescription>Select or import the payloads used when this tool runs.</DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2 text-xs">
          <span className="text-muted-foreground">Selected payload type</span>
          <Badge variant="secondary">{getPayloadModeLabel(draftPayloadMode)}</Badge>
        </div>

        <Tabs value={draftPayloadMode} onValueChange={(value) => onDraftPayloadModeChange(value as PayloadMode)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="manual">Manual</TabsTrigger>
            <TabsTrigger value="import">Import</TabsTrigger>
            <TabsTrigger value="predefined">Library</TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="mt-3">
            <div className="h-[260px] overflow-hidden rounded-md border">
              <TextEditor
                language="plaintext"
                value={draftManualPayloads}
                onChange={(value) => onDraftManualPayloadsChange(value ?? '')}
                options={{
                  lineNumbers: 'off',
                  scrollBeyondLastLine: false,
                  wordWrap: 'off',
                }}
              />
            </div>
          </TabsContent>

          <TabsContent value="import" className="mt-3">
            <input ref={fileInputRef} type="file" className="hidden" accept=".txt,.list,.csv" onChange={onLoadPayloadFile} />
            <div className="mb-2 flex gap-2">
              <Button variant="outline" size="xs" className="flex-1 gap-1" onClick={() => fileInputRef.current?.click()}>
                <FileUp className="h-3.5 w-3.5" />
                File
              </Button>
              <Button variant="outline" size="xs" className="flex-1" onClick={onLoadBundledPayloads}>
                Bundled
              </Button>
            </div>
            <PayloadChecklist
              payloads={draftImportedPayloads}
              selectedPayloads={draftSelectedPayloads}
              emptyText="No imported payloads yet."
              onTogglePayload={onToggleDraftPayload}
            />
          </TabsContent>

          <TabsContent value="predefined" className="mt-3">
            <PayloadChecklist
              payloads={[...config.predefinedPayloads]}
              selectedPayloads={draftSelectedPayloads}
              onTogglePayload={onToggleDraftPayload}
            />
          </TabsContent>
        </Tabs>

        {draftPayloadMode !== 'manual' && draftAllPayloads.length > 0 && (
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{draftSelectedPayloads.size} selected</span>
            <Button variant="ghost" size="xs" className="h-7 px-2" onClick={onSelectAllPayloads}>
              {draftSelectedPayloads.size === draftAllPayloads.length ? 'Deselect All' : 'Select All'}
            </Button>
          </div>
        )}

        <div className="grid gap-3 rounded-md border p-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label className="text-xs">Throttle</Label>
              <Input
                className="h-8 font-mono text-xs"
                type="number"
                min={0}
                value={attackSettings.throttle}
                onChange={(event) =>
                  onAttackSettingsChange((current) => ({ ...current, throttle: Number(event.target.value) || 0 }))
                }
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Timeout</Label>
              <Input
                className="h-8 font-mono text-xs"
                type="number"
                min={100}
                value={attackSettings.timeout}
                onChange={(event) =>
                  onAttackSettingsChange((current) => ({ ...current, timeout: Number(event.target.value) || 30000 }))
                }
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <Checkbox
              checked={attackSettings.followRedirects}
              onCheckedChange={(checked) =>
                onAttackSettingsChange((current) => ({ ...current, followRedirects: checked === true }))
              }
            />
            Follow redirects
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" size="xs" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="xs" onClick={onSave}>
            Save Config
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
