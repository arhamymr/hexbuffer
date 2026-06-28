import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CopyIcon } from '@phosphor-icons/react';
import type { XssEncodingType } from '../types';
import { ENCODING_LABELS, ENCODING_ORDER } from '../constants';

interface PayloadBuilderPanelProps {
  basePayload: string;
  onBasePayloadChange: (v: string) => void;
  encodings: Set<XssEncodingType>;
  onToggleEncoding: (type: XssEncodingType) => void;
  injectionContext: string;
  onInjectionContextChange: (v: string) => void;
  encodedOutput: string;
  onCopy: (text: string) => void;
}

export function PayloadBuilderPanel({
  basePayload,
  onBasePayloadChange,
  encodings,
  onToggleEncoding,
  injectionContext,
  onInjectionContextChange,
  encodedOutput,
  onCopy,
}: PayloadBuilderPanelProps) {
  return (
    <div className="flex min-h-0 flex-col bg-background">
      <div className="flex h-8 shrink-0 items-center justify-between border-b bg-muted/10 px-3">
        <div className="flex items-baseline gap-2">
          <span className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">
            Payload Builder
          </span>
          <span className="text-[10px] text-muted-foreground hidden sm:inline">
            Apply encoding and context
          </span>
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-4 p-4">
          {/* Selected Payload */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-muted-foreground">Payload</Label>
            <Textarea
              className="min-h-[70px] font-mono text-xs p-2.5 bg-muted/5 focus-visible:ring-1"
              placeholder="Select a payload from the library or type your own..."
              value={basePayload}
              onChange={(e) => onBasePayloadChange(e.target.value)}
            />
          </div>

          {/* Encoding Pipeline */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-muted-foreground">
              Encoding Pipeline
            </Label>
            <div className="text-[10px] text-muted-foreground">
              Applied in order: URL → HTML Entity → Base64 → Double URL → Unicode
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-2 py-1">
              {ENCODING_ORDER.map((enc) => (
                <label
                  key={enc}
                  className="flex items-center gap-1.5 cursor-pointer text-xs select-none"
                >
                  <Checkbox
                    checked={encodings.has(enc)}
                    onCheckedChange={() => onToggleEncoding(enc)}
                  />
                  <span>{ENCODING_LABELS[enc]}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Injection Context */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-muted-foreground">
              Injection Context (optional)
            </Label>
            <div className="text-[10px] text-muted-foreground">
              Use PAYLOAD or § as placeholder for the encoded payload.
            </div>
            <Input
              className="h-8 font-mono text-xs bg-muted/5 focus-visible:ring-1"
              placeholder='<input value="PAYLOAD">'
              value={injectionContext}
              onChange={(e) => onInjectionContextChange(e.target.value)}
            />
          </div>

          {/* Output */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-muted-foreground">
                Encoded Output
              </Label>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onCopy(encodedOutput)}
                disabled={!encodedOutput}
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
              >
                <CopyIcon className="h-3 w-3" />
              </Button>
            </div>
            <Textarea
              className="min-h-[70px] font-mono text-xs p-2.5 bg-muted/5 focus-visible:ring-1"
              placeholder="Encoded output will appear here..."
              value={encodedOutput}
              readOnly
            />
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
