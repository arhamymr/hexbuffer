import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';

interface ScanProgressProps {
  scanStatus: string;
  filesScanned: number;
  totalFindings: number;
  aiAnalyzed: number;
  durationMs: number;
  scanPhase: string;
  scanLog: string[];
  totalFiles: number;
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'bg-red-600',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-blue-500',
  info: 'bg-gray-400',
};

export function ScanProgress({
  scanStatus,
  filesScanned,
  totalFindings,
  aiAnalyzed,
  durationMs,
  scanPhase,
  scanLog,
  totalFiles,
}: ScanProgressProps) {
  if (scanStatus === 'idle') {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        Select a directory and click Start Audit to begin scanning for security issues.
      </div>
    );
  }

  if (scanStatus === 'scanning') {
    return (
      <div className="flex flex-col">
        <div className="p-3 text-center text-sm text-muted-foreground border-b">
          Scanning files for secrets and vulnerabilities…
          {filesScanned > 0 && totalFiles > 0 && (
            <span className="ml-2">{filesScanned} / {totalFiles} files</span>
          )}
          {filesScanned > 0 && totalFiles === 0 && (
            <span className="ml-2">{filesScanned} files scanned</span>
          )}
        </div>
        {totalFiles > 0 && (
          <Progress value={Math.round((filesScanned / Math.max(totalFiles, 1)) * 100)} className="mx-4 mt-2 h-1.5" />
        )}
        {scanLog.length > 0 && (
          <ScrollArea className="h-44 px-3 py-2">
            <div className="text-xs font-mono text-muted-foreground space-y-0.5">
              {scanLog.map((line, i) => (
                <div key={i} className={line.startsWith('→') ? 'text-blue-500 dark:text-blue-400 font-medium pt-1' : ''}>
                  {line}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    );
  }

  if (scanStatus === 'analyzing') {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        AI analyzing {totalFindings} finding{totalFindings !== 1 ? 's' : ''}…
        {aiAnalyzed > 0 && (
          <span className="ml-2">
            {aiAnalyzed}/{totalFindings} complete
          </span>
        )}
      </div>
    );
  }

  if (scanStatus === 'complete') {
    const seconds = (durationMs / 1000).toFixed(1);
    return (
      <div className="p-4 text-center text-sm">
        <span className="text-green-600 dark:text-green-400 font-medium">
          Audit complete
        </span>
        <span className="text-muted-foreground ml-2">
          — {totalFindings} finding{totalFindings !== 1 ? 's' : ''} in {filesScanned} file{filesScanned !== 1 ? 's' : ''} ({seconds}s)
        </span>
        {aiAnalyzed > 0 && (
          <span className="text-muted-foreground ml-1">
            • {aiAnalyzed} AI-analyzed
          </span>
        )}
      </div>
    );
  }

  return null;
}
