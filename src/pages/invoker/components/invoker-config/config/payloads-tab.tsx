'use client';

import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TextEditor } from '@/components/ui/text-editor';
import { useInvokerStore } from '@/stores/invoker';
import { createDefaultPayloadConfig, type PayloadConfig, type PayloadType } from '../../../types';
import { InvokerPayloadPresetDialog } from '../../payload-preset-dialog';

const NUMBER_RANGE_PREVIEW_LIMIT = 8;

function getNumberRangeValidation(payload: PayloadConfig) {
  const errors: string[] = [];
  const step = payload.number_step;
  const start = payload.number_start;
  const end = payload.number_end;
  const paddingWidth = getPaddingWidth(payload.number_format);

  if (start === undefined || Number.isNaN(start)) {
    errors.push('Start is required.');
  }

  if (end === undefined || Number.isNaN(end)) {
    errors.push('End is required.');
  }

  if (step === undefined || Number.isNaN(step)) {
    errors.push('Step is required.');
  } else if (step === 0) {
    errors.push('Step cannot be 0.');
  }

  if (paddingWidth && (!Number.isInteger(Number(paddingWidth)) || Number(paddingWidth) < 0)) {
    errors.push('Padding must be 0 or greater.');
  }

  if (
    start !== undefined &&
    end !== undefined &&
    step !== undefined &&
    !Number.isNaN(start) &&
    !Number.isNaN(end) &&
    !Number.isNaN(step) &&
    step !== 0 &&
    ((step > 0 && start > end) || (step < 0 && start < end))
  ) {
    errors.push(step > 0 ? 'Use a negative step for descending ranges.' : 'Use a positive step for ascending ranges.');
  }

  return errors;
}

function isNumberRangeValid(payload: PayloadConfig) {
  return getNumberRangeValidation(payload).length === 0;
}

function getNumberRangeValues(payload: PayloadConfig, limit = Number.POSITIVE_INFINITY) {
  if (!isNumberRangeValid(payload)) {
    return [];
  }

  const start = payload.number_start!;
  const end = payload.number_end!;
  const step = payload.number_step!;
  const values: string[] = [];
  let current = start;

  while (step > 0 ? current <= end : current >= end) {
    values.push(formatNumberPayload(current, payload.number_format));

    if (values.length >= limit) {
      break;
    }

    current += step;
  }

  return values;
}

function getNumberRangeCount(payload: PayloadConfig) {
  if (!isNumberRangeValid(payload)) {
    return 0;
  }

  const start = payload.number_start!;
  const end = payload.number_end!;
  const step = payload.number_step!;

  return Math.floor(Math.abs((end - start) / step)) + 1;
}

function getPayloadCount(payload: PayloadConfig) {
  return payload.payload_type === 'NumberRange' ? getNumberRangeCount(payload) : payload.values.length;
}

function formatNumberPayload(value: number, format = '{}') {
  const widthMatch = format.match(/^\{:0(\d+)\}$/);

  if (widthMatch) {
    const width = Number(widthMatch[1]);

    if (value < 0) {
      return `-${String(Math.abs(value)).padStart(Math.max(width - 1, 0), '0')}`;
    }

    return String(value).padStart(width, '0');
  }

  return format.replace('{}', String(value));
}

function getPaddingWidth(format?: string) {
  return format?.match(/^\{:0(\d+)\}$/)?.[1] ?? '';
}

function parseOptionalNumber(value: string) {
  return value === '' ? undefined : Number(value);
}

function getPayloadTypeLabel(payloadType: PayloadType) {
  switch (payloadType) {
    case 'NumberRange':
      return 'Number range';
    case 'RuntimeFile':
      return 'Runtime file';
    case 'SimpleList':
    default:
      return 'Simple list';
  }
}

