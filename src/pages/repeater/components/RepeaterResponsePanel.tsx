'use client';

import Editor from '@monaco-editor/react';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Loader2, AlertCircle } from 'lucide-react';
import type { RepeaterResponse } from '../types';
import { buildRawResponse } from '../types';

interface RepeaterResponsePanelProps {
  response: RepeaterResponse | null;
  isLoading: boolean;
  error: string | null;
}

export function RepeaterResponsePanel({
  response,
  isLoading,
  error,
}: RepeaterResponsePanelProps) {
  const renderStatusBadge = () => {
    if (!response) return null;

    const statusVariant =
      response.status >= 200 && response.status < 300
        ? 'default'
        : response.status >= 400
        ? 'destructive'
        : 'secondary';

    return (
      <Badge variant={statusVariant} className="text-sm px-3 py-1">
        {response.status} {response.status_text}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="bg-muted/30 px-3 py-2 border-b flex items-center gap-2">
          <span className="text-sm font-medium">Response</span>
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p>Sending request...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-full">
        <div className="bg-muted/30 px-3 py-2 border-b">
          <span className="text-sm font-medium">Response</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-destructive">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p className="font-medium">Error</p>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!response) {
    return (
      <div className="flex flex-col h-full">
        <div className="bg-muted/30 px-3 py-2 border-b">
          <span className="text-sm font-medium">Response</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <p>Send a request to see the response</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="bg-muted/30 px-3 py-2 border-b flex items-center justify-between">
        <span className="text-sm font-medium">Response</span>
        <div className="flex items-center gap-3">
          {renderStatusBadge()}
          <span className="text-xs text-muted-foreground">{response.time_ms}ms</span>
        </div>
      </div>

      <div className="p-2 h-full flex flex-col min-h-0">
        <Label className="text-xs text-muted-foreground mb-1 block">
          Raw Response
        </Label>
        <div className="flex-1 min-h-0 overflow-hidden rounded-md border">
          <Editor
            height="100%"
            language="html"
            value={buildRawResponse(response)}
            theme="vs"
            options={{
              readOnly: true,
              minimap: { enabled: false },
              fontSize: 12,
              lineNumbers: 'on',
              wordWrap: 'on',
              automaticLayout: true,
              scrollBeyondLastLine: false,
            }}
          />
        </div>
      </div>
    </div>
  );
}
