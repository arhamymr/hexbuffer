'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
  const activeOption = React.useMemo(
    () => hashOptions.find((opt) => opt.value === activeType) ?? hashOptions[3],
    [activeType],
  );

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
    <div className="flex h-full min-h-0 flex-col bg-background">
      <header className="bg-muted px-3 py-3">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Select value={activeType} onValueChange={(v) => setActiveType(v as HashType)}>
              <SelectTrigger className="w-[200px] bg-background">
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
            <Badge variant="outline" className="font-normal">
              Generate {activeOption.label} digest
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={handleCopy} disabled={!output}>
              <Copy className="h-3.5 w-3.5" />
              Copy
            </Button>
            <Button variant="ghost" onClick={handleClear} disabled={!input && !output}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="min-h-0 flex-1 border-t">
        <section className="grid h-full min-h-0 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="flex min-h-0 flex-col border-b bg-background lg:border-b-0 lg:border-r">
            <div className="flex items-center justify-between gap-3 border-b px-3 py-2">
              <div>
                <Label className="text-sm font-medium">Input</Label>
                <div className="text-xs text-muted-foreground">
                  Enter text to hash with {activeOption.label}.
                </div>
              </div>
              <Button variant="ghost" onClick={handleClear} disabled={!input && !output}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <Textarea
              className="min-h-0 flex-1 resize-none rounded-none border-0 font-mono text-sm shadow-none focus-visible:ring-0"
              placeholder="Enter text to hash..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
          </div>

          <div className="flex min-h-0 flex-col bg-background">
            <div className="flex items-center justify-between gap-3 border-b px-3 py-2">
              <div>
                <Label className="text-sm font-medium">Output</Label>
                <div className="text-xs text-muted-foreground">
                  Hash output updates automatically.
                </div>
              </div>
              <Button variant="ghost" onClick={handleCopy} disabled={!output}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <Textarea
              className="min-h-0 flex-1 resize-none rounded-none border-0 font-mono text-sm shadow-none focus-visible:ring-0"
              placeholder="Hash output will appear here..."
              value={output}
              readOnly
            />
          </div>
        </section>
      </main>
    </div>
  );
}
