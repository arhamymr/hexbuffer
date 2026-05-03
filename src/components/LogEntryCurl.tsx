'use client';

import { useState } from 'react';
import type { ApiCall } from '@/types';
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';

interface LogEntryCurlProps {
  call: ApiCall;
}

export function LogEntryCurl({ call }: LogEntryCurlProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      console.error('Failed to copy');
    }
  };

  const buildCurlCommand = (): string => {
    let cmd = `curl -X ${call.method} '${call.url}'`;
    for (const [k, v] of Object.entries(call.headers)) {
      cmd += ` \\\n  -H '${k}: ${v}'`;
    }
    if (call.request_body) {
      cmd += ` \\\n  -d '${call.request_body}'`;
    }
    return cmd;
  };

  const curl = buildCurlCommand();

  return (
    <div className="relative">
      <div className="absolute right-2 top-2 z-10">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={(e) => {
            e.stopPropagation();
            copyToClipboard(curl);
          }}
          title="Copy cURL"
        >
          {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
      <div className="bg-background p-3 rounded text-xs font-mono whitespace-pre-wrap overflow-auto max-h-48">
        {curl || <span className="text-muted-foreground">No curl command</span>}
      </div>
    </div>
  );
}