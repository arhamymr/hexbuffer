'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Copy, RefreshCw, Trash2, ShieldAlert } from 'lucide-react';

function generateUUIDv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function decodeJWT(token: string): { header: Record<string, unknown>; payload: Record<string, unknown>; signature: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const decodeBase64Url = (str: string) => {
      const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
      return JSON.parse(atob(padded));
    };

    return {
      header: decodeBase64Url(parts[0]),
      payload: decodeBase64Url(parts[1]),
      signature: parts[2],
    };
  } catch {
    return null;
  }
}

function formatHex(input: string): string {
  const hex = input.replace(/[\s:]/g, '').toLowerCase();
  if (!/^[0-9a-f]*$/.test(hex)) return 'Invalid hex';
  if (hex.length % 2 !== 0) return 'Hex must have even length';
  return hex.match(/.{1,2}/g)?.join(' ') || '';
}

function isValidJSON(str: string): boolean {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

function formatJSON(input: string): string {
  try {
    return JSON.stringify(JSON.parse(input), null, 2);
  } catch {
    return 'Invalid JSON';
  }
}

function minifyJSON(input: string): string {
  try {
    return JSON.stringify(JSON.parse(input));
  } catch {
    return 'Invalid JSON';
  }
}

function generateRandomString(length: number, charset: string): string {
  const array = new Uint32Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (x) => charset[x % charset.length]).join('');
}

export function UtilsTool() {
  const [activeTab, setActiveTab] = React.useState('uuid');

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="flex h-10 shrink-0 items-center border-b bg-muted/40 px-3">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="h-7 bg-background p-0.5 border">
            <TabsTrigger value="uuid" className="h-6 text-xs px-2.5">UUID</TabsTrigger>
            <TabsTrigger value="jwt" className="h-6 text-xs px-2.5">JWT</TabsTrigger>
            <TabsTrigger value="hex" className="h-6 text-xs px-2.5">Hex</TabsTrigger>
            <TabsTrigger value="json" className="h-6 text-xs px-2.5">JSON</TabsTrigger>
            <TabsTrigger value="random" className="h-6 text-xs px-2.5">Random</TabsTrigger>
            <TabsTrigger value="dns" className="h-6 text-xs px-2.5">DNS</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden flex flex-col bg-background">
        {activeTab === 'uuid' && <UUIDGenerator />}
        {activeTab === 'jwt' && <JWTDecoder />}
        {activeTab === 'hex' && <HexFormatter />}
        {activeTab === 'json' && <JSONFormatter />}
        {activeTab === 'random' && <RandomGenerator />}
        {activeTab === 'dns' && <DNSLookup />}
      </div>
    </div>
  );
}

