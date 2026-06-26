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
import type { HashType } from './types';

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

export function HashPage() {
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
      <div className="flex h-10 shrink-0 items-center justify-between border-b bg-muted/40 px-3 gap-2">
        <div className="flex items-center gap-2">
          <Select value={activeType} onValueChange={(v) => setActiveType(v as HashType)}>
            <SelectTrigger className="w-[160px] h-7 text-xs bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {hashOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Badge variant="outline" className="font-normal text-[10px] py-px h-5">
            Generate {activeOption.label} digest
          </Badge>
        </div>

        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" onClick={handleCopy} disabled={!output} className="h-7 text-xs gap-1 px-2">
            <Copy className="h-3 w-3" />
            Copy Output
          </Button>
          <Button variant="ghost" size="icon" onClick={handleClear} disabled={!input && !output} className="h-7 w-7 text-muted-foreground hover:text-foreground">
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
                <span className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">Input</span>
                <span className="text-[10px] text-muted-foreground hidden sm:inline">Enter text to hash</span>
              </div>
              <Button variant="ghost" size="icon" onClick={handleClear} disabled={!input && !output} className="h-6 w-6 text-muted-foreground hover:text-foreground">
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
            <Textarea
              className="min-h-0 flex-1 resize-none rounded-none border-0 font-mono text-xs shadow-none focus-visible:ring-0 bg-transparent p-3"
              placeholder="Enter text to hash..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
          </div>

          {/* Output Panel */}
          <div className="flex min-h-0 flex-col bg-background">
            <div className="flex h-8 shrink-0 items-center justify-between border-b bg-muted/10 px-3">
              <div className="flex items-baseline gap-2">
                <span className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">Output</span>
                <span className="text-[10px] text-muted-foreground hidden sm:inline">Auto-updates</span>
              </div>
              <Button variant="ghost" size="icon" onClick={handleCopy} disabled={!output} className="h-6 w-6 text-muted-foreground hover:text-foreground">
                <Copy className="h-3 w-3" />
              </Button>
            </div>
            <Textarea
              className="min-h-0 flex-1 resize-none rounded-none border-0 font-mono text-xs shadow-none focus-visible:ring-0 bg-transparent p-3"
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
