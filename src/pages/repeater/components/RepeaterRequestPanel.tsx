'use client';

import { TextEditor } from '@/components/ui/text-editor';
import { Label } from '@/components/ui/label';

interface RepeaterRequestPanelProps {
  rawRequest: string;
  onRawRequestChange: (rawRequest: string) => void;
}

export function RepeaterRequestPanel({
  rawRequest,
  onRawRequestChange,
}: RepeaterRequestPanelProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="bg-muted/30 px-3 py-2 border-b">
        <span className="text-sm font-medium">Request</span>
      </div>

      <div className="p-2 h-full flex flex-col min-h-0">
        <Label className="text-xs text-muted-foreground mb-1 block">
          Raw Request
        </Label>
        <div className="flex-1 min-h-0 overflow-hidden rounded-md border">
          <TextEditor
            language="plaintext"
            value={rawRequest}
            onChange={(value) => onRawRequestChange(value ?? '')}
            options={{
              scrollBeyondLastLine: false,
            }}
          />
        </div>
      </div>
    </div>
  );
}
