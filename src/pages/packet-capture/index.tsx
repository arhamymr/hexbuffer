'use client';

import { Activity, Database, ShieldAlert } from 'lucide-react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { formatBytes } from '@/pages/live-traffic/components/log-table/utils';
import { CaptureToolbar } from './components/capture-toolbar';
import { HexView } from './components/hex-view';
import { HttpParserPanel } from './components/http-parser-panel';
import { PacketDetail } from './components/packet-detail';
import { PacketFilters } from './components/packet-filters';
import { PacketList } from './components/packet-list';
import { StreamPanel } from './components/stream-panel';
import { NetworkSetup } from './components/network-setup';
import { usePacketCapturePage } from './hooks/use-packet-capture-page';

export function PacketCapturePage() {
  const page = usePacketCapturePage();

  if (!page.networkConfigured) {
    return (
      <NetworkSetup
        config={page.networkConfig}
        interfaces={page.captureInterfaces}
        isLoadingInterfaces={page.isLoadingInterfaces}
        onConfigChange={page.updateNetworkConfig}
        onContinue={page.saveNetworkConfig}
        onFixPermissions={page.fixCapturePermissions}
      />
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <CaptureToolbar
        captureStatus={page.captureStatus}
        interfaces={page.captureInterfaces}
        selectedInterface={page.selectedInterface}
        onInterfaceChange={page.setSelectedInterface}
        onStart={page.startCapture}
        onPause={page.pauseCapture}
        onStop={page.stopCapture}
        onClear={page.clearCapture}
        onLoadSample={page.loadSampleSession}
        onSaveSession={page.saveSession}
        onImportSession={page.importSession}
        onExportPcap={page.exportPcap}
        onEditNetwork={page.editNetworkConfig}
      />

      <div className="grid shrink-0 grid-cols-2 gap-2 border-b bg-muted/20 px-3 py-2 md:grid-cols-4">
        <Metric icon={Activity} label="Packets" value={String(page.packets.length)} />
        <Metric icon={Database} label="Streams" value={String(page.tcpStreams.length)} />
        <Metric icon={ShieldAlert} label="TLS Mode" value="Metadata" />
        <Metric icon={Database} label="Captured" value={formatBytes(page.packets.reduce((total, packet) => total + packet.length, 0))} />
      </div>

      <PacketFilters filters={page.filters} onFilterChange={page.updateFilter} onReset={page.resetFilters} />

      {page.permissionError && (
        <div className="mx-3 mt-3 flex shrink-0 items-center gap-3 rounded-md border border-yellow-500/40 bg-yellow-500/10 px-3 py-2">
          <AlertCircle className="size-4 text-yellow-600" />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium">Packet capture permission required</div>
            <div className="truncate text-xs text-muted-foreground">{page.permissionError}</div>
          </div>
          <Button size="xs" variant="outline" onClick={page.fixCapturePermissions}>
            Fix Permissions
          </Button>
        </div>
      )}

      <div className="min-h-0 flex-1 p-3">
        <Card className="h-full overflow-hidden !py-0">
          <ResizablePanelGroup orientation="vertical" className="h-full">
            <ResizablePanel defaultSize={42} minSize={22}>
              <PacketList
                packets={page.visiblePackets}
                selectedPacketId={page.selectedPacket?.id ?? page.selectedPacketId}
                sort={page.sort}
                onSelectPacket={page.setSelectedPacketId}
                onSort={page.setSortKey}
              />
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={58} minSize={32}>
              <ResizablePanelGroup orientation="horizontal">
                <ResizablePanel defaultSize={28} minSize={20}>
                  <PacketDetail packet={page.selectedPacket} selectedField={page.selectedField} onSelectField={page.setSelectedField} />
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={32} minSize={22}>
                  <HexView
                    packet={page.selectedPacket}
                    selectedRange={page.selectedRange}
                    onCopyHex={page.copyHex}
                    onCopyAscii={page.copyAscii}
                    onExportRawBody={page.exportRawBody}
                  />
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={40} minSize={24}>
                  <ResizablePanelGroup orientation="vertical">
                    <ResizablePanel defaultSize={48} minSize={28}>
                      <HttpParserPanel message={page.selectedPacket?.http} />
                    </ResizablePanel>
                    <ResizableHandle withHandle />
                    <ResizablePanel defaultSize={52} minSize={28}>
                      <StreamPanel stream={page.selectedStream} />
                    </ResizablePanel>
                  </ResizablePanelGroup>
                </ResizablePanel>
              </ResizablePanelGroup>
            </ResizablePanel>
          </ResizablePanelGroup>
        </Card>
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Activity; label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-md border bg-background px-3 py-2">
      <Icon className="size-4 text-muted-foreground" />
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="truncate text-sm font-medium">{value}</div>
      </div>
      {label === 'TLS Mode' && <Badge variant="outline" className="ml-auto rounded-sm">SNI</Badge>}
    </div>
  );
}
