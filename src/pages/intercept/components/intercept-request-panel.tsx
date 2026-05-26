'use client';

import { Globe, Loader2, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { TextEditor } from '@/components/ui/text-editor';
import type { InterceptStatus } from '../types';

interface InterceptRequestPanelProps {
  status: InterceptStatus | null;
  rawRequest: string;
  hasSelection: boolean;
  isOpeningBrowser: boolean;
  onRawRequestChange: (rawRequest: string) => void;
  onToggleIntercept: (enabled: boolean) => void;
  onOpenBrowser: () => void;
}

export function InterceptRequestPanel({
  status,
  rawRequest,
  hasSelection,
  isOpeningBrowser,
  onRawRequestChange,
  onToggleIntercept,
  onOpenBrowser,
}: InterceptRequestPanelProps) {
  const isEnabled = status?.mode === 'Enabled';

  return (
    <div className="flex h-full flex-col">
      <div className="bg-muted flex h-10 items-center justify-between border-b px-3 py-2">
        <span className="text-sm font-medium">Request</span>
        <div className="flex items-center gap-2">
          <Button size="xs" variant="outline" onClick={onOpenBrowser} disabled={isOpeningBrowser}>
            {isOpeningBrowser ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Globe className="h-4 w-4" />
            )}
            OPEN BROWSER
          </Button>
          <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          <Badge variant={isEnabled ? 'default' : 'secondary'} className="text-xs">
            {isEnabled ? 'On' : 'Off'}
          </Badge>
          <Switch checked={isEnabled} onCheckedChange={onToggleIntercept} />
        </div>
      </div>

      <div className="flex h-full min-h-0 flex-col p-2">
        <Label className="mb-1 block text-xs text-muted-foreground">Raw Request</Label>
        <div className="min-h-0 flex-1 overflow-hidden rounded-md border">
          <TextEditor
            language="http"
            value={rawRequest}
            onChange={(value) => onRawRequestChange(value ?? '')}
            options={{
              readOnly: !hasSelection,
              scrollBeyondLastLine: false,
            }}
          />
        </div>
      </div>
    </div>
  );
}
