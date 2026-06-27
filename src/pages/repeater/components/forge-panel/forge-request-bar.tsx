import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface ForgeRequestBarProps {
  method: string;
  url: string;
  activeEndpoint: { id: string; name: string } | null;
  onMethodChange: (method: string) => void;
  onUrlChange: (url: string) => void;
}

const METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'];

const METHOD_COLORS: Record<string, string> = {
  GET: 'text-green-500 dark:text-green-400',
  POST: 'text-amber-500 dark:text-amber-400',
  PUT: 'text-orange-500 dark:text-orange-400',
  DELETE: 'text-red-500 dark:text-red-400',
  PATCH: 'text-purple-500 dark:text-purple-400',
  OPTIONS: 'text-cyan-500 dark:text-cyan-400',
  HEAD: 'text-gray-500 dark:text-gray-400',
};

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

        <Input
          placeholder="Enter request URL (e.g. https://api.example.com/v1/users)"
          className="flex-1 text-sm"
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
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
