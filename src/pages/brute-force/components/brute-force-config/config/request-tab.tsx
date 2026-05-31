'use client';

import * as React from 'react';
import { Target } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { TextEditor } from '@/components/ui/text-editor';
import { useBruteForceStore } from '@/stores/bruto-force';
import {
  buildRawRequest,
  findRequestPayloadPositions,
  parseRawRequest,
} from '../../../types';
import { NumberInputField } from './number-input-field';

export function RequestTab() {
  const config = useBruteForceStore((s) => {
    const tab = s.tabs.find((t) => t.id === s.activeTabId);
    return tab?.config;
  });
  const updateConfig = useBruteForceStore((s) => s.updateConfig);

  const [rawRequestDraft, setRawRequestDraft] = React.useState(() =>
    config ? buildRawRequest(config.base_request) : ''
  );
  const rawRequestEditorRef = React.useRef<any>(null);
  const editRef = React.useRef(false);

  React.useEffect(() => {
    if (!config) return;
    if (editRef.current) {
      editRef.current = false;
      return;
    }
    setRawRequestDraft(buildRawRequest(config.base_request));
  }, [config?.base_request]);

  if (!config) return null;

  const updateBaseRequest = (updates: Partial<typeof config.base_request>) => {
    const baseRequest = { ...config.base_request, ...updates };
    updateConfig({
      base_request: baseRequest,
      positions: findRequestPayloadPositions(baseRequest),
    });
  };

  const updateRawRequest = (value: string) => {
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

  return (
    <div className="space-y-4">
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
              <Target className="mr-1 h-4 w-4" />
              Mark Target
            </Button>
          </div>
        </div>
        <div className="h-[360px] overflow-hidden rounded-md border">
          <TextEditor
            language="plaintext"
            value={rawRequestDraft}
            onChange={(value) => {
              editRef.current = true;
              updateRawRequest(value ?? '');
            }}
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
            onCheckedChange={(checked) =>
              updateBaseRequest({ follow_redirects: checked as boolean })
            }
          />
          <Label htmlFor="followRedirects">Follow Redirects</Label>
        </div>
        <NumberInputField
          label="Max Redirect Hops"
          value={config.base_request.max_hops}
          onChange={(value) => updateBaseRequest({ max_hops: parseInt(value, 10) || 1 })}
        />
      </div>
    </div>
  );
}
