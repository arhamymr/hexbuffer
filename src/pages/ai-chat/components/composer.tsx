'use client';

import { KeyRound, SendHorizonal, Square } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';

interface DashboardComposerProps {
  aiProvider: string;
  aiSettingsLoading: boolean;
  hasApiKey: boolean;
  isStreaming: boolean;
  model: string;
  onSend: () => Promise<void>;
  onStop: () => void;
  prompt: string;
  setPrompt: (value: string) => void;
}

export function DashboardComposer({
  aiProvider,
  aiSettingsLoading,
  hasApiKey,
  isStreaming,
  model,
  onSend,
  onStop,
  prompt,
  setPrompt,
}: DashboardComposerProps) {
  const providerLabel = aiProvider === 'deepseek' ? 'DeepSeek' : 'OpenAI';
  const canSend = prompt.trim().length > 0 && !isStreaming;

  return (
    <div className="mt-2 min-w-0 shrink-0">
      <Card className="border bg-background">
        <CardContent className="flex min-w-0 flex-col gap-2 p-2">
          <div className="flex min-h-9 min-w-0 items-center justify-between gap-2 rounded-md border bg-background px-3 py-2 text-sm">
            <span className="min-w-0 truncate">
              {aiSettingsLoading ? 'Loading AI settings...' : model}
            </span>
            <Badge variant="outline" className="shrink-0 gap-1">
              <KeyRound className="h-3 w-3" />
              {hasApiKey ? providerLabel : 'No key'}
            </Badge>
          </div>

          <Textarea
            className="min-h-24 resize-none"
            placeholder="Message AI..."
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                event.preventDefault();
                if (canSend) {
                  void onSend();
                }
              }
            }}
          />

          <Button
            size="xs"
            className="w-full"
            onClick={() => {
              if (isStreaming) {
                onStop();
                return;
              }

              void onSend();
            }}
            disabled={!canSend && !isStreaming}
          >
            {isStreaming ? (
              <>
                <Square className="mr-2 h-4 w-4" />
                Stop
              </>
            ) : (
              <>
                <SendHorizonal className="mr-2 h-4 w-4" />
                Send
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