export function PayloadsTab() {
  const [presetDialogOpen, setPresetDialogOpen] = React.useState(false);
  const [activePositionName, setActivePositionName] = React.useState<string | null>(null);
  const config = useInvokerStore((s) => {
    const tab = s.tabs.find((t) => t.id === s.activeTabId);
    return tab?.config;
  });
  const updatePositionPayload = useInvokerStore((s) => s.updatePositionPayload);

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
          const payloadCount = getPayloadCount(payload);
          return (
            <Badge key={position.name} variant="secondary">
              {position.name}: {payloadCount} payloads
            </Badge>
          );
        })}
      </div>

      <Tabs value={selectedPositionName} onValueChange={setActivePositionName}>
        <TabsList className="mb-2 flex h-auto flex-wrap justify-start">
          {positions.map((position) => (
            <TabsTrigger key={position.name} value={position.name}>
              <span className="truncate">
                {position.name}
                {position.default_value ? `: ${position.default_value}` : ''}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>

        {positions.map((position) => {
          const payload = config.position_payloads[position.name] ?? createDefaultPayloadConfig();
          const payloadCount = getPayloadCount(payload);
          const numberRangePreview =
            payload.payload_type === 'NumberRange'
              ? getNumberRangeValues(payload, NUMBER_RANGE_PREVIEW_LIMIT)
              : [];

          const updatePayloadType = (payloadType: PayloadType) => {
            updatePositionPayload(position.name, {
              payload_type: payloadType,
              ...(payloadType === 'NumberRange'
                ? {
                    values: [],
                    file_path: undefined,
                    number_start: payload.number_start ?? 1,
                    number_end: payload.number_end ?? 100,
                    number_step: payload.number_step ?? 1,
                    number_format: payload.number_format,
                  }
                : {}),
            });
          };

          return (
            <TabsContent key={position.name} value={position.name} className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <Label className="truncate">
                  Payloads for {position.name}
                  {position.default_value ? ` (${position.default_value})` : ''}
                </Label>
                <Badge variant={payloadCount > 0 ? 'default' : 'secondary'}>
                  {payloadCount} payloads
                </Badge>
              </div>

              <div className="flex flex-wrap gap-2">
                {(['SimpleList', 'NumberRange'] satisfies PayloadType[]).map((payloadType) => (
                  <Button
                    key={payloadType}
                    type="button"
                    variant={payload.payload_type === payloadType ? 'default' : 'outline'}
                    size="xs"
                    onClick={() => updatePayloadType(payloadType)}
                  >
                    {getPayloadTypeLabel(payloadType)}
                  </Button>
                ))}
              </div>

              {payload.payload_type === 'NumberRange' ? (
                <NumberRangePayloadEditor
                  payload={payload}
                  preview={numberRangePreview}
                  payloadCount={payloadCount}
                  onChange={(updates) => updatePositionPayload(position.name, updates)}
                />
              ) : (
                <>
                  <div className="h-36 overflow-hidden rounded-md border">
                    <TextEditor
                      value={payload.values.join('\n')}
                      onChange={(value) =>
                        updatePositionPayload(position.name, {
                          payload_type: 'SimpleList',
                          values: (value ?? '').split('\n').filter((line) => line.trim()),
                          file_path: undefined,
                        })
                      }
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
                </>
              )}
            </TabsContent>
          );
        })}
      </Tabs>

      <InvokerPayloadPresetDialog
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

function NumberRangePayloadEditor({
  payload,
  preview,
  payloadCount,
  onChange,
}: {
  payload: PayloadConfig;
  preview: string[];
  payloadCount: number;
  onChange: (updates: Partial<PayloadConfig>) => void;
}) {
  const paddingWidth = getPaddingWidth(payload.number_format);
  const validationErrors = getNumberRangeValidation(payload);
  const hasValidationErrors = validationErrors.length > 0;

  return (
    <div className="space-y-3 rounded-md border bg-muted/20 p-3">
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="grid gap-1.5">
          <Label>Start</Label>
          <Input
            type="number"
            value={payload.number_start ?? ''}
            aria-invalid={payload.number_start === undefined || Number.isNaN(payload.number_start)}
            onChange={(event) => onChange({ number_start: parseOptionalNumber(event.target.value) })}
          />
        </div>
        <div className="grid gap-1.5">
          <Label>End</Label>
          <Input
            type="number"
            value={payload.number_end ?? ''}
            aria-invalid={payload.number_end === undefined || Number.isNaN(payload.number_end)}
            onChange={(event) => onChange({ number_end: parseOptionalNumber(event.target.value) })}
          />
        </div>
        <div className="grid gap-1.5">
          <Label>Step</Label>
          <Input
            type="number"
            value={payload.number_step ?? ''}
            aria-invalid={
              payload.number_step === undefined ||
              Number.isNaN(payload.number_step) ||
              payload.number_step === 0
            }
            onChange={(event) => onChange({ number_step: parseOptionalNumber(event.target.value) })}
          />
        </div>
        <div className="grid gap-1.5">
          <Label>Padding</Label>
          <Input
            type="number"
            min={0}
            placeholder="0"
            value={paddingWidth}
            aria-invalid={Boolean(paddingWidth) && Number(paddingWidth) < 0}
            onChange={(event) => {
              const widthText = event.target.value;
              const width = Number(widthText);
              onChange({
                number_format: widthText && width > 0 ? `{:0${width}}` : undefined,
              });
            }}
          />
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label>Format</Label>
        <Input
          value={payload.number_format ?? '{}'}
          placeholder="{}"
          onChange={(event) =>
            onChange({
              number_format: event.target.value.trim() ? event.target.value : undefined,
            })
          }
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>Preview:</span>
        {hasValidationErrors ? (
          <span>{validationErrors.join(' ')}</span>
        ) : preview.length > 0 ? (
          preview.map((value) => (
            <Badge key={value} variant="secondary">
              {value}
            </Badge>
          ))
        ) : (
          <span>No payloads generated. Check the range direction and step.</span>
        )}
        {payloadCount > preview.length && <span>and {payloadCount - preview.length} more</span>}
      </div>
    </div>
  );
}

function PayloadFileButton({ positionName }: { positionName: string }) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const updatePositionPayload = useInvokerStore((s) => s.updatePositionPayload);

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
