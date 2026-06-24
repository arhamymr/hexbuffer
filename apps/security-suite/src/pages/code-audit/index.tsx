import { ShieldAlert } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { DirectoryPicker } from './components/directory-picker';
import { ScanProgress } from './components/scan-progress';
import { FindingsList } from './components/findings-list';
import { FindingDetail } from './components/finding-detail';
import { useCodeAuditPage } from './hooks/use-code-audit-page';

export function CodeAuditPage() {
  const page = useCodeAuditPage();

  return (
    <div className="flex flex-col h-full">
      {/* Beta warning */}
      <div className="p-2">
        <Alert variant="default" className="min-h-12 mb-0 shrink-0 border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-500/50 dark:bg-amber-500/10 dark:text-amber-200">
          <ShieldAlert className="!text-amber-600 shrink-0" />
          <AlertDescription className="text-amber-600">
            Code Audit scans your local filesystem for secrets and dependency vulnerabilities. Findings are sent to an AI provider for analysis if configured. Review results before sharing.
          </AlertDescription>
        </Alert>
      </div>

      {/* Toolbar */}
      <DirectoryPicker
        directoryPath={page.directoryPath}
        scanStatus={page.scanStatus}
        hasFindings={page.findings.length > 0}
        onSelectDirectory={page.handleSelectDirectory}
        onStartAudit={page.handleStartAudit}
        onStopAudit={page.handleStopAudit}
        onGenerateReport={page.handleGenerateReport}
      />

      {/* Progress */}
      <ScanProgress
        scanStatus={page.scanStatus}
        filesScanned={page.filesScanned}
        totalFindings={page.totalFindings}
        aiAnalyzed={page.aiAnalyzed}
        durationMs={page.durationMs}
        scanPhase={page.scanPhase}
        scanLog={page.scanLog}
        totalFiles={page.totalFiles}
      />

      {/* Error */}
      {page.scanError && (
        <div className="px-4 py-2 mx-4 mb-2 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md text-sm text-red-700 dark:text-red-300">
          {page.scanError}
        </div>
      )}

      {/* Results panel */}
      <ResizablePanelGroup orientation="horizontal" className="flex-1 min-h-0 border-t">
        <ResizablePanel defaultSize={35} minSize={25}>
          <FindingsList
            findings={page.findings}
            selectedFindingId={page.selectedFindingId}
            onSelectFinding={page.selectFinding}
          />
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={65} minSize={35}>
          <FindingDetail
            finding={page.selectedFinding?.finding ?? null}
            explanation={page.selectedFinding?.explanation ?? null}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