function UUIDGenerator() {
  const [uuid, setUuid] = React.useState('');
  const [count, setCount] = React.useState(1);

  const generate = () => {
    const uuids = Array.from({ length: count }, () => generateUUIDv4());
    setUuid(uuids.join('\n'));
  };

  React.useEffect(() => {
    generate();
  }, []);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex h-9 shrink-0 items-center justify-between border-b bg-muted/5 px-3 py-1 gap-2">
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Count</Label>
          <Input
            type="number"
            min={1}
            max={100}
            value={count}
            onChange={(e) => setCount(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
            className="h-7 w-16 text-xs bg-background focus-visible:ring-1"
          />
        </div>
        <Button onClick={generate} size="sm" className="h-7 text-xs gap-1 px-2.5">
          <RefreshCw className="h-3.5 w-3.5" />
          Generate
        </Button>
      </div>
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex h-8 shrink-0 items-center justify-between border-b bg-muted/10 px-3">
          <div className="flex items-baseline gap-2">
            <span className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">Generated UUIDs</span>
            <span className="text-[10px] text-muted-foreground hidden sm:inline">Version 4</span>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={() => navigator.clipboard.writeText(uuid)}>
            <Copy className="h-3 w-3" />
          </Button>
        </div>
        <Textarea className="min-h-0 flex-1 resize-none rounded-none border-0 font-mono text-xs shadow-none focus-visible:ring-0 bg-transparent p-3" value={uuid} readOnly />
      </div>
    </div>
  );
}

function JWTDecoder() {
  const [token, setToken] = React.useState('');
  const [decoded, setDecoded] = React.useState<{ header: Record<string, unknown>; payload: Record<string, unknown>; signature: string } | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const decode = () => {
    if (!token.trim()) {
      setDecoded(null);
      setError(null);
      return;
    }
    const result = decodeJWT(token.trim());
    if (result) {
      setDecoded(result);
      setError(null);
    } else {
      setDecoded(null);
      setError('Invalid JWT token');
    }
  };

  React.useEffect(() => {
    decode();
  }, [token]);

  const copySection = async (content: string) => {
    await navigator.clipboard.writeText(content);
  };

  return (
    <div className="flex h-full min-h-0 flex-col lg:flex-row">
      {/* Left Input */}
      <div className="flex min-h-[160px] lg:h-full lg:w-1/2 flex-col border-b lg:border-b-0 lg:border-r">
        <div className="flex h-8 shrink-0 items-center justify-between border-b bg-muted/10 px-3">
          <div className="flex items-baseline gap-2">
            <span className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">JWT Input</span>
          </div>
        </div>
        <Textarea
          className="min-h-0 flex-1 resize-none rounded-none border-0 font-mono text-xs shadow-none focus-visible:ring-0 bg-transparent p-3"
          placeholder="Paste JWT token here..."
          value={token}
          onChange={(e) => setToken(e.target.value)}
        />
      </div>

      {/* Right Outputs */}
      <div className="flex-1 flex flex-col min-h-0 bg-background">
        <div className="flex h-8 shrink-0 items-center justify-between border-b bg-muted/10 px-3">
          <div className="flex items-baseline gap-2">
            <span className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">Breakdown</span>
          </div>
        </div>

        {error && (
          <div className="p-3 m-3 bg-destructive/5 text-destructive text-xs font-mono rounded border border-destructive/10">{error}</div>
        )}

        {decoded ? (
          <ScrollArea className="min-h-0 flex-1">
            <div className="p-3 space-y-3">
              <div className="border rounded-md overflow-hidden">
                <div className="bg-muted/10 px-3 py-1 border-b flex items-center justify-between">
                  <span className="font-semibold text-[10px] uppercase text-muted-foreground tracking-wider">Header</span>
                  <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => copySection(JSON.stringify(decoded.header, null, 2))}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <pre className="font-mono text-xs p-2.5 overflow-auto bg-muted/5">{JSON.stringify(decoded.header, null, 2)}</pre>
              </div>

              <div className="border rounded-md overflow-hidden">
                <div className="bg-muted/10 px-3 py-1 border-b flex items-center justify-between">
                  <span className="font-semibold text-[10px] uppercase text-muted-foreground tracking-wider">Payload</span>
                  <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => copySection(JSON.stringify(decoded.payload, null, 2))}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <pre className="font-mono text-xs p-2.5 overflow-auto bg-muted/5">{JSON.stringify(decoded.payload, null, 2)}</pre>
              </div>

              <div className="border rounded-md overflow-hidden">
                <div className="bg-muted/10 px-3 py-1 border-b flex items-center justify-between">
                  <span className="font-semibold text-[10px] uppercase text-muted-foreground tracking-wider">Signature</span>
                  <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => copySection(decoded.signature)}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <pre className="font-mono text-[10px] break-all p-2.5 bg-muted/5">{decoded.signature}</pre>
              </div>

              {decoded.payload.exp && typeof decoded.payload.exp === 'number' && (
                <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <span>Expires: {new Date((decoded.payload.exp as number) * 1000).toLocaleString()}</span>
                  {Date.now() > (decoded.payload.exp as number) * 1000 && (
                    <span className="text-destructive font-semibold flex items-center gap-0.5">
                      <ShieldAlert className="h-3 w-3" />
                      (Expired)
                    </span>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
        ) : (
          <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground">
            Decoded payload will show here
          </div>
        )}
      </div>
    </div>
  );
}

function HexFormatter() {
  const [input, setInput] = React.useState('');
  const [output, setOutput] = React.useState('');

  React.useEffect(() => {
    if (!input.trim()) {
      setOutput('');
      return;
    }
    setOutput(formatHex(input));
  }, [input]);

  return (
    <div className="flex h-full min-h-0 flex-col lg:flex-row">
      <div className="flex min-h-[120px] lg:h-full lg:w-1/2 flex-col border-b lg:border-b-0 lg:border-r">
        <div className="flex h-8 shrink-0 items-center justify-between border-b bg-muted/10 px-3">
          <div className="flex items-baseline gap-2">
            <span className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">Hex Input</span>
            <span className="text-[10px] text-muted-foreground hidden sm:inline">(removes 0x spaces, colons)</span>
          </div>
        </div>
        <Textarea
          className="min-h-0 flex-1 resize-none rounded-none border-0 font-mono text-xs shadow-none focus-visible:ring-0 bg-transparent p-3"
          placeholder="Enter hex string (e.g., 48656c6c6f20576f726c64)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
      </div>

      <div className="flex-1 flex flex-col min-h-0 bg-background">
        <div className="flex h-8 shrink-0 items-center justify-between border-b bg-muted/10 px-3">
          <div className="flex items-baseline gap-2">
            <span className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">Formatted Hex</span>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={() => navigator.clipboard.writeText(output)} disabled={!output}>
            <Copy className="h-3 w-3" />
          </Button>
        </div>
        <Textarea className="min-h-0 flex-1 resize-none rounded-none border-0 font-mono text-xs shadow-none focus-visible:ring-0 bg-transparent p-3" value={output} readOnly />
      </div>
    </div>
  );
}

function JSONFormatter() {
  const [input, setInput] = React.useState('');
  const [mode, setMode] = React.useState<'format' | 'minify'>('format');
  const [output, setOutput] = React.useState('');

  React.useEffect(() => {
    if (!input.trim()) {
      setOutput('');
      return;
    }
    setOutput(mode === 'format' ? formatJSON(input) : minifyJSON(input));
  }, [input, mode]);

  const isValid = isValidJSON(input);

  return (
    <div className="flex h-full min-h-0 flex-col lg:flex-row">
      <div className="flex min-h-[140px] lg:h-full lg:w-1/2 flex-col border-b lg:border-b-0 lg:border-r">
        <div className="flex h-8 shrink-0 items-center justify-between border-b bg-muted/10 px-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">JSON Input</span>
            <Tabs value={mode} onValueChange={(v) => setMode(v as 'format' | 'minify')}>
              <TabsList className="h-6 bg-background p-0.5 border">
                <TabsTrigger value="format" className="h-5 text-[10px] px-2">Format</TabsTrigger>
                <TabsTrigger value="minify" className="h-5 text-[10px] px-2">Minify</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          {!isValid && input.trim() && (
            <span className="text-[10px] text-destructive font-mono">Invalid JSON</span>
          )}
        </div>
        <Textarea
          className="min-h-0 flex-1 resize-none rounded-none border-0 font-mono text-xs shadow-none focus-visible:ring-0 bg-transparent p-3"
          placeholder='{"key": "value"}'
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
      </div>

      <div className="flex-1 flex flex-col min-h-0 bg-background">
        <div className="flex h-8 shrink-0 items-center justify-between border-b bg-muted/10 px-3">
          <div className="flex items-baseline gap-2">
            <span className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">Output</span>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={() => navigator.clipboard.writeText(output)} disabled={!output}>
            <Copy className="h-3 w-3" />
          </Button>
        </div>
        <Textarea className="min-h-0 flex-1 resize-none rounded-none border-0 font-mono text-xs shadow-none focus-visible:ring-0 bg-transparent p-3" value={output} readOnly />
      </div>
    </div>
  );
}

function RandomGenerator() {
  const [length, setLength] = React.useState(32);
  const [charset, setCharset] = React.useState('alphanumeric');
  const [output, setOutput] = React.useState('');

  const charsets: Record<string, string> = {
    alphanumeric: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
    alpha: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
    numeric: '0123456789',
    hex: '0123456789abcdef',
    special: '!@#$%^&*()_+-=[]{}|;:,.<>?',
    all: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?',
  };

  const generate = () => {
    const chars = charsets[charset] || charsets.alphanumeric;
    setOutput(generateRandomString(length, chars));
  };

  React.useEffect(() => {
    generate();
  }, [length, charset]);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex h-9 shrink-0 items-center justify-between border-b bg-muted/5 px-3 py-1 gap-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Label className="text-xs text-muted-foreground">Length</Label>
            <Input
              type="number"
              min={1}
              max={1024}
              value={length}
              onChange={(e) => setLength(Math.max(1, Math.min(1024, parseInt(e.target.value) || 1)))}
              className="h-7 w-16 text-xs bg-background focus-visible:ring-1"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <Label className="text-xs text-muted-foreground">Charset</Label>
            <Tabs value={charset} onValueChange={setCharset}>
              <TabsList className="h-6 bg-background p-0.5 border">
                <TabsTrigger value="alphanumeric" className="h-5 text-[10px] px-1.5">AlphaNum</TabsTrigger>
                <TabsTrigger value="hex" className="h-5 text-[10px] px-1.5">Hex</TabsTrigger>
                <TabsTrigger value="special" className="h-5 text-[10px] px-1.5">Special</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
        <Button onClick={generate} size="sm" className="h-7 text-xs gap-1 px-2.5">
          <RefreshCw className="h-3.5 w-3.5" />
          Regenerate
        </Button>
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex h-8 shrink-0 items-center justify-between border-b bg-muted/10 px-3">
          <div className="flex items-baseline gap-2">
            <span className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">Random String</span>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={() => navigator.clipboard.writeText(output)}>
            <Copy className="h-3 w-3" />
          </Button>
        </div>
        <Textarea className="min-h-0 flex-1 resize-none rounded-none border-0 font-mono text-xs shadow-none focus-visible:ring-0 bg-transparent p-3" value={output} readOnly />
      </div>
    </div>
  );
}

function DNSLookup() {
  const [domain, setDomain] = React.useState('');
  const [recordType, setRecordType] = React.useState('A');
  const [results, setResults] = React.useState<string[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const lookup = async () => {
    if (!domain.trim()) return;
    setIsLoading(true);
    setError(null);
    setResults([]);

    try {
      const dns = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=${recordType}`);
      const data = await dns.json();

      if (data.Status === 0 && data.Answer) {
        setResults(data.Answer.map((a: { data: string }) => a.data));
      } else if (data.Status === 3) {
        setError('NXDOMAIN - Domain does not exist');
      } else if (data.Status === 2) {
        setError('SERVFAIL - Server failed to resolve');
      } else {
        setError(`DNS Error - Status: ${data.Status}`);
      }
    } catch (err) {
      setError('Failed to perform DNS lookup');
    }

    setIsLoading(false);
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-background">
      <div className="flex h-9 shrink-0 items-center gap-2 border-b bg-muted/5 px-3 py-1">
        <Input
          placeholder="Enter domain (e.g. google.com)"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          className="h-7 text-xs bg-background flex-1 max-w-[240px]"
          onKeyDown={(e) => {
            if (e.key === 'Enter') lookup();
          }}
        />
        <Tabs value={recordType} onValueChange={setRecordType}>
          <TabsList className="h-6 bg-background p-0.5 border">
            <TabsTrigger value="A" className="h-5 text-[10px] px-1.5">A</TabsTrigger>
            <TabsTrigger value="AAAA" className="h-5 text-[10px] px-1.5">AAAA</TabsTrigger>
            <TabsTrigger value="CNAME" className="h-5 text-[10px] px-1.5">CNAME</TabsTrigger>
            <TabsTrigger value="MX" className="h-5 text-[10px] px-1.5">MX</TabsTrigger>
            <TabsTrigger value="TXT" className="h-5 text-[10px] px-1.5">TXT</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button onClick={lookup} disabled={!domain.trim() || isLoading} className="h-7 text-xs px-2.5">
          {isLoading ? 'Looking up...' : 'Lookup'}
        </Button>
      </div>

      <div className="flex-1 flex flex-col min-h-0 bg-background">
        <div className="flex h-8 shrink-0 items-center justify-between border-b bg-muted/10 px-3">
          <div className="flex items-baseline gap-2">
            <span className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">DNS Records</span>
          </div>
        </div>

        {error && (
          <div className="p-3 m-3 bg-destructive/5 text-destructive text-xs font-mono rounded border border-destructive/10 shrink-0">{error}</div>
        )}

        <div className="flex-1 min-h-0 p-3 overflow-auto">
          {results.length > 0 ? (
            <div className="border rounded-md bg-muted/5 divide-y">
              {results.map((result, index) => (
                <div key={index} className="font-mono text-xs p-2 break-all">{result}</div>
              ))}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              {isLoading ? 'Resolving domain name...' : 'Lookup a domain to see records'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}