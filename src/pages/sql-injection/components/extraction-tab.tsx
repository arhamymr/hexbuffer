import { DatabaseIcon, TableIcon } from '@phosphor-icons/react';
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
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
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
  // ponytail: Keep empty state minimal and reuse standard icon imports.
  if (databases.length === 0 && !isRunning) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-2 text-muted-foreground select-none">
        <DatabaseIcon className="h-10 w-10 text-muted-foreground/35 animate-pulse" />
        <span className="text-xs font-semibold">No databases extracted</span>
        <span className="text-[10px] text-muted-foreground/60 text-center max-w-[240px]">
          Successful SQL injection exploits will enable full schema mapping and database dump features.
        </span>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 h-full flex bg-background">
      <ResizablePanelGroup orientation="horizontal" className="h-full w-full">
        {/* Databases Column Panel */}
        <ResizablePanel defaultSize={20} minSize={15} className="flex flex-col h-full">
          <div className="p-2 border-b bg-muted/10 shrink-0 flex items-center justify-between h-9 select-none">
            <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
              Databases
            </span>
            <Badge variant="secondary" className="text-[9px] font-mono h-4 px-1 py-0">
              {databases.length}
            </Badge>
          </div>
          <ScrollArea className="flex-1">
            <div className="divide-y border-b">
              {databases.map(db => {
                const isSelected = selectedDb === db.name;
                return (
                  <button
                    key={db.name}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-muted/40 flex items-center transition-colors ${
                      isSelected ? 'bg-muted/70 font-semibold text-foreground' : 'text-muted-foreground'
                    }`}
                    onClick={() => {
                      onSelectDb(db.name);
                      onSelectTable(null);
                    }}
                  >
                    <DatabaseIcon className={`h-3.5 w-3.5 mr-2 shrink-0 ${isSelected ? 'text-primary' : 'text-muted-foreground/60'}`} />
                    <span className="truncate flex-1">{db.name}</span>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Tables Column Panel */}
        <ResizablePanel defaultSize={20} minSize={15} className="flex flex-col h-full border-r-0">
          <div className="p-2 border-b bg-muted/10 shrink-0 flex items-center justify-between h-9 select-none">
            <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
              Tables
            </span>
            {selectedDbData && (
              <Badge variant="secondary" className="text-[9px] font-mono h-4 px-1 py-0">
                {selectedDbData.tables.length}
              </Badge>
            )}
          </div>
          <ScrollArea className="flex-1">
            <div className="divide-y border-b">
              {selectedDbData ? (
                selectedDbData.tables.map(table => {
                  const isSelected = selectedTable === table.name;
                  return (
                    <button
                      key={table.name}
                      className={`w-full text-left px-3 py-2 text-xs hover:bg-muted/40 flex items-center transition-colors ${
                        isSelected ? 'bg-muted/70 font-semibold text-foreground' : 'text-muted-foreground'
                      }`}
                      onClick={() => onSelectTable(table.name)}
                    >
                      <TableIcon className={`h-3.5 w-3.5 mr-2 shrink-0 ${isSelected ? 'text-primary' : 'text-muted-foreground/60'}`} />
                      <span className="truncate flex-1">{table.name}</span>
                      <Badge
                        variant="outline"
                        className="ml-1 text-[9px] font-mono px-1 py-0 h-4 font-normal bg-background/50 text-muted-foreground shrink-0"
                      >
                        {table.rows.length}
                      </Badge>
                    </button>
                  );
                })
              ) : (
                <div className="p-3 text-[11px] text-muted-foreground/60 text-center select-none">
                  Select database
                </div>
              )}
            </div>
          </ScrollArea>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Data Rows Column Panel */}
        <ResizablePanel defaultSize={60} minSize={30} className="flex flex-col h-full">
          <div className="p-2 border-b bg-muted/10 flex items-center justify-between shrink-0 h-9 select-none">
            <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider truncate">
              Data: {selectedTable || 'Select Table'}
            </span>
            {tableData && (
              <Badge variant="outline" className="text-[9px] font-mono h-4 px-1.5 font-semibold bg-primary/5 text-primary border-primary/20">
                {tableData.rows.length} rows loaded
              </Badge>
            )}
          </div>
          <ScrollArea className="flex-1 min-h-0 bg-card/20">
            {tableData ? (
              tableData.rows.length > 0 ? (
                <Table className="text-xs border-b">
                  <TableHeader className="sticky top-0 z-10 bg-muted/95 backdrop-blur-sm shadow-sm select-none border-b">
                    <TableRow className="hover:bg-transparent">
                      {tableData.columns.map((col, i) => (
                        <TableHead key={i} className="h-8 py-0 font-bold text-muted-foreground text-[10px] uppercase tracking-wider">
                          {col.name} <span className="text-[9px] font-normal text-muted-foreground/50 lowercase font-mono">({col.data_type})</span>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tableData.rows.slice(0, 100).map((row, rowIdx) => (
                      <TableRow key={rowIdx} className="hover:bg-muted/30 border-b">
                        {row.map((cell, cellIdx) => (
                          <TableCell key={cellIdx} className="font-mono py-1.5 text-[11px] text-foreground">
                            {cell === null || cell === undefined || cell === '' ? (
                              <span className="text-muted-foreground/40 italic select-none">NULL</span>
                            ) : (
                              cell
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center h-full min-h-[180px] text-xs text-muted-foreground/60 p-6 select-none">
                  No data records in this table.
                </div>
              )
            ) : (
              <div className="flex flex-col items-center justify-center h-full min-h-[180px] text-xs text-muted-foreground/60 p-6 select-none">
                Select a table from the sidebar to display records.
              </div>
            )}
          </ScrollArea>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
