import { DatabaseIcon, Table } from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { SqliExtractedDatabase } from '../types';

interface ExtractionTabProps {
  databases: SqliExtractedDatabase[];
  isRunning: boolean;
  selectedDb: string | null;
  selectedTable: string | null;
  selectedDbData: SqliExtractedDatabase | null;
  tableData: { name: string; columns: { name: string; data_type: string }[]; rows: string[][] } | null;
  onSelectDb: (name: string) => void;
  onSelectTable: (name: string | null) => void;
}

export function ExtractionTab({
  databases,
  isRunning,
  selectedDb,
  selectedTable,
  selectedDbData,
  tableData,
  onSelectDb,
  onSelectTable,
}: ExtractionTabProps) {
  if (databases.length === 0 && !isRunning) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
        <DatabaseIcon className="h-8 w-8 text-muted-foreground/55" />
        <p className="text-xs">No data extracted yet. Vulnerabilities enable extraction.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex">
      {/* DatabaseIcon Column */}
      <div className="w-48 border-r flex flex-col">
        <div className="p-2 border-b bg-muted/10 shrink-0">
          <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
            Databases
          </span>
        </div>
        <ScrollArea className="flex-1">
          <div className="divide-y">
            {databases.map(db => (
              <button
                key={db.name}
                className={`w-full text-left px-3 py-1.5 text-xs hover:bg-muted/40 flex items-center transition-colors ${selectedDb === db.name ? 'bg-muted/70 font-semibold' : ''}`}
                onClick={() => {
                  onSelectDb(db.name);
                  onSelectTable(null);
                }}
              >
                <DatabaseIcon className="h-3 w-3 mr-1.5 text-muted-foreground shrink-0" />
                <span className="truncate">{db.name}</span>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Tables Column */}
      <div className="w-48 border-r flex flex-col">
        <div className="p-2 border-b bg-muted/10 shrink-0">
          <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
            Tables
          </span>
        </div>
        <ScrollArea className="flex-1">
          <div className="divide-y">
            {selectedDbData?.tables.map(table => (
              <button
                key={table.name}
                className={`w-full text-left px-3 py-1.5 text-xs hover:bg-muted/40 flex items-center transition-colors ${selectedTable === table.name ? 'bg-muted/70 font-semibold' : ''}`}
                onClick={() => onSelectTable(table.name)}
              >
                <Table className="h-3 w-3 mr-1.5 text-muted-foreground shrink-0" />
                <span className="truncate flex-1">{table.name}</span>
                <Badge
                  variant="secondary"
                  className="ml-1 text-[9px] px-1 py-0 h-4 font-normal shrink-0"
                >
                  {table.rows.length}
                </Badge>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Data Rows Column */}
      <div className="flex-1 flex flex-col min-h-0 bg-background">
        <div className="p-2 border-b bg-muted/10 flex items-center justify-between shrink-0 h-8">
          <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider truncate">
            Data: {selectedTable || 'Select a table'}
          </span>
          {tableData && (
            <Badge variant="secondary" className="text-[9px] h-4 px-1.5 font-normal">
              {tableData.rows.length} rows
            </Badge>
          )}
        </div>
        <ScrollArea className="flex-1">
          {tableData ? (
            tableData.rows.length > 0 ? (
              <Table className="text-xs">
                <TableHeader className="sticky top-0 z-10 bg-background">
                  <TableRow className="hover:bg-transparent">
                    {tableData.columns.map((col, i) => (
                      <TableHead key={i} className="h-8 py-0 font-semibold">
                        {col.name}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tableData.rows.slice(0, 100).map((row, rowIdx) => (
                    <TableRow key={rowIdx} className="hover:bg-muted/30">
                      {row.map((cell, cellIdx) => (
                        <TableCell key={cellIdx} className="font-mono py-1 text-[11px]">
                          {cell}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-muted-foreground p-6">
                No data in table
              </div>
            )
          ) : (
            <div className="flex items-center justify-center h-full text-xs text-muted-foreground p-6">
              Select a table to view data
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
