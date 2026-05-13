'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, AlertCircle } from 'lucide-react';
import type { RepeaterResponse } from '../types';
import { formatJsonResponse } from '../types';

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

  const formattedBody = formatJsonResponse(response.body);

  return (
    <div className="flex flex-col h-full">
      <div className="bg-muted/30 px-3 py-2 border-b flex items-center justify-between">
        <span className="text-sm font-medium">Response</span>
        <div className="flex items-center gap-3">
          {renderStatusBadge()}
          <span className="text-xs text-muted-foreground">
            {response.time_ms}ms
          </span>
        </div>
      </div>

      <Tabs defaultValue="body" className="flex-1 flex flex-col">
        <TabsList className="mx-2 mt-2">
          <TabsTrigger value="body">Body</TabsTrigger>
          <TabsTrigger value="headers">Headers</TabsTrigger>
        </TabsList>

        <TabsContent value="body" className="flex-1 m-0">
          <div className="p-2 h-full">
            <Label className="text-xs text-muted-foreground mb-1 block">
              Response Body (auto-formatted JSON)
            </Label>
            <Textarea
              value={formattedBody}
              readOnly
              className="font-mono text-xs h-[calc(100%-24px)] resize-none bg-muted/20"
            />
          </div>
        </TabsContent>

        <TabsContent value="headers" className="flex-1 m-0">
          <div className="p-2 h-full">
            <Label className="text-xs text-muted-foreground mb-1 block">
              Response Headers
            </Label>
            <Textarea
              value={Object.entries(response.headers)
                .map(([k, v]) => `${k}: ${v}`)
                .join('\n')}
              readOnly
              className="font-mono text-xs h-[calc(100%-24px)] resize-none bg-muted/20"
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}