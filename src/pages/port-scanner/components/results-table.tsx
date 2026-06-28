import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { BroadcastIcon } from '@phosphor-icons/react';
import type { PortScanResult } from '../types';

interface ResultsTableProps {
  openResults: PortScanResult[];
  hasResults: boolean;
}

export function ResultsTable({ openResults, hasResults }: ResultsTableProps) {
  if (!hasResults) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
        <BroadcastIcon className="h-8 w-8 text-muted-foreground/60 animate-pulse" />
        <p className="text-xs">No open ports found</p>
      </div>
    );
  }

  return (
    <Table className="text-xs">
      <TableHeader className="sticky top-0 z-10 bg-background">
        <TableRow className="hover:bg-transparent">
          <TableHead className="h-8 py-0">Host</TableHead>
          <TableHead className="h-8 py-0">Port</TableHead>
          <TableHead className="h-8 py-0">State</TableHead>
          <TableHead className="h-8 py-0">Service</TableHead>
          <TableHead className="h-8 py-0">Time</TableHead>
          <TableHead className="h-8 py-0">Banner</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {openResults.map((result) => (
          <TableRow key={`${result.host}:${result.port}`} className="hover:bg-muted/30">
            <TableCell className="font-mono py-1">{result.host}</TableCell>
            <TableCell className="font-mono py-1">{result.port}</TableCell>
            <TableCell className="py-1">
              <Badge
                variant="outline"
                className="text-[9px] py-px h-4 font-normal border-emerald-500/20 text-emerald-600 bg-emerald-500/5"
              >
                {result.state}
              </Badge>
            </TableCell>
            <TableCell className="py-1">{result.service}</TableCell>
            <TableCell className="text-muted-foreground py-1">
              {result.response_time_ms ? `${result.response_time_ms}ms` : '-'}
            </TableCell>
            <TableCell
              className="max-w-[460px] truncate font-mono text-[11px] py-1"
              title={result.banner ?? ''}
            >
              {result.banner || '-'}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
