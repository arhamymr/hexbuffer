import { Download, FileInput, HardDrive, Pause, Play, RotateCcw, Settings, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { CaptureInterfaceOption, CaptureStatus } from '../types';

interface CaptureToolbarProps {
  captureStatus: CaptureStatus;
  interfaces: CaptureInterfaceOption[];
  selectedInterface: string;
  onInterfaceChange: (value: string) => void;
  onStart: () => void;
  onPause: () => void;
  onStop: () => void;
  onClear: () => void;
  onLoadSample: () => void;
  onSaveSession: () => void;
  onImportSession: () => void;
  onExportPcap: () => void;
  onEditNetwork: () => void;
}

export function CaptureToolbar({
  captureStatus,
  interfaces,
  selectedInterface,
  onInterfaceChange,
  onStart,
  onPause,
  onStop,
  onClear,
  onLoadSample,
  onSaveSession,
  onImportSession,
  onExportPcap,
  onEditNetwork,
}: CaptureToolbarProps) {
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2 border-b bg-muted/30 px-3 py-2">
      <Select value={selectedInterface} onValueChange={onInterfaceChange}>
        <SelectTrigger size="sm" className="w-[180px] bg-background">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {interfaces.map((item) => (
            <SelectItem key={item.id} value={item.id}>
              {item.label} ({item.address ?? item.id})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex items-center gap-1">
        <Button size="xs" onClick={onStart} disabled={captureStatus === 'capturing'} title="Start capture">
          <Play className="size-4" />
          Start
        </Button>
        <Button size="xs" variant="outline" onClick={onPause} disabled={captureStatus !== 'capturing'} title="Pause capture">
          <Pause className="size-4" />
          Pause
        </Button>
        <Button size="xs" variant="outline" onClick={onStop} disabled={captureStatus === 'idle'} title="Stop capture">
          <Square className="size-4" />
          Stop
        </Button>
      </div>

      <div className="ml-auto flex items-center gap-1">
        <Button size="xs" variant="outline" onClick={onEditNetwork} title="Configure network">
          <Settings className="size-4" />
          Network
        </Button>
        <Button size="xs" variant="outline" onClick={onLoadSample} title="Load sample session">
          <RotateCcw className="size-4" />
          Sample
        </Button>
        <Button size="xs" variant="outline" onClick={onSaveSession} title="Save capture session">
          <HardDrive className="size-4" />
          Save
        </Button>
        <Button size="xs" variant="outline" onClick={onImportSession} title="Import .pcap or .pcapng">
          <FileInput className="size-4" />
          Import
        </Button>
        <Button size="xs" variant="outline" onClick={onExportPcap} title="Export .pcapng">
          <Download className="size-4" />
          Export
        </Button>
        <Button size="xs" variant="ghost" onClick={onClear} title="Clear capture">
          Clear
        </Button>
      </div>
    </div>
  );
}
