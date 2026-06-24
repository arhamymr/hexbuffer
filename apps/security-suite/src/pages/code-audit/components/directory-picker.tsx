import { FolderOpen, Play, Loader2, FileText, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DirectoryPickerProps {
  directoryPath: string;
  scanStatus: string;
  hasFindings: boolean;
  onSelectDirectory: () => void;
  onStartAudit: () => void;
  onStopAudit: () => void;
  onGenerateReport: () => void;
}

export function DirectoryPicker({
  directoryPath,
  scanStatus,
  hasFindings,
  onSelectDirectory,
  onStartAudit,
  onStopAudit,
  onGenerateReport,
}: DirectoryPickerProps) {
  const isRunning = scanStatus === 'scanning' || scanStatus === 'analyzing';
  const pathDisplay = directoryPath || 'No directory selected';

  return (
    <div className="flex items-center gap-3 p-4 border-b bg-muted/30">
      <Button
        variant="outline"
        size="sm"
        onClick={onSelectDirectory}
        disabled={isRunning}
      >
        <FolderOpen className="mr-2 h-4 w-4" />
        Select Directory
      </Button>

      <span className="flex-1 text-sm text-muted-foreground truncate font-mono">
        {pathDisplay}
      </span>

      <Button
        size="sm"
        onClick={onStartAudit}
        disabled={!directoryPath || isRunning}
      >
        {isRunning ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Play className="mr-2 h-4 w-4" />
        )}
        {isRunning ? 'Auditing…' : 'Start Audit'}
      </Button>

      {isRunning && (
        <Button
          variant="destructive"
          size="sm"
          onClick={onStopAudit}
        >
          <Square className="mr-2 h-4 w-4" />
          Stop
        </Button>
      )}

      {scanStatus === 'complete' && hasFindings && (
        <Button
          variant="outline"
          size="sm"
          onClick={onGenerateReport}
        >
          <FileText className="mr-2 h-4 w-4" />
          Generate Report
        </Button>
      )}
    </div>
  );
}
