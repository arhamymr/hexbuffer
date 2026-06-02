'use client';

import { Download, Pause, Play, RotateCcw, Square } from 'lucide-react';
import { ActivityLogPanel } from './components/activity-log-panel';
import { AiInsightsPanel } from './components/ai-insights-panel';
import { CrawlOverviewPanel } from './components/crawl-overview-panel';
import { CrawlSetupScreen } from './components/crawl-setup-screen';
import { CrawlTreePanel } from './components/crawl-tree-panel';
import { PageDetailDrawer } from './components/page-detail-drawer';
import { Button } from '@/components/ui/button';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { useBrowserAutomationPage } from './hooks/use-browser-automation-page';

export function BrowserAutomationPage() {
  const {
    setup,
    session,
    overview,
    crawlTree,
    selectedPage,
    expandedPageIds,
    pageSearch,
    pageStatusFilter,
    insightSeverityFilter,
    insightTypeFilter,
    insightTypes,
    logSearch,
    logTypeFilter,
    filteredInsights,
    filteredLogs,
    updateSetup,
    startCrawl,
    pauseCrawl,
    resumeCrawl,
    stopCrawl,
    exportCrawl,
    exportInsights,
    exportLogs,
    selectPage,
    toggleInsightReviewed,
    markPageInteresting,
    setPageSearch,
    setPageStatusFilter,
    setInsightSeverityFilter,
    setInsightTypeFilter,
    setLogSearch,
    setLogTypeFilter,
    handleInsightOpen,
    handleCopyLog,
    handleCopyPageUrl,
    handleOpenPage,
  } = useBrowserAutomationPage();

  const status = session?.status ?? 'idle';
  const isRunning = status === 'running';
  const isPaused = status === 'paused';

  return (
    <div className="flex h-full min-h-0 flex-col rounded-md border bg-background">
      <header className="border-b px-3 py-3">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="grid min-w-0 flex-1 gap-2">
            <div className="min-w-0 truncate text-xs text-muted-foreground">
              Target <span className="font-mono font-semibold text-foreground">{session?.targetUrl || setup.targetUrl || '-'}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <CrawlSetupScreen
              setup={setup}
              disabled={isRunning}
              onSetupChange={updateSetup}
              onStart={startCrawl}
            />
            <Button variant="outline" onClick={pauseCrawl} disabled={!isRunning}>
              <Pause className="h-4 w-4" />
              Pause
            </Button>
            <Button variant="outline" onClick={resumeCrawl} disabled={!isPaused}>
              <RotateCcw className="h-4 w-4" />
              Resume
            </Button>
            <Button variant="outline" onClick={stopCrawl} disabled={!isRunning && !isPaused}>
              <Square className="h-4 w-4" />
              Stop
            </Button>
            <Button variant="outline" onClick={exportCrawl} disabled={!session}>
              <Download className="h-4 w-4" />
              Export
            </Button>
            <Button onClick={startCrawl} disabled={isRunning || !setup.targetUrl.trim()}>
              <Play className="h-4 w-4" />
              Start
            </Button>
          </div>
        </div>
      </header>

      <main className="min-h-0 flex-1">
        <ResizablePanelGroup orientation="vertical" className="min-h-0">
          
           <ResizablePanel defaultSize={32} minSize={22}>
            <ActivityLogPanel
              logs={filteredLogs}
              search={logSearch}
              typeFilter={logTypeFilter}
              onSearchChange={setLogSearch}
              onTypeFilterChange={setLogTypeFilter}
              onCopyLog={handleCopyLog}
              onExport={exportLogs}
            />
          </ResizablePanel>

        
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={68} minSize={42}>
            <ResizablePanelGroup orientation="horizontal" className="min-h-0">
              <ResizablePanel defaultSize={18} minSize={14}>
                <CrawlOverviewPanel overview={overview} />
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={38} minSize={24}>
                <CrawlTreePanel
                  nodes={crawlTree}
                  selectedPageId={selectedPage?.id ?? null}
                  expandedPageIds={expandedPageIds}
                  search={pageSearch}
                  statusFilter={pageStatusFilter}
                  onSearchChange={setPageSearch}
                  onStatusFilterChange={setPageStatusFilter}
                  onSelectPage={selectPage}
                />
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={44} minSize={28}>
                <AiInsightsPanel
                  insights={filteredInsights}
                  insightTypes={insightTypes}
                  severityFilter={insightSeverityFilter}
                  typeFilter={insightTypeFilter}
                  onSeverityFilterChange={setInsightSeverityFilter}
                  onTypeFilterChange={setInsightTypeFilter}
                  onOpenInsight={handleInsightOpen}
                  onToggleReviewed={toggleInsightReviewed}
                  onExport={exportInsights}
                />
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>
        </ResizablePanelGroup>
      </main>

      <PageDetailDrawer
        page={selectedPage}
        onClose={() => selectPage(null)}
        onCopyUrl={handleCopyPageUrl}
        onOpenPage={handleOpenPage}
        onToggleInteresting={markPageInteresting}
      />
    </div>
  );
}
