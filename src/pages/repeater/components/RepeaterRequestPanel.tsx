'use client';

import { Play, Loader2 } from 'lucide-react';
import { TextEditor } from '@/components/ui/text-editor';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

interface RepeaterRequestPanelProps {
  rawRequest: string;
  isLoading: boolean;
  onRawRequestChange: (rawRequest: string) => void;
  onSend: () => void;
}

export function RepeaterRequestPanel({
  rawRequest,
  isLoading,
  onRawRequestChange,
  onSend,
}: RepeaterRequestPanelProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="bg-muted h-10 px-3 py-2 border-b flex items-center justify-between">
        <span className="text-sm font-medium">Request</span>
        <Button size="xs" onClick={onSend} disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          SEND
        </Button>
      </div>

      <div className="p-2 h-full flex flex-col min-h-0">
        <Label className="text-xs text-muted-foreground mb-1 block">
          Raw Request
        </Label>
        <div className="flex-1 min-h-0 overflow-hidden rounded-md border">
          <TextEditor
            language="javascript"
            value={rawRequest}
            onChange={(value) => onRawRequestChange(value ?? '')}
          />
        </div>
      </div>
    </div>
  );
}
