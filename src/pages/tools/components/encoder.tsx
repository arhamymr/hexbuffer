'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ArrowLeftRight, Copy, Trash2 } from 'lucide-react';
import CryptoJS from 'crypto-js';
import type { CodecType } from '../types';

type CodecMode = 'encode' | 'decode';

interface CodecResult {
  output: string;
  error: string | null;
}

const encoderFunctions: Record<CodecType, (input: string) => string> = {
  url: (input) => encodeURIComponent(input),
  base64: (input) => CryptoJS.enc.Utf8.parse(input).toString(CryptoJS.enc.Base64),
  hex: (input) => CryptoJS.enc.Utf8.parse(input).toString(CryptoJS.enc.Hex),
};

const decoderFunctions: Record<CodecType, (input: string) => CodecResult> = {
  url: (input) => {
    try {
      return { output: decodeURIComponent(input), error: null };
    } catch {
      return { output: '', error: 'Invalid URL-encoded string' };
    }
  },
  base64: (input) => {
    try {
      const output = CryptoJS.enc.Base64.parse(input).toString(CryptoJS.enc.Utf8);
      return output
        ? { output, error: null }
        : { output: '', error: 'Invalid Base64 string' };
    } catch {
      return { output: '', error: 'Invalid Base64 string' };
    }
  },
  hex: (input) => {
    try {
      const hex = input.replace(/\s/g, '');
      if (!/^[0-9a-fA-F]*$/.test(hex) || hex.length % 2 !== 0) {
        return { output: '', error: 'Invalid hex string' };
      }

      return { output: CryptoJS.enc.Hex.parse(hex).toString(CryptoJS.enc.Utf8), error: null };
    } catch {
      return { output: '', error: 'Invalid hex string' };
    }
  },
};

const codecLabels: Record<CodecType, string> = {
  url: 'URL',
  base64: 'Base64',
  hex: 'Hex',
};

const modeLabels: Record<CodecMode, { source: string; target: string; action: string }> = {
  encode: {
    source: 'Plain text',
    target: 'Encoded',
    action: 'Encode',
  },
  decode: {
    source: 'Encoded',
    target: 'Plain text',
    action: 'Decode',
  },
};

function convert(input: string, activeType: CodecType, mode: CodecMode): CodecResult {
  if (!input.trim()) {
    return { output: '', error: null };
  }

  if (mode === 'encode') {
    try {
      return { output: encoderFunctions[activeType](input), error: null };
    } catch {
      return { output: '', error: 'Encoding failed' };
    }
  }

  return decoderFunctions[activeType](input);
}

export function EncoderDecoderTool() {
  const [input, setInput] = React.useState('');
  const [activeType, setActiveType] = React.useState<CodecType>('url');
  const [mode, setMode] = React.useState<CodecMode>('encode');
  const [output, setOutput] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  const handleConvert = React.useCallback(() => {
    const result = convert(input, activeType, mode);
    setOutput(result.output);
    setError(result.error);
  }, [input, activeType, mode]);

  React.useEffect(() => {
    handleConvert();
  }, [input, activeType, mode, handleConvert]);

  const handleCopy = async () => {
    if (output) {
      await navigator.clipboard.writeText(output);
    }
  };

  const handleClear = () => {
    setInput('');
    setOutput('');
    setError(null);
  };

  const handleSwap = () => {
    setMode((currentMode) => (currentMode === 'encode' ? 'decode' : 'encode'));
    setInput(output || input);
  };

  const currentMode = modeLabels[mode];

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="flex h-10 shrink-0 items-center justify-between border-b bg-muted/40 px-3 gap-2">
        <div className="flex items-center gap-2">
          <Tabs value={activeType} onValueChange={(v) => setActiveType(v as CodecType)}>
            <TabsList className="h-7 bg-background p-0.5 border">
              <TabsTrigger value="url" className="h-6 text-xs px-2.5">URL</TabsTrigger>
              <TabsTrigger value="base64" className="h-6 text-xs px-2.5">Base64</TabsTrigger>
              <TabsTrigger value="hex" className="h-6 text-xs px-2.5">Hex</TabsTrigger>
            </TabsList>
          </Tabs>
          <Tabs value={mode} onValueChange={(v) => setMode(v as CodecMode)}>
            <TabsList className="h-7 bg-background p-0.5 border">
              <TabsTrigger value="encode" className="h-6 text-xs px-2.5">Encode</TabsTrigger>
              <TabsTrigger value="decode" className="h-6 text-xs px-2.5">Decode</TabsTrigger>
            </TabsList>
          </Tabs>
          <Badge variant="outline" className="font-normal text-[10px] py-px h-5 hidden md:inline-flex">
            {codecLabels[activeType]} {currentMode.source} to {currentMode.target}
          </Badge>
        </div>

        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" onClick={handleSwap} className="h-7 text-xs gap-1 px-2">
            <ArrowLeftRight className="h-3 w-3" />
            Swap
          </Button>
          <Button variant="outline" size="sm" onClick={handleCopy} disabled={!output} className="h-7 text-xs gap-1 px-2">
            <Copy className="h-3 w-3" />
            Copy Output
          </Button>
          <Button variant="ghost" size="icon" onClick={handleClear} disabled={!input && !output && !error} className="h-7 w-7 text-muted-foreground hover:text-foreground">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <main className="min-h-0 flex-1 flex flex-col">
        <section className="grid h-full min-h-0 grid-cols-1 lg:grid-cols-2">
          {/* Input Panel */}
          <div className="flex min-h-0 flex-col border-b bg-background lg:border-b-0 lg:border-r">
            <div className="flex h-8 shrink-0 items-center justify-between border-b bg-muted/10 px-3">
              <div className="flex items-baseline gap-2">
                <span className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">{currentMode.source}</span>
                <span className="text-[10px] text-muted-foreground hidden sm:inline">Enter content to {mode}</span>
              </div>
              <Button variant="ghost" size="icon" onClick={handleClear} disabled={!input && !output && !error} className="h-6 w-6 text-muted-foreground hover:text-foreground">
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
            <Textarea
              className="min-h-0 flex-1 resize-none rounded-none border-0 font-mono text-xs shadow-none focus-visible:ring-0 bg-transparent p-3"
              placeholder={`Enter ${currentMode.source.toLowerCase()}...`}
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
          </div>

          {/* Output Panel */}
          <div className="flex min-h-0 flex-col bg-background">
            <div className="flex h-8 shrink-0 items-center justify-between border-b bg-muted/10 px-3">
              <div className="flex items-baseline gap-2">
                <span className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">{currentMode.target}</span>
                <span className="text-[10px] text-muted-foreground hidden sm:inline">Auto-updates</span>
              </div>
              <Button variant="ghost" size="icon" onClick={handleCopy} disabled={!output} className="h-6 w-6 text-muted-foreground hover:text-foreground">
                <Copy className="h-3 w-3" />
              </Button>
            </div>
            {error ? (
              <div className="min-h-0 flex-1 bg-destructive/5 p-4 text-xs font-mono text-destructive whitespace-pre-wrap overflow-auto">
                {error}
              </div>
            ) : (
              <Textarea
                className="min-h-0 flex-1 resize-none rounded-none border-0 font-mono text-xs shadow-none focus-visible:ring-0 bg-transparent p-3"
                placeholder={`${currentMode.target} output will appear here...`}
                value={output}
                readOnly
              />
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
