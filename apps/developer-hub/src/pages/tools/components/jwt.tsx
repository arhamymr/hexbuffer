import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Copy,
  Trash2,
  Shield,
  ShieldAlert,
  AlertTriangle,
  Info,
  Key,
} from 'lucide-react';
import type { JwtAlgorithm, JwtDecoded, JwtVulnerability, JwtVulnerabilitySeverity } from '../types';

// ── Types ─────────────────────────────────────────────────

type JwtMode = 'decode' | 'generate';

// ── Constants ─────────────────────────────────────────────

const SEVERITY_CONFIG: Record<
  JwtVulnerabilitySeverity,
  { color: string; icon: React.ElementType }
> = {
  critical: { color: 'text-red-500 border-red-500/20 bg-red-500/5', icon: ShieldAlert },
  high: { color: 'text-orange-500 border-orange-500/20 bg-orange-500/5', icon: Shield },
  medium: { color: 'text-yellow-500 border-yellow-500/20 bg-yellow-500/5', icon: AlertTriangle },
  low: { color: 'text-blue-500 border-blue-500/20 bg-blue-500/5', icon: Info },
  info: { color: 'text-muted-foreground border-border bg-muted/50', icon: Info },
};

const ALGORITHM_OPTIONS: { value: JwtAlgorithm; label: string }[] = [
  { value: 'HS256', label: 'HS256' },
  { value: 'HS384', label: 'HS384' },
  { value: 'HS512', label: 'HS512' },
];

const DEFAULT_HEADER = JSON.stringify({ alg: 'HS256', typ: 'JWT' }, null, 2);
const DEFAULT_PAYLOAD = JSON.stringify(
  { sub: '1234567890', name: 'John Doe', iat: 1516239022 },
  null,
  2,
);

// ── Helpers ───────────────────────────────────────────────

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = base64.length % 4;
  if (pad === 2) base64 += '==';
  else if (pad === 3) base64 += '=';
  try {
    return decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    );
  } catch {
    return atob(base64);
  }
}

function base64UrlEncode(str: string): string {
  const encoded = btoa(
    encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) =>
      String.fromCharCode(parseInt(p1, 16)),
    ),
  );
  return encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlEncodeBytes(bytes: Uint8Array): string {
  const binary = Array.from(bytes, (b) => String.fromCharCode(b)).join('');
  const encoded = btoa(binary);
  return encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decodeJwt(token: string): JwtDecoded | null {
  const trimmed = token.trim();
  if (!trimmed) return null;
  const parts = trimmed.split('.');
  if (parts.length !== 3) return null;
  try {
    const header = JSON.parse(base64UrlDecode(parts[0]));
    const payload = JSON.parse(base64UrlDecode(parts[1]));
    return {
      header,
      payload,
      signature: parts[2],
      algorithm: String(header.alg ?? 'unknown'),
      parts: parts as [string, string, string],
    };
  } catch {
    return null;
  }
}

function formatTimestamp(value: unknown): string | null {
  if (typeof value !== 'number') return null;
  const epoch = value > 1e12 ? value / 1000 : value;
  const date = new Date(epoch * 1000);
  if (isNaN(date.getTime())) return null;

  const formatted = date.toISOString().replace('T', ' ').replace('.000Z', ' UTC');
  const now = Date.now() / 1000;
  const diffSec = epoch - now;
  const absDiff = Math.abs(diffSec);

  let relative: string;
  if (absDiff < 60) relative = `${Math.round(absDiff)}s`;
  else if (absDiff < 3600) relative = `${Math.round(absDiff / 60)}m`;
  else if (absDiff < 86400) relative = `${Math.round(absDiff / 3600)}h`;
  else relative = `${Math.round(absDiff / 86400)}d`;

  const direction = diffSec < 0 ? `${relative} ago` : `in ${relative}`;
  return `${formatted} (${direction})`;
}

function checkVulnerabilities(decoded: JwtDecoded): JwtVulnerability[] {
  const findings: JwtVulnerability[] = [];
  const alg = decoded.algorithm.toLowerCase();

  if (alg === 'none') {
    findings.push({
      id: 'none-alg',
      severity: 'critical',
      title: "Algorithm set to 'none'",
      description:
        'The token uses the "none" algorithm, which disables signature verification. An attacker can forge arbitrary tokens.',
    });
  }

  const now = Date.now() / 1000;

  if (typeof decoded.payload.exp === 'number') {
    const exp = decoded.payload.exp > 1e12 ? decoded.payload.exp / 1000 : decoded.payload.exp;
    if (exp < now) {
      findings.push({
        id: 'expired',
        severity: 'high',
        title: 'Token has expired',
        description: `The exp claim (${exp}) is in the past. This token should no longer be valid.`,
      });
    }
  } else {
    findings.push({
      id: 'missing-exp',
      severity: 'medium',
      title: 'No expiration claim',
      description: 'The token has no exp claim. Without expiration, tokens never expire unless enforced server-side.',
    });
  }

  if (typeof decoded.payload.nbf === 'number') {
    const nbf = decoded.payload.nbf > 1e12 ? decoded.payload.nbf / 1000 : decoded.payload.nbf;
    if (nbf > now) {
      findings.push({
        id: 'not-yet-valid',
        severity: 'medium',
        title: 'Token not yet valid',
        description: `The nbf claim (${nbf}) is in the future. This token should not be accepted yet.`,
      });
    }
  }

  if (typeof decoded.payload.iat !== 'number') {
    findings.push({
      id: 'missing-iat',
      severity: 'low',
      title: 'No issued-at claim',
      description: 'The token has no iat claim, making it harder to determine when it was issued.',
    });
  }

  if (alg.startsWith('hs')) {
    findings.push({
      id: 'symmetric-alg',
      severity: 'info',
      title: 'Symmetric algorithm',
      description:
        'The token uses a symmetric algorithm (HMAC). Consider asymmetric algorithms (RS256, ES256) for better key management.',
    });
  }

  return findings;
}

async function signJwt(
  header: object,
  payload: object,
  secret: string,
  algorithm: JwtAlgorithm,
): Promise<string> {
  const hashMap: Record<JwtAlgorithm, string> = {
    HS256: 'SHA-256',
    HS384: 'SHA-384',
    HS512: 'SHA-512',
  };

  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const data = `${headerB64}.${payloadB64}`;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: hashMap[algorithm] },
    false,
    ['sign'],
  );

  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  const sigB64 = base64UrlEncodeBytes(new Uint8Array(signature));

  return `${data}.${sigB64}`;
}

