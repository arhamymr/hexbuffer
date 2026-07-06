import { useCallback } from 'react';
import { usePortScannerPage } from './hooks/use-port-scanner-page';
import { ScannerSidebar } from './components/scanner-sidebar';
import { ScanResults } from './components/scan-results';
import type { PortPreset } from './constants';

export function PortScannerPage() {
  const page = usePortScannerPage();

  const handleQuickStart = useCallback(async (presetValue: PortPreset) => {
    const scanTarget = page.target.trim() || '127.0.0.1';
    if (!page.target.trim()) {
      page.setTarget('127.0.0.1');
    }
    page.handlePresetChange(presetValue);
    await page.startScan(scanTarget, presetValue);
  }, [page.target, page.setTarget, page.handlePresetChange, page.startScan]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] h-full min-h-0 bg-background overflow-hidden">
      <ScannerSidebar
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
        canScan={page.canScan}
        onStart={page.startScan}
        onStop={page.stopScan}
      />

      <ScanResults
        openResults={page.openResults}
        hasResults={page.hasResults}
        isRunning={page.isRunning}
        hasRun={page.hasRun}
        progress={page.progress}
        error={page.error}
        target={page.target}
        concurrency={page.concurrency}
        onClear={page.clearResults}
        onCopyPorts={page.copyOpenPorts}
        onExportJson={page.handleExportJson}
        onExportCsv={page.handleExportCsv}
        onQuickStart={handleQuickStart}
      />
    </div>
  );
}
