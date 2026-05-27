import { Copy, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatHexRows } from '../lib/packet-utils';
import type { Packet } from '../types';

interface HexViewProps {
  packet: Packet | null;
  selectedRange?: { start: number; end: number };
  onCopyHex: () => void;
  onCopyAscii: () => void;
  onExportRawBody: () => void;
}

export function HexView({ packet, selectedRange, onCopyHex, onCopyAscii, onExportRawBody }: HexViewProps) {
  if (!packet) {
    return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No raw bytes selected.</div>;
  }

  const rows = formatHexRows(packet.bytes, selectedRange);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center gap-1 border-b px-3 py-2">
        <div className="mr-auto">
          <div className="text-xs font-semibold uppercase text-muted-foreground">Raw Data</div>
          <div className="font-mono text-xs">{packet.bytes.length} visible bytes</div>
        </div>
        <Button size="icon-sm" variant="outline" onClick={onCopyHex} title="Copy hex">
          <Copy className="size-4" />
        </Button>
        <Button size="icon-sm" variant="outline" onClick={onCopyAscii} title="Copy ASCII">
          <Copy className="size-4" />
        </Button>
        <Button size="icon-sm" variant="outline" onClick={onExportRawBody} title="Export raw body">
          <FileDown className="size-4" />
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-3 font-mono text-xs">
        <div className="grid grid-cols-[64px_minmax(390px,1fr)_180px] gap-3 text-muted-foreground">
          <span>Offset</span>
          <span>Hex Bytes</span>
          <span>ASCII</span>
        </div>
        <div className="mt-1 space-y-0.5">
          {rows.map((row) => (
            <div key={row.offset} className="grid grid-cols-[64px_minmax(390px,1fr)_180px] gap-3">
              <span className="text-muted-foreground">{row.offsetLabel}</span>
              <span className="flex flex-wrap gap-1">
                {row.cells.map((cell) => (
                  <span key={cell.index} className={cn('rounded px-1', cell.selected && 'bg-primary text-primary-foreground')}>
                    {cell.hex}
                  </span>
                ))}
              </span>
              <span className="tracking-[0.2em]">
                {row.cells.map((cell) => (
                  <span key={cell.index} className={cn('rounded px-0.5', cell.selected && 'bg-primary text-primary-foreground')}>
                    {cell.ascii}
                  </span>
                ))}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
