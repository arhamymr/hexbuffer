'use client';

import { Play, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface RepeaterUrlBarProps {
  url: string;
  isLoading: boolean;
  onUrlChange: (url: string) => void;
  onSend: () => void;
}

export function RepeaterUrlBar({
  url,
  isLoading,
  onUrlChange,
  onSend,
}: RepeaterUrlBarProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      onSend();
    }
  };

  return (
    <div className="flex items-center gap-2 p-2 border-b bg-muted/20">
      <Input
        type="text"
        placeholder="Base URL for relative raw requests (e.g., https://example.com)"
        value={url}
        onChange={(e) => onUrlChange(e.target.value)}
        onKeyDown={handleKeyDown}
        className="flex-1 font-mono text-sm"
      />

      <Button
        size="xs"
        onClick={onSend}
        disabled={isLoading || !url.trim()}
        className="gap-2"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Play className="h-4 w-4" />
        )}
        Send
      </Button>
    </div>
  );
}
