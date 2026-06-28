import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { ColorizedUrlInput } from '@/components/ui/select-env-input';
import { METHOD_COLORS } from '@/lib/method-colors';

interface ForgeRequestBarProps {
  method: string;
  url: string;
  activeEndpoint: { id: string; name: string } | null;
  onMethodChange: (method: string) => void;
  onUrlChange: (url: string) => void;
}

const METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'];

export function ForgeRequestBar({
  method,
  url,
  activeEndpoint,
  onMethodChange,
  onUrlChange,
}: ForgeRequestBarProps) {
  return (
    <>
      <div className="flex space-x-2 shrink-0">
        <Select value={method} onValueChange={onMethodChange}>
          <SelectTrigger className="w-28 font-semibold">
            {method ? (
              <span className={METHOD_COLORS[method]}>{method}</span>
            ) : (
              <SelectValue />
            )}
          </SelectTrigger>
          <SelectContent>
            {METHODS.map((m) => (
              <SelectItem key={m} value={m} className={cn('font-semibold', METHOD_COLORS[m])}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <ColorizedUrlInput
          placeholder="Enter request URL (e.g. https://api.example.com/v1/users)"
          className="flex-1 text-sm"
          value={url}
          onChange={onUrlChange}
        />
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
