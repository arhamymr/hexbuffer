'use client';

import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TextEditor } from '@/components/ui/text-editor';
import { Target, X } from 'lucide-react';
import { ATTACK_MODES, PAYLOAD_TYPES, PROCESSING_STEPS } from '../constants';
import {
  buildRawRequest,
  findRequestPayloadPositions,
  parseRawRequest,
  type AttackConfig,
  type AttackMode,
  type PayloadProcessingStep,
  type PayloadType,
} from '../types';

interface BruteForceConfigDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  config: AttackConfig;
  updateConfig: (updates: Partial<AttackConfig>) => void;
  updateAttackMode: (mode: AttackMode) => void;
  updatePayloadType: (payloadType: PayloadType) => void;
  updatePayloadValues: (values: string[]) => void;
  updateNumberRange: (updates: {
    number_start?: number;
    number_end?: number;
    number_step?: number;
    number_format?: string;
  }) => void;
  addProcessingStep: (step: PayloadProcessingStep) => void;
  removeProcessingStep: (index: number) => void;
  updateGrepMatch: (enabled: boolean, keyword?: string, caseSensitive?: boolean) => void;
  updateGrepExtract: (enabled: boolean, regex?: string, replacement?: string) => void;
  updateSessionHandling: (
    enabled: boolean,
    extractTokenName?: string,
    updateHeaderName?: string,
    extractFromResponse?: string
  ) => void;
  onOpenPayloadFile: () => void;
}

