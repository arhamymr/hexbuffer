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
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-9 shrink-0 items-center border-b px-3">
        <span className="text-xs font-medium text-muted-foreground">Builder</span>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-5 p-4">
          {/* Payload input */}
          <div className="space-y-1.5">
            <Label>Payload</Label>
            <Textarea
              className="font-mono text-xs"
              placeholder="Select a payload from the library or type your own..."
              value={basePayload}
              onChange={(e) => onBasePayloadChange(e.target.value)}
            />
          </div>

          {/* Encoding Pipeline */}
          <div className="space-y-2">
            <div>
              <Label>Encoding Pipeline</Label>
              <p className="text-xs text-muted-foreground">
                Applied in order: URL → HTML Entity → Base64 → Double URL → Unicode
              </p>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {ENCODING_ORDER.map((enc) => (
                <label
                  key={enc}
                  className="flex items-center gap-1.5 cursor-pointer text-sm select-none"
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
          <div className="space-y-1.5">
            <Label>Injection Context</Label>
            <p className="text-xs text-muted-foreground">
              Use <code className="font-mono">PAYLOAD</code> or <code className="font-mono">$</code> as a placeholder.
            </p>
            <Input
              className="font-mono text-xs"
              placeholder='<input value="PAYLOAD">'
              value={injectionContext}
              onChange={(e) => onInjectionContextChange(e.target.value)}
            />
          </div>

          {/* Encoded Output */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Encoded Output</Label>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onCopy(encodedOutput)}
                disabled={!encodedOutput}
              >
                <CopyIcon />
              </Button>
            </div>
            <Textarea
              className="font-mono text-xs"
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
