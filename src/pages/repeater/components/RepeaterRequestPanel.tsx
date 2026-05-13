'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface RepeaterRequestPanelProps {
  headers: string;
  body: string;
  onHeadersChange: (headers: string) => void;
  onBodyChange: (body: string) => void;
}

export function RepeaterRequestPanel({
  headers,
  body,
  onHeadersChange,
  onBodyChange,
}: RepeaterRequestPanelProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="bg-muted/30 px-3 py-2 border-b">
        <span className="text-sm font-medium">Request</span>
      </div>

      <Tabs defaultValue="headers" className="flex-1 flex flex-col">
        <TabsList className="mx-2 mt-2">
          <TabsTrigger value="headers">Headers</TabsTrigger>
          <TabsTrigger value="body">Body</TabsTrigger>
        </TabsList>

        <TabsContent value="headers" className="flex-1 m-0">
          <div className="p-2 h-full">
            <Label className="text-xs text-muted-foreground mb-1 block">
              Headers (one per line, format: Header-Name: value)
            </Label>
            <Textarea
              value={headers}
              onChange={(e) => onHeadersChange(e.target.value)}
              placeholder="Content-Type: application/json&#10;Authorization: Bearer token&#10;..."
              className="font-mono text-xs h-[calc(100%-24px)] resize-none"
            />
          </div>
        </TabsContent>

        <TabsContent value="body" className="flex-1 m-0">
          <div className="p-2 h-full">
            <Label className="text-xs text-muted-foreground mb-1 block">
              Request Body (raw JSON)
            </Label>
            <Textarea
              value={body}
              onChange={(e) => onBodyChange(e.target.value)}
              placeholder='{ "key": "value" }'
              className="font-mono text-xs h-[calc(100%-24px)] resize-none"
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}