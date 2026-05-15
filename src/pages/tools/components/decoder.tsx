'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, Trash2 } from 'lucide-react';
import CryptoJS from 'crypto-js';
import type { DecoderType } from '../types';

const decoderFunctions: Record<DecoderType, (input: string) => string> = {
  url: (input) => {
    try {
      return decodeURIComponent(input);
    } catch {
      return 'Invalid URL-encoded string';
    }
  },
  base64: (input) => {
    try {
      return CryptoJS.enc.Base64.parse(input).toString(CryptoJS.enc.Utf8);
    } catch {
      return 'Invalid Base64 string';
    }
  },
  hex: (input) => {
    try {
      const hex = input.replace(/\s/g, '');
      if (!/^[0-9a-fA-F]*$/.test(hex)) return 'Invalid hex string';
      return CryptoJS.enc.Hex.parse(hex).toString(CryptoJS.enc.Utf8);
    } catch {
      return 'Invalid hex string';
    }
  },
};

const decoderLabels: Record<DecoderType, string> = {
  url: 'URL Decode',
  base64: 'Base64 Decode',
  hex: 'Hex Decode',
};

const decoderDescriptions: Record<DecoderType, string> = {
  url: 'Decodes URL-encoded strings (percent encoding)',
  base64: 'Decodes Base64 encoded data',
  hex: 'Decodes hexadecimal byte sequences',
};

export function DecoderTool() {
  const [input, setInput] = React.useState('');
  const [activeType, setActiveType] = React.useState<DecoderType>('url');
  const [output, setOutput] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  const handleDecode = React.useCallback(() => {
    if (!input.trim()) {
      setOutput('');
      setError(null);
      return;
    }
    const result = decoderFunctions[activeType](input);
    if (result.startsWith('Invalid')) {
      setError(result);
      setOutput('');
    } else {
      setError(null);
      setOutput(result);
    }
  }, [input, activeType]);

  React.useEffect(() => {
    handleDecode();
  }, [input, activeType, handleDecode]);

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

  return (
    <div className="flex flex-col h-full p-4 gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">{decoderLabels[activeType]}</h3>
          <p className="text-xs text-muted-foreground">{decoderDescriptions[activeType]}</p>
        </div>
      </div>

      <Tabs value={activeType} onValueChange={(v) => setActiveType(v as DecoderType)}>
        <TabsList className="grid grid-cols-3">
          <TabsTrigger value="url">URL</TabsTrigger>
          <TabsTrigger value="base64">Base64</TabsTrigger>
          <TabsTrigger value="hex">Hex</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex-1 grid grid-cols-2 gap-4 min-h-0">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label>Input</Label>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" className="h-7 px-2" onClick={handleClear}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <Textarea
            className="flex-1 font-mono text-sm"
            placeholder="Enter text to decode..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label>Output</Label>
            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={handleCopy} disabled={!output}>
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
              placeholder="Decoded output will appear here..."
              value={output}
              readOnly
            />
          )}
        </div>
      </div>
    </div>
  );
}