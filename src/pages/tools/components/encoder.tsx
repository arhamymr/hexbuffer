'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
    <div className="flex flex-col h-full p-4 gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-medium">
            {codecLabels[activeType]} {currentMode.action}
          </h3>
          <p className="text-xs text-muted-foreground">
            {currentMode.source} to {currentMode.target}
          </p>
        </div>
        <Tabs value={mode} onValueChange={(v) => setMode(v as CodecMode)}>
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="encode">Encode</TabsTrigger>
            <TabsTrigger value="decode">Decode</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <Tabs value={activeType} onValueChange={(v) => setActiveType(v as CodecType)}>
        <TabsList className="grid grid-cols-3">
          <TabsTrigger value="url">URL</TabsTrigger>
          <TabsTrigger value="base64">Base64</TabsTrigger>
          <TabsTrigger value="hex">Hex</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-3 min-h-0">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label>{currentMode.source}</Label>
            <Button variant="ghost" size="xs" className="h-7 px-2" onClick={handleClear}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          <Textarea
            className="flex-1 font-mono text-sm"
            placeholder={`Enter ${currentMode.source.toLowerCase()}...`}
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
        </div>

        <div className="flex items-center justify-center lg:pt-8">
          <Button
            variant="outline"
            size="icon-sm"
            className="rounded-full"
            onClick={handleSwap}
            aria-label="Swap encode and decode"
          >
            <ArrowLeftRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label>{currentMode.target}</Label>
            <Button variant="ghost" size="xs" className="h-7 px-2" onClick={handleCopy} disabled={!output}>
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
          {error ? (
            <div className="flex-1 border rounded-md p-4 bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          ) : (
            <Textarea
              className="flex-1 font-mono text-sm"
              placeholder={`${currentMode.target} output will appear here...`}
              value={output}
              readOnly
            />
          )}
        </div>
      </div>
    </div>
  );
}
