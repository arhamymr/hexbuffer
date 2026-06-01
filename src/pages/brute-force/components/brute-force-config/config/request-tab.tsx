'use client';

import * as React from 'react';
import { Info, Target } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { TextEditor } from '@/components/ui/text-editor';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useBruteForceStore } from '@/stores/bruto-force';
import {
  buildRawRequest,
  findRequestPayloadPositions,
  parseRawRequest,
} from '../../../types';

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
            <Tooltip>
              <TooltipTrigger asChild>
                <Button type="button" variant="ghost" size="icon-sm" className="shrink-0">
                  <Info className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="max-w-[320px]">
                Select a URL, header, or body value and mark it as the payload insertion point.
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
        <div className="h-[460px] overflow-hidden rounded-md border">
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
      </div>
    </div>
  );
}
