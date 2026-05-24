'use client';

import * as React from 'react';
import { Loader2, Square, Target, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TextEditor } from '@/components/ui/text-editor';
import { getPayloadModeLabel } from './utils';
import type { AttackType, PayloadMode } from './types';

interface PromptInjectionRequestPanelProps {
  payloadMode: PayloadMode;
  allPayloadsCount: number;
  payloadsToRun: string[];
  markedTargetCount: number;
  requestBody: string;
  endpoint: string;
  attackType: AttackType;
  isRunning: boolean;
  requestEditorRef: React.MutableRefObject<any>;
  onPayloadConfigOpen: () => void;
  onMarkRequestTarget: () => void;
  onRequestBodyChange: (value: string) => void;
  onEndpointChange: (value: string) => void;
  onAttackTypeChange: (value: AttackType) => void;
  onRun: (payloads: string[]) => void;
  onStop: () => void;
}

export function PromptInjectionRequestPanel({
  payloadMode,
  allPayloadsCount,
  payloadsToRun,
  markedTargetCount,
  requestBody,
  endpoint,
  attackType,
  isRunning,
  requestEditorRef,
  onPayloadConfigOpen,
  onMarkRequestTarget,
  onRequestBodyChange,
  onEndpointChange,
  onAttackTypeChange,
  onRun,
  onStop,
}: PromptInjectionRequestPanelProps) {
  return (
    <div className="flex min-h-0 flex-col border-b lg:border-b-0 lg:border-r">
      <div className="bg-muted h-10 px-3 py-2 border-b flex items-center justify-between">
        <span className="text-sm font-medium">Request</span>
        <Button size="xs" variant="outline" className="gap-1" onClick={onPayloadConfigOpen} disabled={isRunning}>
          <Target className="h-3.5 w-3.5" />
          Payload Config
        </Button>
      </div>

      <div className="border-b bg-background px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>Payload type</span>
            <Badge variant="secondary">{getPayloadModeLabel(payloadMode)}</Badge>
            <span>{payloadsToRun.length} selected</span>
            {payloadMode !== 'manual' && allPayloadsCount !== payloadsToRun.length && (
              <span>{allPayloadsCount} available</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="xs"
              onClick={() => onRun(payloadsToRun)}
              disabled={payloadsToRun.length === 0 || markedTargetCount === 0 || isRunning}
            >
              {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              {isRunning ? 'Running' : 'Start'}
            </Button>

            {isRunning && (
            <Button size="xs" variant="outline" onClick={onStop}>
              <Square className="mr-2 h-4 w-4" />
              Stop
            </Button>
          )}
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 p-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Label className="whitespace-nowrap text-xs">Raw Request</Label>
            <Badge variant={markedTargetCount > 0 ? 'default' : 'secondary'}>
              {markedTargetCount} marked
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="xs" onClick={onMarkRequestTarget}>
              <Target className="mr-1 h-4 w-4" />
              Mark Target
            </Button>
            <Select value={attackType} onValueChange={(value) => onAttackTypeChange(value as AttackType)}>
              <SelectTrigger className="h-8 w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sniper">Sniper</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="min-h-[220px] flex-1 overflow-hidden rounded-md border bg-background">
          <TextEditor
            language="http"
            value={requestBody}
            onChange={(value) => onRequestBodyChange(value ?? '')}
            onMount={(editor) => {
              requestEditorRef.current = editor;
            }}
            options={{
              scrollBeyondLastLine: false,
            }}
          />
        </div>
      </div>
    </div>
  );
}
