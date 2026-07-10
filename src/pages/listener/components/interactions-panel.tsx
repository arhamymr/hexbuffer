import { useRef, useState, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { CaretDownIcon, CaretRightIcon } from '@phosphor-icons/react';
import { InteractionDetailPane } from './interaction-detail-pane';
import { ListenerMetrics } from './metrics';
import { cn } from '@/lib/utils';
import type { ListenerInteraction, ListenerPayload, ListenerDashboardStats, ListenerServer } from '../types';

const TYPE_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  dns: 'secondary',
  http: 'default',
  https: 'outline',
};

interface Props {
  servers: ListenerServer[];
  interactions: ListenerInteraction[];
  payloads: ListenerPayload[];
  selectedTypeFilter: string | null;
  setSelectedTypeFilter: (type: string | null) => void;
  selectedInteractionId: string | null;
  setSelectedInteractionId: (id: string | null) => void;
  selectedInteraction: ListenerInteraction | null;
  stats: ListenerDashboardStats;
  isEnabled: boolean;
}

export function ListenerInteractions({
  servers,
  interactions,
  payloads,
  selectedTypeFilter,
  setSelectedTypeFilter,
  selectedInteractionId,
  setSelectedInteractionId,
  selectedInteraction,
  stats,
  isEnabled,
}: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);
  const [collapsedServers, setCollapsedServers] = useState<Record<string, boolean>>({});

  const handlePointerDown = useCallback(() => {
    isDraggingRef.current = true;
    setIsDragging(true);

    const onPointerUp = () => {
      isDraggingRef.current = false;
      setIsDragging(false);
      window.removeEventListener('pointerup', onPointerUp);
    };
    window.addEventListener('pointerup', onPointerUp, { once: true });
  }, []);

  const toggleServerCollapse = (serverId: string) => {
    setCollapsedServers((prev) => ({
      ...prev,
      [serverId]: !prev[serverId],
    }));
  };

  const coverStyle = isDragging
    ? { pointerEvents: 'none' as const, userSelect: 'none' as const }
    : undefined;

  // Group interactions by server
  const getInteractionsForServer = (serverId: string) => {
    const serverPayloadIds = payloads.filter((p) => p.serverId === serverId).map((p) => p.id);
    return interactions.filter((i) => serverPayloadIds.includes(i.payloadId));
  };

  const orphanedInteractions = interactions.filter((i) => {
    const payload = payloads.find((p) => p.id === i.payloadId);
    return !payload || !servers.some((s) => s.id === payload.serverId);
  });

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      {/* Metrics status bar */}
      <ListenerMetrics stats={stats} isEnabled={isEnabled} />

      {/* Toolbar / Filter bar */}
      <div className="flex h-10 shrink-0 items-center justify-between border-b bg-muted/40 px-3 py-2">
        <span className="text-xs font-mono font-medium text-muted-foreground">
          {interactions.length} interaction{interactions.length !== 1 ? 's' : ''}
        </span>
        <div className="flex items-center gap-2">
          <Select
            value={selectedTypeFilter ?? 'all'}
            onValueChange={(v) => setSelectedTypeFilter(v === 'all' ? null : v)}
          >
            <SelectTrigger className="h-7 w-32 text-xs">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="dns">DNS</SelectItem>
              <SelectItem value="http">HTTP</SelectItem>
              <SelectItem value="https">HTTPS</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main List and Detail Split view */}
      <div className="min-h-0 flex-1 relative">
        <ResizablePanelGroup
          orientation="vertical"
          id="listener-interactions-split"
          className="h-full min-w-0"
        >
          <ResizablePanel
            id="listener-interactions-list"
            defaultSize={selectedInteraction ? 60 : 100}
            minSize={20}
            className="min-w-0 flex flex-col"
          >
            <div className="min-h-0 flex-1 overflow-auto" style={coverStyle}>
              {servers.length === 0 && orphanedInteractions.length === 0 ? (
                <div className="flex h-full items-center justify-center p-4 text-xs text-muted-foreground">
                  No hosts configured. Configure a host to start receiving interactions.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {/* ponytail: visual hierarchy list HOST -> Interactions list */}
                  {servers.map((s) => {
                    const serverInteractions = getInteractionsForServer(s.id);
                    const isCollapsed = collapsedServers[s.id] ?? false;

                    return (
                      <div key={s.id} className="flex flex-col">
                        <div
                          className="flex items-center justify-between bg-muted/15 px-3 py-2 cursor-pointer hover:bg-muted/30 select-none transition-colors border-b"
                          onClick={() => toggleServerCollapse(s.id)}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {isCollapsed ? (
                              <CaretRightIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            ) : (
                              <CaretDownIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            )}
                            <span className="text-xs font-semibold text-foreground truncate">{s.name}</span>
                            <span className="text-[10px] font-mono text-muted-foreground truncate">({s.url})</span>
                          </div>
                          <Badge variant="secondary" className="text-[10px] font-mono shrink-0">
                            {serverInteractions.length}
                          </Badge>
                        </div>

                        {!isCollapsed && (
                          <div className="min-w-0 overflow-x-auto">
                            {serverInteractions.length === 0 ? (
                              <div className="text-[10px] text-muted-foreground italic p-3 text-center bg-card">
                                No interactions received on this host yet.
                              </div>
                            ) : (
                              <Table className="text-xs">
                                <TableHeader className="sticky top-0 bg-muted/65 z-10">
                                  <TableRow>
                                    <TableHead className="w-[80px] px-3">Type</TableHead>
                                    <TableHead className="w-[120px] px-3">Source IP</TableHead>
                                    <TableHead className="w-[80px] px-3">Method</TableHead>
                                    <TableHead className="px-3">Path</TableHead>
                                    <TableHead className="w-[140px] px-3">Payload</TableHead>
                                    <TableHead className="w-[160px] px-3">Time</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {serverInteractions.map((i) => {
                                    const payload = payloads.find((p) => p.id === i.payloadId);
                                    const isSelected = selectedInteractionId === i.id;
                                    return (
                                      <TableRow
                                        key={i.id}
                                        onClick={() => setSelectedInteractionId(i.id)}
                                        className={cn(
                                          'cursor-pointer transition-colors hover:bg-muted/40',
                                          isSelected && 'bg-muted font-medium'
                                        )}
                                      >
                                        <TableCell className="px-3 py-1.5">
                                          <Badge variant={TYPE_VARIANT[i.interactionType] ?? 'outline'} className="text-[10px] uppercase font-semibold">
                                            {i.interactionType}
                                          </Badge>
                                        </TableCell>
                                        <TableCell className="px-3 py-1.5 font-mono text-[10px]">
                                          {i.sourceIp}
                                        </TableCell>
                                        <TableCell className="px-3 py-1.5 font-mono text-[11px] uppercase">
                                          {i.method ?? '-'}
                                        </TableCell>
                                        <TableCell className="px-3 py-1.5 max-w-[200px] truncate font-mono text-[11px]">
                                          {i.path ?? '-'}
                                        </TableCell>
                                        <TableCell className="px-3 py-1.5 truncate">
                                          {payload?.name ?? i.payloadId.slice(0, 8)}
                                        </TableCell>
                                        <TableCell className="px-3 py-1.5 text-muted-foreground font-mono text-[10px]">
                                          {new Date(i.timestamp).toLocaleString()}
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })}
                                </TableBody>
                              </Table>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Orphaned Interactions */}
                  {orphanedInteractions.length > 0 && (
                    <div className="flex flex-col">
                      <div
                        className="flex items-center justify-between bg-destructive/5 px-3 py-2 cursor-pointer hover:bg-destructive/10 select-none transition-colors border-b"
                        onClick={() => toggleServerCollapse('orphaned')}
                      >
                        <div className="flex items-center gap-2">
                          {(collapsedServers['orphaned'] ?? false) ? (
                            <CaretRightIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          ) : (
                            <CaretDownIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          )}
                          <span className="text-xs font-semibold text-destructive">Orphaned Interactions</span>
                          <span className="text-[10px] text-muted-foreground">(Hosts no longer registered)</span>
                        </div>
                        <Badge variant="destructive" className="text-[10px] font-mono shrink-0">
                          {orphanedInteractions.length}
                        </Badge>
                      </div>

                      {!(collapsedServers['orphaned'] ?? false) && (
                        <div className="min-w-0 overflow-x-auto">
                          <Table className="text-xs">
                            <TableHeader className="sticky top-0 bg-muted/65 z-10">
                              <TableRow>
                                <TableHead className="w-[80px] px-3">Type</TableHead>
                                <TableHead className="w-[120px] px-3">Source IP</TableHead>
                                <TableHead className="w-[80px] px-3">Method</TableHead>
                                <TableHead className="px-3">Path</TableHead>
                                <TableHead className="w-[140px] px-3">Payload ID</TableHead>
                                <TableHead className="w-[160px] px-3">Time</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {orphanedInteractions.map((i) => {
                                const isSelected = selectedInteractionId === i.id;
                                return (
                                  <TableRow
                                    key={i.id}
                                    onClick={() => setSelectedInteractionId(i.id)}
                                    className={cn(
                                      'cursor-pointer transition-colors hover:bg-muted/40',
                                      isSelected && 'bg-muted font-medium'
                                    )}
                                  >
                                    <TableCell className="px-3 py-1.5">
                                      <Badge variant={TYPE_VARIANT[i.interactionType] ?? 'outline'} className="text-[10px] uppercase font-semibold">
                                        {i.interactionType}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="px-3 py-1.5 font-mono text-[10px]">
                                      {i.sourceIp}
                                    </TableCell>
                                    <TableCell className="px-3 py-1.5 font-mono text-[11px] uppercase">
                                      {i.method ?? '-'}
                                    </TableCell>
                                    <TableCell className="px-3 py-1.5 max-w-[200px] truncate font-mono text-[11px]">
                                      {i.path ?? '-'}
                                    </TableCell>
                                    <TableCell className="px-3 py-1.5 font-mono text-[10px] text-muted-foreground truncate">
                                      {i.payloadId}
                                    </TableCell>
                                    <TableCell className="px-3 py-1.5 text-muted-foreground font-mono text-[10px]">
                                      {new Date(i.timestamp).toLocaleString()}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </ResizablePanel>

          {selectedInteraction && (
            <>
              <ResizableHandle withHandle onPointerDown={handlePointerDown} />
              <ResizablePanel
                id="listener-interactions-detail"
                defaultSize={40}
                minSize={15}
                className="bg-background border-t"
              >
                <div className="h-full overflow-hidden" style={coverStyle}>
                  <InteractionDetailPane
                    interaction={selectedInteraction}
                    onClose={() => setSelectedInteractionId(null)}
                  />
                </div>
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
