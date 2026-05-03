'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

interface InterceptRequest {
  id: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  body: string | null;
  timestamp: number;
}

interface InterceptDecision {
  action: 'forward' | 'modify' | 'block';
  request?: {
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: string;
  };
  response?: {
    status?: number;
    status_text?: string;
    headers?: Record<string, string>;
    body?: string;
  };
}

interface InterceptDialogProps {
  intercept: InterceptRequest;
  onResolve: (decision: InterceptDecision) => Promise<void>;
  onClose: () => void;
}

export function InterceptDialog({ intercept, onResolve, onClose }: InterceptDialogProps) {
  const [modifiedBody, setModifiedBody] = useState(intercept.body || '');
  const [modifiedHeaders, setModifiedHeaders] = useState(JSON.stringify(intercept.headers, null, 2));
  const [isResolving, setIsResolving] = useState(false);

  const handleForward = async () => {
    setIsResolving(true);
    await onResolve({ action: 'forward' });
    setIsResolving(false);
  };

  const handleModify = async () => {
    setIsResolving(true);
    let headers = intercept.headers;
    try {
      headers = JSON.parse(modifiedHeaders);
    } catch {
      console.error('Invalid headers JSON');
    }
    await onResolve({
      action: 'modify',
      request: {
        method: intercept.method,
        url: intercept.url,
        headers,
        body: modifiedBody,
      },
    });
    setIsResolving(false);
  };

  const handleBlock = async () => {
    setIsResolving(true);
    await onResolve({
      action: 'block',
      response: {
        status: 418,
        status_text: "I'm a teapot",
        headers: {},
        body: 'Blocked by intercept',
      },
    });
    setIsResolving(false);
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Intercept Request #{intercept.id}</DialogTitle>
          <DialogDescription>
            {intercept.method} {intercept.url}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="body" className="flex-1 overflow-hidden">
          <TabsList>
            <TabsTrigger value="body">Request Body</TabsTrigger>
            <TabsTrigger value="headers">Headers</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>

          <TabsContent value="body" className="flex-1 overflow-auto">
            <Textarea
              value={modifiedBody}
              onChange={(e) => setModifiedBody(e.target.value)}
              className="font-mono text-sm min-h-[200px]"
              placeholder="Request body..."
            />
          </TabsContent>

          <TabsContent value="headers" className="flex-1 overflow-auto">
            <Textarea
              value={modifiedHeaders}
              onChange={(e) => setModifiedHeaders(e.target.value)}
              className="font-mono text-sm min-h-[200px]"
              placeholder="Headers as JSON..."
            />
          </TabsContent>

          <TabsContent value="preview" className="flex-1 overflow-auto">
            <div className="space-y-4 font-mono text-sm">
              <div>
                <div className="font-bold text-muted-foreground">REQUEST</div>
                <pre className="bg-muted p-2 rounded mt-1">
{intercept.method} {intercept.url}
Headers: {JSON.stringify(intercept.headers, null, 2)}
Body: {intercept.body || '(empty)'}
                </pre>
              </div>
              <div>
                <div className="font-bold text-muted-foreground">MODIFIED</div>
                <pre className="bg-muted p-2 rounded mt-1">
{intercept.method} {intercept.url}
Headers: {modifiedHeaders}
Body: {modifiedBody || '(empty)'}
                </pre>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isResolving}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleBlock} disabled={isResolving}>
            Block
          </Button>
          <Button variant="secondary" onClick={handleModify} disabled={isResolving}>
            Modify & Forward
          </Button>
          <Button onClick={handleForward} disabled={isResolving}>
            Forward
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}