'use client';

import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { TextEditor } from '@/components/ui/text-editor';
import { useRequestPanel } from './hooks/use-request-panel';

export function InterceptRequestPanel() {
  const {
    isEnabled,
    rawRequest,
    selectedRequestId,
    messageLabel,
    handleRawChange,
    handleToggleIntercept,
  } = useRequestPanel();

  return (
    <div className="flex h-full flex-col">
      <div className="bg-muted flex h-10 items-center justify-between border-b px-3 py-2">
        <span className="text-xs font-medium">{messageLabel}</span>
        <div className="flex items-center gap-2">
          <Badge variant={isEnabled ? 'default' : 'secondary'} className="text-xs rounded-md">
            {isEnabled ? 'Intercept On' : 'Enable Intercept'}
          </Badge>
          <Switch checked={isEnabled} onCheckedChange={handleToggleIntercept} />
        </div>
      </div>

      <div className="flex h-full min-h-0 flex-col p-2">
        <Label className="mb-1 block text-xs text-muted-foreground">Raw {messageLabel}</Label>
        <div className="min-h-0 flex-1 overflow-hidden rounded-md border">
          <TextEditor
            language="javascript"
            value={rawRequest}
            onChange={handleRawChange}
            options={{
              readOnly: !selectedRequestId,
              scrollBeyondLastLine: false,
            }}
          />
        </div>
      </div>
    </div>
  );
}
