'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Copy, Trash2 } from 'lucide-react';
import CryptoJS from 'crypto-js';
import type { HashType } from '../types';

const hashOptions: { value: HashType; label: string; cryptoMethod: string }[] = [
  { value: 'md5', label: 'MD5', cryptoMethod: 'MD5' },
  { value: 'sha1', label: 'SHA-1', cryptoMethod: 'SHA1' },
  { value: 'sha224', label: 'SHA-224', cryptoMethod: 'SHA224' },
  { value: 'sha256', label: 'SHA-256', cryptoMethod: 'SHA256' },
  { value: 'sha384', label: 'SHA-384', cryptoMethod: 'SHA384' },
  { value: 'sha512', label: 'SHA-512', cryptoMethod: 'SHA512' },
  { value: 'sha3-224', label: 'SHA3-224', cryptoMethod: 'SHA3_224' },
  { value: 'sha3-256', label: 'SHA3-256', cryptoMethod: 'SHA3_256' },
  { value: 'sha3-384', label: 'SHA3-384', cryptoMethod: 'SHA3_384' },
  { value: 'sha3-512', label: 'SHA3-512', cryptoMethod: 'SHA3_512' },
  { value: 'ripemd160', label: 'RIPEMD-160', cryptoMethod: 'RIPEMD160' },
];

export function HashTool() {
  const [input, setInput] = React.useState('');
  const [activeType, setActiveType] = React.useState<HashType>('sha256');
  const [output, setOutput] = React.useState('');

  const handleHash = React.useCallback(() => {
    if (!input.trim()) {
      setOutput('');
      return;
    }
    try {
      const option = hashOptions.find((opt) => opt.value === activeType);
      if (option) {
        const hash = CryptoJS[option.cryptoMethod](input);
        setOutput(hash.toString());
      }
    } catch {
      setOutput('Error computing hash');
    }
  }, [input, activeType]);

  React.useEffect(() => {
    handleHash();
  }, [handleHash]);

  const handleCopy = async () => {
    if (output) {
      await navigator.clipboard.writeText(output);
    }
  };

  const handleClear = () => {
    setInput('');
    setOutput('');
  };

  return (
    <div className="flex flex-col h-full p-4 gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">Hash Generator</h3>
          <p className="text-xs text-muted-foreground">Compute cryptographic hash of text</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Label className="shrink-0">Algorithm</Label>
        <Select value={activeType} onValueChange={(v) => setActiveType(v as HashType)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {hashOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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
            placeholder="Enter text to hash..."
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
          <Textarea
            className="flex-1 font-mono text-sm"
            placeholder="Hash output will appear here..."
            value={output}
            readOnly
          />
        </div>
      </div>
    </div>
  );
}