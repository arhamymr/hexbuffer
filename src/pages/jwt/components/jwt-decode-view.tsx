import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CopyIcon } from '@phosphor-icons/react';
import type { JwtDecoded, JwtVulnerability } from '../types';
import { ColorizedJwtInput } from './colorized-jwt-input';
import { DecodedSection } from './decoded-section';
import { VulnerabilityCard } from './vulnerability-card';

interface JwtDecodeViewProps {
  tokenInput: string;
  setTokenInput: (v: string) => void;
  decoded: JwtDecoded | null;
  vulnerabilities: JwtVulnerability[];
  decodeError: string | null;
  onCopy: (text: string) => void;
}

export function JwtDecodeView({
  tokenInput,
  setTokenInput,
  decoded,
  vulnerabilities,
  decodeError,
  onCopy,
}: JwtDecodeViewProps) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <section className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-2">
        {/* Left: Token Input */}
        <div className="flex min-h-0 flex-col bg-background lg:border-b-0 lg:border-r">
          <div className="flex h-8 shrink-0 items-center justify-between border-b bg-muted/10 px-3">
            <div className="flex items-baseline gap-2">
              <span className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">
                JWT Token
              </span>
              <span className="text-[10px] text-muted-foreground hidden sm:inline">
                Paste token to decode
              </span>
            </div>
          </div>
          <ColorizedJwtInput
            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            value={tokenInput}
            onChange={setTokenInput}
          />
        </div>

        {/* Right: Decoded Output */}
        <div className="flex min-h-0 flex-col bg-background">
          <div className="flex h-8 shrink-0 items-center justify-between border-b bg-muted/10 px-3">
            <div className="flex items-baseline gap-2">
              <span className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">
                Decoded Breakdown
              </span>
              <span className="text-[10px] text-muted-foreground hidden sm:inline">
                Header, payload & signature
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() =>
                onCopy(
                  decoded
                    ? `Header:\n${JSON.stringify(decoded.header, null, 2)}\n\nPayload:\n${JSON.stringify(decoded.payload, null, 2)}`
                    : '',
                )
              }
              disabled={!decoded}
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
            >
              <CopyIcon className="h-3 w-3" />
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
              <span className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">
                Vulnerability Findings
              </span>
              <span className="text-[10px] text-muted-foreground hidden sm:inline">
                {vulnerabilities.length} issue{vulnerabilities.length !== 1 ? 's' : ''} detected
              </span>
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
  );
}
