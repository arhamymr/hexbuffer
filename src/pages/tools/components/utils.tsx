'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, RefreshCw, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

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
    <div className="flex flex-col h-full p-4 gap-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="uuid">UUID</TabsTrigger>
          <TabsTrigger value="jwt">JWT</TabsTrigger>
          <TabsTrigger value="hex">Hex</TabsTrigger>
          <TabsTrigger value="json">JSON</TabsTrigger>
          <TabsTrigger value="random">Random</TabsTrigger>
          <TabsTrigger value="dns">DNS</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex-1 overflow-auto">
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
    <div className="flex flex-col gap-4 h-full">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Label>Count:</Label>
          <Input
            type="number"
            min={1}
            max={100}
            value={count}
            onChange={(e) => setCount(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
            className="w-20"
          />
        </div>
        <Button onClick={generate} size="sm">
          <RefreshCw className="h-4 w-4 mr-1" />
          Generate
        </Button>
      </div>
      <div className="flex-1 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label>Generated UUIDs</Label>
          <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => navigator.clipboard.writeText(uuid)}>
            <Copy className="h-3.5 w-3.5" />
          </Button>
        </div>
        <Textarea className="flex-1 font-mono text-sm" value={uuid} readOnly />
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

  const copySection = async (label: string, content: string) => {
    await navigator.clipboard.writeText(content);
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex flex-col gap-2">
        <Label>JWT Token</Label>
        <Textarea
          className="font-mono text-sm h-32"
          placeholder="Paste JWT token here..."
          value={token}
          onChange={(e) => setToken(e.target.value)}
        />
      </div>

      {error && (
        <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md">{error}</div>
      )}

      {decoded && (
        <div className="flex-1 flex flex-col gap-4 overflow-auto">
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-muted/50 px-3 py-2 border-b flex items-center justify-between">
              <span className="font-medium text-sm">Header</span>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => copySection('header', JSON.stringify(decoded.header, null, 2))}>
                <Copy className="h-3 w-3" />
              </Button>
            </div>
            <div className="p-3">
              <pre className="font-mono text-xs overflow-auto">{JSON.stringify(decoded.header, null, 2)}</pre>
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <div className="bg-muted/50 px-3 py-2 border-b flex items-center justify-between">
              <span className="font-medium text-sm">Payload</span>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => copySection('payload', JSON.stringify(decoded.payload, null, 2))}>
                <Copy className="h-3 w-3" />
              </Button>
            </div>
            <div className="p-3">
              <pre className="font-mono text-xs overflow-auto">{JSON.stringify(decoded.payload, null, 2)}</pre>
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <div className="bg-muted/50 px-3 py-2 border-b flex items-center justify-between">
              <span className="font-medium text-sm">Signature</span>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => copySection('signature', decoded.signature)}>
                <Copy className="h-3 w-3" />
              </Button>
            </div>
            <div className="p-3">
              <pre className="font-mono text-xs break-all">{decoded.signature}</pre>
            </div>
          </div>

          {decoded.payload.exp && typeof decoded.payload.exp === 'number' && (
            <div className="text-sm text-muted-foreground">
              Token expires: {new Date((decoded.payload.exp as number) * 1000).toLocaleString()}
              {Date.now() > (decoded.payload.exp as number) * 1000 && (
                <span className="text-destructive ml-2">(Expired)</span>
              )}
            </div>
          )}
        </div>
      )}
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
    <div className="flex flex-col gap-4 h-full">
      <div className="flex items-center gap-2">
        <Label>Hex String</Label>
        <span className="text-xs text-muted-foreground">(remove spaces, colons, or 0x prefixes)</span>
      </div>
      <Textarea
        className="flex-1 font-mono text-sm"
        placeholder="Enter hex string (e.g., 48656c6c6f20576f726c64)"
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />
      <div className="flex items-center justify-between">
        <Label>Formatted Output</Label>
        <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => navigator.clipboard.writeText(output)} disabled={!output}>
          <Copy className="h-3.5 w-3.5" />
        </Button>
      </div>
      <Textarea className="flex-1 font-mono text-sm" value={output} readOnly />
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
    <div className="flex flex-col gap-4 h-full">
      <div className="flex items-center gap-4">
        <Label>JSON Input</Label>
        <Tabs value={mode} onValueChange={(v) => setMode(v as 'format' | 'minify')}>
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="format">Format</TabsTrigger>
            <TabsTrigger value="minify">Minify</TabsTrigger>
          </TabsList>
        </Tabs>
        {!isValid && input.trim() && (
          <span className="text-xs text-destructive">Invalid JSON</span>
        )}
      </div>
      <Textarea
        className="flex-1 font-mono text-sm"
        placeholder='{"key": "value"}'
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />
      <div className="flex items-center justify-between">
        <Label>Output</Label>
        <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => navigator.clipboard.writeText(output)} disabled={!output}>
          <Copy className="h-3.5 w-3.5" />
        </Button>
      </div>
      <Textarea className="flex-1 font-mono text-sm" value={output} readOnly />
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
    <div className="flex flex-col gap-4 h-full">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Label>Length:</Label>
          <Input
            type="number"
            min={1}
            max={1024}
            value={length}
            onChange={(e) => setLength(Math.max(1, Math.min(1024, parseInt(e.target.value) || 1)))}
            className="w-20"
          />
        </div>
        <div className="flex items-center gap-2">
          <Label>Charset:</Label>
          <Tabs value={charset} onValueChange={setCharset}>
            <TabsList className="grid grid-cols-3">
              <TabsTrigger value="alphanumeric">AlphaNum</TabsTrigger>
              <TabsTrigger value="hex">Hex</TabsTrigger>
              <TabsTrigger value="special">Special</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <Button onClick={generate} size="sm">
          <RefreshCw className="h-4 w-4 mr-1" />
          Regenerate
        </Button>
      </div>
      <div className="flex items-center justify-between">
        <Label>Random String</Label>
        <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => navigator.clipboard.writeText(output)}>
          <Copy className="h-3.5 w-3.5" />
        </Button>
      </div>
      <Textarea className="flex-1 font-mono text-sm" value={output} readOnly />
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
    <div className="flex flex-col gap-4 h-full">
      <div className="flex items-center gap-2">
        <Input
          placeholder="Enter domain (e.g., example.com)"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          className="flex-1"
        />
        <Tabs value={recordType} onValueChange={setRecordType}>
          <TabsList className="grid grid-cols-5">
            <TabsTrigger value="A">A</TabsTrigger>
            <TabsTrigger value="AAAA">AAAA</TabsTrigger>
            <TabsTrigger value="CNAME">CNAME</TabsTrigger>
            <TabsTrigger value="MX">MX</TabsTrigger>
            <TabsTrigger value="TXT">TXT</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button onClick={lookup} disabled={!domain.trim() || isLoading}>
          {isLoading ? 'Looking up...' : 'Lookup'}
        </Button>
      </div>

      {error && (
        <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md">{error}</div>
      )}

      {results.length > 0 && (
        <div className="flex-1 flex flex-col gap-2">
          <Label>Results</Label>
          <div className="flex-1 border rounded-lg p-4 overflow-auto">
            {results.map((result, index) => (
              <div key={index} className="font-mono text-sm mb-2">{result}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}