export function BruteForceConfigDialog({
  config,
  updateConfig,
  updateAttackMode,
  updatePayloadType,
  updatePayloadValues,
  updateNumberRange,
  addProcessingStep,
  removeProcessingStep,
  updateGrepMatch,
  updateGrepExtract,
  updateSessionHandling,
  onOpenPayloadFile,
}: BruteForceConfigDialogProps) {
  const [rawRequestDraft, setRawRequestDraft] = React.useState(() => buildRawRequest(config.base_request));
  const rawRequestEditorRef = React.useRef<any>(null);
  const rawRequestEditRef = React.useRef(false);

  React.useEffect(() => {
    if (rawRequestEditRef.current) {
      rawRequestEditRef.current = false;
      return;
    }

    setRawRequestDraft(buildRawRequest(config.base_request));
  }, [config.base_request]);

  const updateBaseRequest = (updates: Partial<AttackConfig['base_request']>) => {
    const baseRequest = { ...config.base_request, ...updates };
    updateConfig({
      base_request: baseRequest,
      positions: findRequestPayloadPositions(baseRequest),
    });
  };

  const updateRawRequest = (value: string) => {
    rawRequestEditRef.current = true;
    setRawRequestDraft(value);
    const parsed = parseRawRequest(value);
    if (parsed) {
      updateConfig({
        base_request: {
          ...config.base_request,
          ...parsed,
        },
        positions: findRequestPayloadPositions(parsed),
      });
    }
  };

  const markRawRequestTarget = () => {
    const editor = rawRequestEditorRef.current;
    const model = editor?.getModel?.();
    const selection = editor?.getSelection?.();
    if (!editor || !model || !selection) {
      return;
    }

    const selectedText = model.getValueInRange(selection);
    editor.executeEdits('mark-brute-force-target', [
      {
        range: selection,
        text: `§${selectedText}§`,
        forceMoveMarkers: true,
      },
    ]);
    editor.focus();
    updateRawRequest(editor.getValue());
  };

  const payloadCount = config.payload_config.values.length;

  return (
    <div className="flex h-full min-h-0 flex-col rounded-lg border bg-background">
      <div className="border-b px-3 py-2">
        <h2 className="text-sm font-medium">Attack Configuration</h2>
      </div>
      <div className="min-h-0 overflow-auto p-3">
        <Tabs defaultValue="attack" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="attack">Attack</TabsTrigger>
            <TabsTrigger value="request">Request</TabsTrigger>
            <TabsTrigger value="payloads">Payloads</TabsTrigger>
            <TabsTrigger value="processing">Processing</TabsTrigger>
            <TabsTrigger value="options">Options</TabsTrigger>
          </TabsList>

          <TabsContent value="attack" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Attack Name</Label>
                <Input value={config.name} onChange={(event) => updateConfig({ name: event.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Attack Mode</Label>
                <Select value={config.mode} onValueChange={(value) => updateAttackMode(value as AttackMode)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ATTACK_MODES.map((mode) => (
                      <SelectItem key={mode} value={mode}>
                        {mode}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div className="grid gap-2">
                <Label>Concurrency</Label>
                <Input
                  type="number"
                  value={config.concurrency}
                  onChange={(event) => updateConfig({ concurrency: parseInt(event.target.value, 10) || 1 })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Delay (ms)</Label>
                <Input
                  type="number"
                  value={config.delay_ms}
                  onChange={(event) => updateConfig({ delay_ms: parseInt(event.target.value, 10) || 0 })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Max Delay</Label>
                <Input
                  type="number"
                  value={config.delay_max_ms || ''}
                  onChange={(event) =>
                    updateConfig({
                      delay_max_ms: event.target.value ? parseInt(event.target.value, 10) : undefined,
                    })
                  }
                  placeholder="Optional"
                />
              </div>
              <div className="grid gap-2">
                <Label>Retries</Label>
                <Input
                  type="number"
                  value={config.retries}
                  onChange={(event) => updateConfig({ retries: parseInt(event.target.value, 10) || 0 })}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="request" className="space-y-4">
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label>Raw Request</Label>
                <div className="flex items-center gap-2">
                  <Badge variant={config.positions.length > 0 ? 'default' : 'secondary'}>
                    {config.positions.length} marked
                  </Badge>
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={markRawRequestTarget}
                  >
                    <Target className="h-4 w-4 mr-1" />
                    Mark Target
                  </Button>
                </div>
              </div>
              <div className="h-[360px] overflow-hidden rounded-md border">
                <TextEditor
                  language="plaintext"
                  value={rawRequestDraft}
                  onChange={(value) => updateRawRequest(value ?? '')}
                  onMount={(editor) => {
                    rawRequestEditorRef.current = editor;
                  }}
                  options={{
                    scrollBeyondLastLine: false,
                    lineNumbers: 'on',
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Select a URL, header, or body value and mark it as the payload insertion point.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="followRedirects"
                  checked={config.base_request.follow_redirects}
                  onCheckedChange={(checked) => updateBaseRequest({ follow_redirects: checked as boolean })}
                />
                <Label htmlFor="followRedirects">Follow Redirects</Label>
              </div>
              <div className="grid gap-2">
                <Label>Max Redirect Hops</Label>
                <Input
                  type="number"
                  value={config.base_request.max_hops}
                  onChange={(event) => updateBaseRequest({ max_hops: parseInt(event.target.value, 10) || 1 })}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="payloads" className="space-y-4">
            <div className="grid gap-2">
              <Label>Payload Type</Label>
              <Select
                value={config.payload_config.payload_type}
                onValueChange={(value) => updatePayloadType(value as PayloadType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYLOAD_TYPES.map((payloadType) => (
                    <SelectItem key={payloadType} value={payloadType}>
                      {payloadType}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {config.payload_config.payload_type === 'SimpleList' && (
              <div className="grid gap-2">
                <Label>Payloads (one per line)</Label>
                <div className="h-32 overflow-hidden rounded-md border">
                  <TextEditor
                    language="plaintext"
                    value={config.payload_config.values.join('\n')}
                    onChange={(value) =>
                      updatePayloadValues((value ?? '').split('\n').filter((payload) => payload.trim()))
                    }
                    options={{
                      lineNumbers: 'off',
                      scrollBeyondLastLine: false,
                      wordWrap: 'off',
                    }}
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="xs" onClick={onOpenPayloadFile}>
                    Load from File
                  </Button>
                  {config.payload_config.file_path && (
                    <Badge variant="secondary">{payloadCount} loaded</Badge>
                  )}
                </div>
              </div>
            )}

            {config.payload_config.payload_type === 'RuntimeFile' && (
              <div className="grid gap-3">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="xs" onClick={onOpenPayloadFile}>
                    Load Runtime File
                  </Button>
                  <Badge variant={payloadCount > 0 ? 'default' : 'secondary'}>
                    {payloadCount} payloads
                  </Badge>
                </div>
                {config.payload_config.file_path && (
                  <p className="text-xs text-muted-foreground break-all">
                    {config.payload_config.file_path}
                  </p>
                )}
              </div>
            )}

            {config.payload_config.payload_type === 'NumberRange' && (
              <div className="grid grid-cols-4 gap-4">
                <div className="grid gap-2">
                  <Label>Start</Label>
                  <Input
                    type="number"
                    value={config.payload_config.number_start || 0}
                    onChange={(event) =>
                      updateNumberRange({ number_start: parseInt(event.target.value, 10) || 0 })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label>End</Label>
                  <Input
                    type="number"
                    value={config.payload_config.number_end || 100}
                    onChange={(event) =>
                      updateNumberRange({ number_end: parseInt(event.target.value, 10) || 100 })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Step</Label>
                  <Input
                    type="number"
                    value={config.payload_config.number_step || 1}
                    onChange={(event) =>
                      updateNumberRange({ number_step: parseInt(event.target.value, 10) || 1 })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Format</Label>
                  <Input
                    value={config.payload_config.number_format || '{}'}
                    onChange={(event) => updateNumberRange({ number_format: event.target.value })}
                    placeholder="{}"
                  />
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="processing" className="space-y-4">
            <div className="grid gap-2">
              <Label>Payload Processing Pipeline</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {config.payload_config.processing.map((step, index) => (
                  <Badge key={`${step}-${index}`} variant="secondary" className="flex items-center gap-1">
                    {step}
                    <button
                      type="button"
                      onClick={() => removeProcessingStep(index)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                {config.payload_config.processing.length === 0 && (
                  <span className="text-sm text-muted-foreground">No processing steps added</span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {PROCESSING_STEPS.map((step) => (
                  <Button
                    key={step.value}
                    variant="outline"
                    size="xs"
                    onClick={() => addProcessingStep(step.value)}
                  >
                    {step.label}
                  </Button>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="options" className="space-y-4">
            <div className="grid gap-4">
              <div className="flex items-start gap-2">
                <Checkbox
                  id="grepMatchEnabled"
                  checked={config.grep_match.enabled}
                  onCheckedChange={(checked) =>
                    updateGrepMatch(
                      checked as boolean,
                      config.grep_match.keyword,
                      config.grep_match.case_sensitive
                    )
                  }
                />
                <div className="grid gap-2 flex-1">
                  <Label htmlFor="grepMatchEnabled">Grep - Match</Label>
                  <Input
                    placeholder="Keyword to search in response..."
                    value={config.grep_match.keyword}
                    onChange={(event) =>
                      updateGrepMatch(
                        config.grep_match.enabled,
                        event.target.value,
                        config.grep_match.case_sensitive
                      )
                    }
                    disabled={!config.grep_match.enabled}
                  />
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="grepMatchCaseSensitive"
                      checked={config.grep_match.case_sensitive}
                      onCheckedChange={(checked) =>
                        updateGrepMatch(
                          config.grep_match.enabled,
                          config.grep_match.keyword,
                          checked as boolean
                        )
                      }
                      disabled={!config.grep_match.enabled}
                    />
                    <Label htmlFor="grepMatchCaseSensitive" className="text-xs">
                      Case Sensitive
                    </Label>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Checkbox
                  id="grepExtractEnabled"
                  checked={config.grep_extract.enabled}
                  onCheckedChange={(checked) =>
                    updateGrepExtract(
                      checked as boolean,
                      config.grep_extract.regex,
                      config.grep_extract.replacement
                    )
                  }
                />
                <div className="grid gap-2 flex-1">
                  <Label htmlFor="grepExtractEnabled">Grep - Extract</Label>
                  <Input
                    placeholder='Regex pattern (e.g., csrf_token" value="([^"]+)")...'
                    value={config.grep_extract.regex}
                    onChange={(event) =>
                      updateGrepExtract(
                        config.grep_extract.enabled,
                        event.target.value,
                        config.grep_extract.replacement
                      )
                    }
                    disabled={!config.grep_extract.enabled}
                  />
                  <Input
                    placeholder="Replacement (optional, leave empty to capture full match)..."
                    value={config.grep_extract.replacement || ''}
                    onChange={(event) =>
                      updateGrepExtract(
                        config.grep_extract.enabled,
                        config.grep_extract.regex,
                        event.target.value || undefined
                      )
                    }
                    disabled={!config.grep_extract.enabled}
                  />
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Checkbox
                  id="sessionEnabled"
                  checked={config.session_handling.enabled}
                  onCheckedChange={(checked) =>
                    updateSessionHandling(
                      checked as boolean,
                      config.session_handling.extract_token_name,
                      config.session_handling.update_header_name,
                      config.session_handling.extract_from_response
                    )
                  }
                />
                <div className="grid gap-2 flex-1">
                  <Label htmlFor="sessionEnabled">Session Handling</Label>
                  <Input
                    placeholder="Token/Cookie name to extract..."
                    value={config.session_handling.extract_token_name || ''}
                    onChange={(event) =>
                      updateSessionHandling(
                      config.session_handling.enabled,
                      event.target.value || undefined,
                      config.session_handling.update_header_name,
                      config.session_handling.extract_from_response
                    )
                  }
                  disabled={!config.session_handling.enabled}
                />
                  <Input
                    placeholder="Regex to extract token from response (optional)..."
                    value={config.session_handling.extract_from_response || ''}
                    onChange={(event) =>
                      updateSessionHandling(
                        config.session_handling.enabled,
                        config.session_handling.extract_token_name,
                        config.session_handling.update_header_name,
                        event.target.value || undefined
                      )
                    }
                    disabled={!config.session_handling.enabled}
                  />
                  <Input
                    placeholder="Header name to update (e.g., Authorization)..."
                    value={config.session_handling.update_header_name || ''}
                    onChange={(event) =>
                      updateSessionHandling(
                        config.session_handling.enabled,
                        config.session_handling.extract_token_name,
                        event.target.value || undefined,
                        config.session_handling.extract_from_response
                      )
                    }
                    disabled={!config.session_handling.enabled}
                  />
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
