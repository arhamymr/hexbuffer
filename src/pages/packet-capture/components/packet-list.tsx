import { ArrowDown, ArrowUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { formatBytes } from '@/pages/live-traffic/components/log-table/utils';
import type { Packet, PacketSort, PacketSortKey } from '../types';

interface PacketListProps {
  packets: Packet[];
  selectedPacketId: string;
  sort: PacketSort;
  onSelectPacket: (id: string) => void;
  onSort: (key: PacketSortKey) => void;
}

const columns: Array<{ key: PacketSortKey; label: string; className?: string }> = [
  { key: 'number', label: 'No', className: 'w-16' },
  { key: 'timestamp', label: 'Time', className: 'w-24' },
  { key: 'sourceIp', label: 'Source' },
  { key: 'destinationIp', label: 'Destination' },
  { key: 'protocol', label: 'Protocol', className: 'w-24' },
  { key: 'length', label: 'Length', className: 'w-20 text-right' },
  { key: 'info', label: 'Info' },
];

const protocolClassName: Record<Packet['protocol'], string> = {
  HTTP: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  TLS: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
  TCP: 'bg-zinc-500/15 text-zinc-700 dark:text-zinc-300',
  UDP: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300',
  DNS: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  ARP: 'bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300',
  ICMP: 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
  '802.11': 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300',
  OTHER: 'bg-muted text-muted-foreground',
};

export function PacketList({ packets, selectedPacketId, sort, onSelectPacket, onSort }: PacketListProps) {
  return (
    <div className="h-full overflow-auto">
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-background">
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column.key} className={cn('h-8', column.className)}>
                <button
                  type="button"
                  className="flex w-full items-center gap-1 text-left text-xs font-semibold uppercase text-muted-foreground"
                  onClick={() => onSort(column.key)}
                >
                  {column.label}
                  {sort.key === column.key && (
                    sort.direction === 'asc' ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />
                  )}
                </button>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {packets.map((packet) => (
            <TableRow
              key={packet.id}
              data-state={packet.id === selectedPacketId ? 'selected' : undefined}
              className={cn('cursor-pointer', protocolRowClassName(packet.protocol))}
              onClick={() => onSelectPacket(packet.id)}
            >
              <TableCell className="font-mono text-xs">{packet.number}</TableCell>
              <TableCell className="font-mono text-xs">{packet.timestamp.toFixed(4)}</TableCell>
              <TableCell className="font-mono text-xs">{packet.sourceIp}{packet.sourcePort ? `:${packet.sourcePort}` : ''}</TableCell>
              <TableCell className="font-mono text-xs">{packet.destinationIp}{packet.destinationPort ? `:${packet.destinationPort}` : ''}</TableCell>
              <TableCell>
                <Badge variant="outline" className={cn('rounded-sm border-transparent', protocolClassName[packet.protocol])}>
                  {packet.protocol}
                </Badge>
              </TableCell>
              <TableCell className="text-right font-mono text-xs">{formatBytes(packet.length)}</TableCell>
              <TableCell className="min-w-[260px] max-w-[520px] truncate text-xs">{packet.info}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {packets.length === 0 && (
        <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
          No packets match the active filters.
        </div>
      )}
    </div>
  );
}

function protocolRowClassName(protocol: Packet['protocol']) {
  if (protocol === 'HTTP') {
    return 'bg-emerald-500/[0.04]';
  }

  if (protocol === 'TLS') {
    return 'bg-sky-500/[0.04]';
  }

  if (protocol === 'DNS') {
    return 'bg-amber-500/[0.04]';
  }

  if (protocol === '802.11') {
    return 'bg-indigo-500/[0.04]';
  }

  return '';
}
