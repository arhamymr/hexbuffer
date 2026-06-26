import { Badge } from '@/components/ui/badge';
import { usePortScannerPage } from './hooks/use-port-scanner-page';
import { ScannerToolbar } from './components/scanner-toolbar';
import { ResultsTable } from './components/results-table';

export function PortScannerPage() {
  const page = usePortScannerPage();

  const resultsCount = page.results.length + (page.error ? 1 : 0);

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <ScannerToolbar
        target={page.target}
        onTargetChange={page.setTarget}
        preset={page.preset}
        onPresetChange={page.handlePresetChange}
        ports={page.ports}
        onPortsChange={page.setPorts}
        timeoutMs={page.timeoutMs}
        onTimeoutChange={page.setTimeoutMs}
        concurrency={page.concurrency}
        onConcurrencyChange={page.setConcurrency}
        bannerGrab={page.bannerGrab}
        onBannerGrabChange={page.setBannerGrab}
        selectedPortLabel={page.selectedPortLabel}
        isRunning={page.isRunning}
        hasResults={page.hasResults}
        canScan={page.canScan}
        resultsCount={resultsCount}
        onStart={page.startScan}
        onStop={page.stopScan}
        onClear={page.clearResults}
        onCopyPorts={page.copyOpenPorts}
        onExportJson={page.handleExportJson}
        onExportCsv={page.handleExportCsv}
      />

      <main className="min-h-0 flex-1 flex flex-col bg-background">
        <div className="flex h-8 shrink-0 items-center justify-between border-b bg-muted/10 px-3">
          <div className="flex items-baseline gap-2">
            <span className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">
              Open Ports
            </span>
            <span className="text-[10px] text-muted-foreground hidden sm:inline">
              Host, service, latency & captured banners
            </span>
          </div>
          <div className="flex items-center gap-2">
            {page.error && (
              <span className="max-w-[320px] truncate text-[10px] text-destructive font-mono">
                {page.error}
              </span>
            )}
            {page.isRunning && (
              <Badge variant="secondary" className="animate-pulse text-[9px] h-4 py-0 px-1.5 font-mono">
                {page.progress.current} / {page.progress.total}
              </Badge>
            )}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          <ResultsTable openResults={page.openResults} hasResults={page.hasResults} />
        </div>
      </main>
    </div>
  );
}