// ── Sub-components ────────────────────────────────────────

function VulnerabilityCard({ vuln }: { vuln: JwtVulnerability }) {
  const config = SEVERITY_CONFIG[vuln.severity];
  const Icon = config.icon;

  return (
    <div className={`flex items-start gap-2.5 rounded-md border p-2 text-xs ${config.color}`}>
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold">{vuln.title}</span>
          <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 uppercase font-medium">
            {vuln.severity}
          </Badge>
        </div>
        <p className="mt-0.5 opacity-80 text-[11px] leading-relaxed">{vuln.description}</p>
      </div>
    </div>
  );
}

function DecodedSection({
  title,
  data,
}: {
  title: string;
  data: Record<string, unknown>;
}) {
  const timestampKeys = new Set(['iat', 'exp', 'nbf']);

  return (
    <div>
      <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
        {title}
      </Label>
      <div className="mt-1 space-y-0.5">
        {Object.entries(data).map(([key, value]) => {
          const display =
            timestampKeys.has(key) && typeof value === 'number'
              ? formatTimestamp(value) ?? String(value)
              : typeof value === 'object'
                ? JSON.stringify(value)
                : String(value);

          return (
            <div key={key} className="flex items-baseline gap-2 text-xs">
              <span className="font-mono text-muted-foreground shrink-0">{key}:</span>
              <span className="font-mono break-all">{display}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────

export function JwtTool() {
  const [mode, setMode] = React.useState<JwtMode>('decode');

  // Decode state
  const [tokenInput, setTokenInput] = React.useState('');
  const [decoded, setDecoded] = React.useState<JwtDecoded | null>(null);
  const [vulnerabilities, setVulnerabilities] = React.useState<JwtVulnerability[]>([]);
  const [decodeError, setDecodeError] = React.useState<string | null>(null);

  // Generate state
  const [genHeader, setGenHeader] = React.useState(DEFAULT_HEADER);
  const [genPayload, setGenPayload] = React.useState(DEFAULT_PAYLOAD);
  const [genSecret, setGenSecret] = React.useState('');
  const [genAlgorithm, setGenAlgorithm] = React.useState<JwtAlgorithm>('HS256');
  const [generatedToken, setGeneratedToken] = React.useState('');
  const [genError, setGenError] = React.useState<string | null>(null);
  const [generating, setGenerating] = React.useState(false);

  // Auto-decode on input change
  React.useEffect(() => {
    if (!tokenInput.trim()) {
      setDecoded(null);
      setVulnerabilities([]);
      setDecodeError(null);
      return;
    }
    const result = decodeJwt(tokenInput);
    if (result) {
      setDecoded(result);
      setVulnerabilities(checkVulnerabilities(result));
      setDecodeError(null);
    } else {
      setDecoded(null);
      setVulnerabilities([]);
      setDecodeError('Invalid JWT format. Expected three base64url-encoded parts separated by dots.');
    }
  }, [tokenInput]);

  const handleGenerate = async () => {
    setGenError(null);
    setGenerating(true);
    try {
      let headerObj: Record<string, unknown>;
      let payloadObj: Record<string, unknown>;
      try {
        headerObj = JSON.parse(genHeader);
      } catch {
        setGenError('Invalid JSON in header field');
        setGenerating(false);
        return;
      }
      try {
        payloadObj = JSON.parse(genPayload);
      } catch {
        setGenError('Invalid JSON in payload field');
        setGenerating(false);
        return;
      }
      if (!genSecret) {
        setGenError('Secret key is required');
        setGenerating(false);
        return;
      }
      headerObj.alg = genAlgorithm;
      const token = await signJwt(headerObj, payloadObj, genSecret, genAlgorithm);
      setGeneratedToken(token);
    } catch (e) {
      setGenError(`Signing failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async (text: string) => {
    if (text) await navigator.clipboard.writeText(text);
  };

  const handleClear = () => {
    setTokenInput('');
    setDecoded(null);
    setVulnerabilities([]);
    setDecodeError(null);
  };

  const handleClearGenerate = () => {
    setGenHeader(DEFAULT_HEADER);
    setGenPayload(DEFAULT_PAYLOAD);
    setGenSecret('');
    setGeneratedToken('');
    setGenError(null);
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="flex h-10 shrink-0 items-center justify-between border-b bg-muted/40 px-3 gap-2">
        <div className="flex items-center gap-2">
          <Tabs value={mode} onValueChange={(v) => setMode(v as JwtMode)}>
            <TabsList className="h-7 bg-background p-0.5 border">
              <TabsTrigger value="decode" className="h-6 text-xs px-2.5">Decode</TabsTrigger>
              <TabsTrigger value="generate" className="h-6 text-xs px-2.5">Generate</TabsTrigger>
            </TabsList>
          </Tabs>
          {mode === 'decode' && decoded && (
            <Badge variant="outline" className="font-normal text-[10px] py-px h-5">
              {decoded.algorithm}
            </Badge>
          )}
          {mode === 'decode' && vulnerabilities.length > 0 && (
            <Badge variant="outline" className="font-normal text-[10px] py-px h-5 text-amber-500 border-amber-500/20">
              {vulnerabilities.length} finding{vulnerabilities.length !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {mode === 'decode' && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopy(tokenInput)}
                disabled={!tokenInput}
                className="h-7 text-xs gap-1 px-2"
              >
                <Copy className="h-3 w-3" />
                Copy Token
              </Button>
              <Button variant="ghost" size="icon" onClick={handleClear} disabled={!tokenInput} className="h-7 w-7 text-muted-foreground hover:text-foreground">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
          {mode === 'generate' && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopy(generatedToken)}
                disabled={!generatedToken}
                className="h-7 text-xs gap-1 px-2"
              >
                <Copy className="h-3 w-3" />
                Copy Token
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClearGenerate}
                disabled={!genHeader && !genPayload && !generatedToken}
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>
      </div>

      <main className="min-h-0 flex-1 flex flex-col">
        {mode === 'decode' ? (
          <div className="flex h-full min-h-0 flex-col">
            <section className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-2">
              {/* Left: Token Input */}
              <div className="flex min-h-0 flex-col border-b bg-background lg:border-b-0 lg:border-r">
                <div className="flex h-8 shrink-0 items-center justify-between border-b bg-muted/10 px-3">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">JWT Token</span>
                    <span className="text-[10px] text-muted-foreground hidden sm:inline">Paste token to decode</span>
                  </div>
                </div>
                <Textarea
                  className="min-h-0 flex-1 resize-none rounded-none border-0 font-mono text-xs shadow-none focus-visible:ring-0 bg-transparent p-3"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                />
              </div>

              {/* Right: Decoded Output */}
              <div className="flex min-h-0 flex-col bg-background">
                <div className="flex h-8 shrink-0 items-center justify-between border-b bg-muted/10 px-3">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">Decoded Breakdown</span>
                    <span className="text-[10px] text-muted-foreground hidden sm:inline">Header, payload & signature</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      handleCopy(
                        decoded
                          ? `Header:\n${JSON.stringify(decoded.header, null, 2)}\n\nPayload:\n${JSON.stringify(decoded.payload, null, 2)}`
                          : '',
                      )
                    }
                    disabled={!decoded}
                    className="h-6 w-6 text-muted-foreground hover:text-foreground"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                {decodeError ? (
                  <div className="min-h-0 flex-1 bg-destructive/5 p-4 text-xs font-mono text-destructive whitespace-pre-wrap overflow-auto">
                    {decodeError}
                  </div>
                ) : decoded ? (
                  <ScrollArea className="min-h-0 flex-1">
                    <div className="space-y-4 p-4">
                      <DecodedSection title="Header" data={decoded.header} />
                      <DecodedSection title="Payload" data={decoded.payload} />
                      <div>
                        <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
                          Signature
                        </Label>
                        <div className="mt-1 space-y-0.5">
                          <div className="flex items-baseline gap-2 text-xs">
                            <span className="font-mono text-muted-foreground shrink-0">
                              Algorithm:
                            </span>
                            <span className="font-mono">{decoded.algorithm}</span>
                          </div>
                          <div className="flex items-baseline gap-2 text-xs">
                            <span className="font-mono text-muted-foreground shrink-0">
                              Value:
                            </span>
                            <span className="font-mono break-all text-[11px] opacity-85">
                              {decoded.signature}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="flex min-h-0 flex-1 items-center justify-center text-xs text-muted-foreground">
                    Paste a JWT token to decode.
                  </div>
                )}
              </div>
            </section>

            {/* Vulnerability Findings */}
            {vulnerabilities.length > 0 && (
              <section className="border-t bg-background flex flex-col shrink-0">
                <div className="flex h-8 shrink-0 items-center justify-between border-b bg-muted/15 px-3">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">Vulnerability Findings</span>
                    <span className="text-[10px] text-muted-foreground hidden sm:inline">{vulnerabilities.length} issue{vulnerabilities.length !== 1 ? 's' : ''} detected</span>
                  </div>
                </div>
                <ScrollArea className="max-h-[140px] overflow-auto">
                  <div className="space-y-1.5 p-3">
                    {vulnerabilities.map((v) => (
                      <VulnerabilityCard key={v.id} vuln={v} />
                    ))}
                  </div>
                </ScrollArea>
              </section>
            )}
          </div>
        ) : (
          /* Generate Mode */
          <section className="grid h-full min-h-0 grid-cols-1 lg:grid-cols-2">
            {/* Left: Config */}
            <div className="flex min-h-0 flex-col border-b bg-background lg:border-b-0 lg:border-r">
              <div className="flex h-8 shrink-0 items-center justify-between border-b bg-muted/10 px-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">Configuration</span>
                  <span className="text-[10px] text-muted-foreground hidden sm:inline">Set keys & payload</span>
                </div>
              </div>
              <ScrollArea className="min-h-0 flex-1">
                <div className="space-y-4 p-4">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-muted-foreground">Header (JSON)</Label>
                    <Textarea
                      className="min-h-[80px] font-mono text-xs p-2.5 bg-muted/5 focus-visible:ring-1"
                      value={genHeader}
                      onChange={(e) => setGenHeader(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-muted-foreground">Payload (JSON)</Label>
                    <Textarea
                      className="min-h-[120px] font-mono text-xs p-2.5 bg-muted/5 focus-visible:ring-1"
                      value={genPayload}
                      onChange={(e) => setGenPayload(e.target.value)}
                    />
                  </div>
                  <div className="flex items-end gap-3 pt-1">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs font-semibold text-muted-foreground">Secret Key</Label>
                      <Input
                        className="h-8 font-mono text-xs bg-muted/5 focus-visible:ring-1"
                        type="password"
                        placeholder="Enter secret key..."
                        value={genSecret}
                        onChange={(e) => setGenSecret(e.target.value)}
                      />
                    </div>
                    <div className="w-[110px] space-y-1">
                      <Label className="text-xs font-semibold text-muted-foreground">Algorithm</Label>
                      <Select
                        value={genAlgorithm}
                        onValueChange={(v) => setGenAlgorithm(v as JwtAlgorithm)}
                      >
                        <SelectTrigger className="h-8 text-xs bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ALGORITHM_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value} className="text-xs">
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button
                    className="w-full h-8 text-xs gap-1.5 mt-2"
                    onClick={handleGenerate}
                    disabled={generating || !genSecret}
                  >
                    <Key className="h-3.5 w-3.5" />
                    {generating ? 'Generating...' : 'Generate JWT'}
                  </Button>
                  {genError && (
                    <div className="rounded-md bg-destructive/5 p-2.5 text-xs text-destructive font-mono">
                      {genError}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Right: Output */}
            <div className="flex min-h-0 flex-col bg-background">
              <div className="flex h-8 shrink-0 items-center justify-between border-b bg-muted/10 px-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">Generated Token</span>
                  <span className="text-[10px] text-muted-foreground hidden sm:inline">Signed output</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleCopy(generatedToken)}
                  disabled={!generatedToken}
                  className="h-6 w-6 text-muted-foreground hover:text-foreground"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
              <Textarea
                className="min-h-0 flex-1 resize-none rounded-none border-0 font-mono text-xs shadow-none focus-visible:ring-0 bg-transparent p-3"
                placeholder="Generated JWT token will appear here..."
                value={generatedToken}
                readOnly
              />
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
