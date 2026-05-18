'use client';

import Editor from '@monaco-editor/react';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import type { AttackResult } from '../types';
import { formatPayloadValues } from '../lib/utils';

interface BruteForcePreviewPaneProps {
  selectedResult: AttackResult | null;
}

function formatResponseBody(body: string) {
  try {
    return JSON.stringify(JSON.parse(body), null, 2);
  } catch {
    return body;
  }
}

export function BruteForcePreviewPane({ selectedResult }: BruteForcePreviewPaneProps) {
  return (
    <div className="border rounded-lg overflow-hidden flex flex-col">
      <div className="bg-muted/50 px-3 py-2 border-b">
        <span className="text-sm font-medium">Preview</span>
      </div>
      <div className="flex-1 overflow-auto">
        {selectedResult ? (
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="col-span-2">
                <span className="text-muted-foreground">Payload:</span>{' '}
                <span className="font-mono text-xs">{formatPayloadValues(selectedResult.payload_values)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Status:</span>{' '}
                <Badge
                  variant={
                    (selectedResult.status || 0) >= 200 && (selectedResult.status || 0) < 300
                      ? 'default'
                      : (selectedResult.status || 0) >= 400
                      ? 'destructive'
                      : 'secondary'
                  }
                >
                  {selectedResult.status || 'Error'}
                </Badge>
              </div>
              <div>
                <span className="text-muted-foreground">Grep Match:</span>{' '}
                <Badge variant={selectedResult.grep_match ? 'default' : 'secondary'}>
                  {selectedResult.grep_match ? 'Yes' : 'No'}
                </Badge>
              </div>
              <div>
                <span className="text-muted-foreground">Length:</span> {selectedResult.response_length ?? '-'}
              </div>
              <div>
                <span className="text-muted-foreground">Time:</span>{' '}
                {selectedResult.response_time_ms ? `${selectedResult.response_time_ms}ms` : '-'}
              </div>
              {selectedResult.grep_extracted && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Extracted:</span>{' '}
                  <span className="font-mono text-xs">{selectedResult.grep_extracted}</span>
                </div>
              )}
            </div>
            {selectedResult.error && (
              <div className="text-sm text-destructive">Error: {selectedResult.error}</div>
            )}
            {selectedResult.response && (
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Response Body</Label>
                <div className="border rounded-md h-64">
                  <Editor
                    height="100%"
                    defaultLanguage="json"
                    value={formatResponseBody(selectedResult.response.body)}
                    theme="vs-dark"
                    options={{
                      readOnly: true,
                      minimap: { enabled: false },
                      fontSize: 12,
                      lineNumbers: 'on',
                      wordWrap: 'on',
                      automaticLayout: true,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            Select a result to preview
          </div>
        )}
      </div>
    </div>
  );
}
