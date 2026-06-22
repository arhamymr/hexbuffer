import { TextEditor } from '@/components/ui/text-editor';
import { Label } from '@/components/ui/label';

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
      <div className="p-2 h-full flex flex-col min-h-0">
        <Label className="text-xs text-muted-foreground mb-1 block">
          Raw Request
        </Label>
        <div className="flex-1 min-h-0 overflow-hidden rounded-md border">
          <TextEditor
            value={rawRequest}
            onChange={(value) => onRawRequestChange(value ?? '')}
          />
        </div>
      </div>
    </div>
  );
}
