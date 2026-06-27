import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Play } from 'lucide-react';

interface ForgeRequestBarProps {
  method: string;
  url: string;
  isLoading: boolean;
  activeEndpoint: { id: string; name: string } | null;
  onSend: () => void;
  onMethodChange: (method: string) => void;
  onUrlChange: (url: string) => void;
}

const METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'];

export function ForgeRequestBar({
  method,
  url,
  isLoading,
  activeEndpoint,
  onSend,
  onMethodChange,
  onUrlChange,
}: ForgeRequestBarProps) {
  return (
    <>
      <div className="flex space-x-2 shrink-0">
        <Select value={method} onValueChange={onMethodChange}>
          <SelectTrigger className="w-28 font-semibold">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {METHODS.map((m) => (
              <SelectItem key={m} value={m} className="font-semibold">
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          placeholder="Enter request URL (e.g. https://api.example.com/v1/users)"
          className="flex-1 font-mono text-sm"
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
        />

        <Button onClick={onSend} disabled={isLoading}>
          <Play className="h-4 w-4 mr-2" /> Send
        </Button>
      </div>

      {activeEndpoint && (
        <div className="text-[10px] text-muted-foreground font-mono shrink-0 px-1">
          Editing request:{' '}
          <span className="font-semibold text-foreground">{activeEndpoint.name}</span>
        </div>
      )}
    </>
  );
}
