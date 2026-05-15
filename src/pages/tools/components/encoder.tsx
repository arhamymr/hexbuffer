'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, Trash2 } from 'lucide-react';
import CryptoJS from 'crypto-js';
import type { EncoderType } from '../types';

const encoderFunctions: Record<EncoderType, (input: string) => string> = {
  url: (input) => encodeURIComponent(input),
  base64: (input) => CryptoJS.enc.Utf8.parse(input).toString(CryptoJS.enc.Base64),
  hex: (input) => CryptoJS.enc.Utf8.parse(input).toString(CryptoJS.enc.Hex),
};

const encoderLabels: Record<EncoderType, string> = {
  url: 'URL Encode',
  base64: 'Base64 Encode',
  hex: 'Hex Encode',
};

const encoderDescriptions: Record<EncoderType, string> = {
  url: 'Encodes strings for URL use (percent encoding)',
  base64: 'Encodes data to Base64',
  hex: 'Encodes text as hexadecimal bytes',
};

export function EncoderTool() {
  const [input, setInput] = React.useState('');
  const [activeType, setActiveType] = React.useState<EncoderType>('url');
  const [output, setOutput] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  const handleEncode = React.useCallback(() => {
    if (!input.trim()) {
      setOutput('');
      setError(null);
      return;
    }
    try {
      const result = encoderFunctions[activeType](input);
      setError(null);
      setOutput(result);
    } catch {
      setError('Encoding failed');
      setOutput('');
    }
  }, [input, activeType]);

  React.useEffect(() => {
    handleEncode();
  }, [input, activeType, handleEncode]);

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
          <h3 className="font-medium">{encoderLabels[activeType]}</h3>
          <p className="text-xs text-muted-foreground">{encoderDescriptions[activeType]}</p>
        </div>
      </div>

      <Tabs value={activeType} onValueChange={(v) => setActiveType(v as EncoderType)}>
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
            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={handleClear}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          <Textarea
            className="flex-1 font-mono text-sm"
            placeholder="Enter text to encode..."
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
              placeholder="Encoded output will appear here..."
              value={output}
              readOnly
            />
          )}
        </div>
      </div>
    </div>
  );
}