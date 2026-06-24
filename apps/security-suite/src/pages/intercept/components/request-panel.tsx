import { Label } from '@/components/ui/label';
import { TextEditor } from '@/components/ui/text-editor';
import { useRequestPanel } from './hooks/use-request-panel';

export function InterceptRequestPanel() {
  const {
    rawRequest,
    selectedRequestId,
    messageLabel,
    handleRawChange,
  } = useRequestPanel();

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-full min-h-0 flex-col p-2">
        <Label className="mb-1 block text-xs text-muted-foreground">Raw {messageLabel}</Label>
        <div className="min-h-0 flex-1 overflow-hidden rounded-md border">
          <TextEditor
            value={rawRequest}
            onChange={handleRawChange}
            options={{ readOnly: !selectedRequestId }}
          />
        </div>
      </div>
    </div>
  );
}
