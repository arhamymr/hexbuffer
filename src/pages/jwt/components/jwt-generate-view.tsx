import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Copy, Key } from 'lucide-react';
import type { JwtAlgorithm } from '../types';
import { ALGORITHM_OPTIONS } from '../constants';

interface JwtGenerateViewProps {
  genHeader: string;
  setGenHeader: (v: string) => void;
  genPayload: string;
  setGenPayload: (v: string) => void;
  genSecret: string;
  setGenSecret: (v: string) => void;
  genAlgorithm: JwtAlgorithm;
  setGenAlgorithm: (v: JwtAlgorithm) => void;
  generatedToken: string;
  genError: string | null;
  generating: boolean;
  onGenerate: () => void;
  onCopy: (text: string) => void;
}

export function JwtGenerateView({
  genHeader,
  setGenHeader,
  genPayload,
  setGenPayload,
  genSecret,
  setGenSecret,
  genAlgorithm,
  setGenAlgorithm,
  generatedToken,
  genError,
  generating,
  onGenerate,
  onCopy,
}: JwtGenerateViewProps) {
  return (
    <section className="grid h-full min-h-0 grid-cols-1 lg:grid-cols-2">
      {/* Left: Config */}
      <div className="flex min-h-0 flex-col border-b bg-background lg:border-b-0 lg:border-r">
        <div className="flex h-8 shrink-0 items-center justify-between border-b bg-muted/10 px-3">
          <div className="flex items-baseline gap-2">
            <span className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">
              Configuration
            </span>
            <span className="text-[10px] text-muted-foreground hidden sm:inline">
              Set keys & payload
            </span>
          </div>
        </div>
        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-4 p-4">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-muted-foreground">
                Header (JSON)
              </Label>
              <Textarea
                className="min-h-[80px] font-mono text-xs p-2.5 bg-muted/5 focus-visible:ring-1"
                value={genHeader}
                onChange={(e) => setGenHeader(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-muted-foreground">
                Payload (JSON)
              </Label>
              <Textarea
                className="min-h-[120px] font-mono text-xs p-2.5 bg-muted/5 focus-visible:ring-1"
                value={genPayload}
                onChange={(e) => setGenPayload(e.target.value)}
              />
            </div>
            <div className="flex items-end gap-3 pt-1">
              <div className="flex-1 space-y-1">
                <Label className="text-xs font-semibold text-muted-foreground">
                  Secret Key
                </Label>
                <Input
                  className="h-8 font-mono text-xs bg-muted/5 focus-visible:ring-1"
                  type="password"
                  placeholder="Enter secret key..."
                  value={genSecret}
                  onChange={(e) => setGenSecret(e.target.value)}
                />
              </div>
              <div className="w-[110px] space-y-1">
                <Label className="text-xs font-semibold text-muted-foreground">
                  Algorithm
                </Label>
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
              onClick={onGenerate}
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
            <span className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">
              Generated Token
            </span>
            <span className="text-[10px] text-muted-foreground hidden sm:inline">
              Signed output
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onCopy(generatedToken)}
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
  );
}
