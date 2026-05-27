import { Badge } from '@/components/ui/badge';
import type { TcpStream } from '../types';

interface StreamPanelProps {
  stream: TcpStream | null;
}

export function StreamPanel({ stream }: StreamPanelProps) {
  if (!stream) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-center text-sm text-muted-foreground">
        TCP stream reassembly appears for TCP, TLS, and HTTP packets.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-b px-3 py-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="rounded-sm">{stream.protocol}</Badge>
          <span className="min-w-0 truncate font-mono text-xs">{stream.label}</span>
          {stream.isIncomplete && <Badge variant="yellow" className="rounded-sm">Incomplete</Badge>}
        </div>
        <div className="mt-1 text-xs text-muted-foreground">{stream.packets.length} packets, {stream.totalBytes} bytes</div>
      </div>
      <div className="grid min-h-0 flex-1 grid-rows-[auto_1fr] overflow-hidden">
        <div className="overflow-x-auto border-b p-3">
          <div className="flex min-w-max items-center gap-2">
            {stream.packets.map((packet) => (
              <div key={packet.id} className="rounded-md border bg-muted/30 px-2 py-1 font-mono text-xs">
                #{packet.number} {packet.sourcePort} {'->'} {packet.destinationPort}
              </div>
            ))}
          </div>
        </div>
        <pre className="overflow-auto p-3 font-mono text-xs">{stream.reconstructedText}</pre>
      </div>
    </div>
  );
}
