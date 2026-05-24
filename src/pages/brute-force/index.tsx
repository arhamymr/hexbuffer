'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, Square, Play } from 'lucide-react';
import { TabbedPageLayout } from '@/components/tabs-layout/tabbed-page-layout';
import { BruteForceConfigDialog } from './components/brute-force-config-dialog';
import { BruteForceFilters } from './components/brute-force-filters';
import { BruteForcePayloadDialog } from './components/brute-force-payload-dialog';
import { BruteForceProgress } from './components/brute-force-progress';
import { BruteForceResultDrawer } from './components/brute-force-result-drawer';
import { BruteForceResultsPane } from './components/brute-force-results-pane';
import { useBruteForcePage } from './hooks/use-brute-force-page';
import { findRequestPayloadPositions } from './types';

export function BruteForcePage() {
  const {
    tabs,
    activeTabId,
    setActiveTabId,
    renameTab,
    addAttackTab,
    closeTab,
    activeTab,
    config,
    updateConfig,
    updateAttackMode,
    updatePayloadType,
    updatePayloadValues,
    updateNumberRange,
    addProcessingStep,
    removeProcessingStep,
    updateGrepMatch,
    updateGrepExtract,
    updateSessionHandling,
    results,
    filteredResults,
    isRunning,
    progress,
    startError,
    selectedResult,
    setSelectedResult,
    stopAttack,
    clearResults,
    clearStartError,
    payloadDialogOpen,
    setPayloadDialogOpen,
    filterStatus,
    setFilterStatus,
    filterPayload,
    setFilterPayload,
    filterGrep,
    setFilterGrep,
    handleLoadPayloads,
    handleSelectPayloadFile,
    handleStartAttack,
    handleExportResults,
  } = useBruteForcePage();

  if (!activeTab) {
    return null;
  }

  const markedPositions = findRequestPayloadPositions(config.base_request);
  const hasPayloads =
    config.payload_config.payload_type === 'NumberRange' ||
    config.payload_config.values.length > 0 ||
    Boolean(config.payload_config.file_path);
  const canStart = true;
  const startBlockedReason = !config.base_request.url
    ? 'Add a request URL'
    : !hasPayloads
      ? 'Add at least one payload'
      : markedPositions.length === 0
        ? 'Mark a payload position with § markers'
        : startError;

  return (
    <TabbedPageLayout
      tabs={tabs}
      activeTabId={activeTabId}
      onTabChange={setActiveTabId}
      onTabRename={renameTab}
      onTabClose={closeTab}
      contentClassName="flex-1 border rounded-lg overflow-hidden bg-background min-h-0"
    >
      <div className="flex h-full min-h-0 flex-col">
        <div className="bg-muted grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-2">
          <div className="flex min-h-0 flex-col border-b lg:border-b-0 lg:border-r">
            <div className="bg-muted h-10 px-3 py-2 border-b flex items-center justify-between gap-3">
              <span className="text-sm font-medium">Config Payload</span>
              <div className="flex items-center gap-3">
                {isRunning && progress && (
                  <Badge variant="secondary" className="animate-pulse">
                    {progress.current} / {progress.total}
                  </Badge>
                )}
                {!isRunning && startBlockedReason && (
                  <Badge variant={canStart ? 'secondary' : 'yellow'}>
                    {startBlockedReason}
                  </Badge>
                )}
                <Button variant="outline" size="xs" onClick={() => addAttackTab()}>
                  <Plus className="h-4 w-4 mr-1" />
                  NEW ATTACK
                </Button>
                {isRunning ? (
                  <Button variant="destructive" size="xs" onClick={stopAttack}>
                    <Square className="h-4 w-4 mr-1" />
                    Stop
                  </Button>
                ) : (
                  <Button size="xs" onClick={() => { clearStartError(); handleStartAttack(); }} disabled={!canStart}>
                    <Play className="h-4 w-4 mr-1" />
                    Start Attack
                  </Button>
                )}
              </div>
            </div>

            <BruteForceProgress progress={progress} />

            <div className="min-h-0 flex-1 p-2">
              <BruteForceConfigDialog
                config={config}
                updateConfig={updateConfig}
                updateAttackMode={updateAttackMode}
                updatePayloadType={updatePayloadType}
                updatePayloadValues={updatePayloadValues}
                updateNumberRange={updateNumberRange}
                addProcessingStep={addProcessingStep}
                removeProcessingStep={removeProcessingStep}
                updateGrepMatch={updateGrepMatch}
                updateGrepExtract={updateGrepExtract}
                updateSessionHandling={updateSessionHandling}
                onOpenPayloadFile={() => setPayloadDialogOpen(true)}
              />
            </div>
          </div>

          <div className="flex min-h-0 flex-col">
            <div className="bg-muted h-10 px-3 py-2 border-b flex items-center">
              <span className="text-sm font-medium">Result</span>
            </div>

            <div className="flex min-h-0 flex-1 flex-col p-2">
              <BruteForceFilters
                filterStatus={filterStatus}
                filterPayload={filterPayload}
                filterGrep={filterGrep}
                resultsCount={results.length}
                onFilterStatusChange={setFilterStatus}
                onFilterPayloadChange={setFilterPayload}
                onFilterGrepChange={setFilterGrep}
                onExport={handleExportResults}
                onClear={clearResults}
              />

              <div className="min-h-0 flex-1">
                <BruteForceResultsPane
                  results={filteredResults}
                  isRunning={isRunning}
                  selectedResult={selectedResult}
                  onSelectResult={setSelectedResult}
                />
              </div>
            </div>
          </div>
        </div>

        <BruteForceResultDrawer
          open={Boolean(selectedResult)}
          result={selectedResult}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedResult(null);
            }
          }}
        />

        <BruteForcePayloadDialog
          open={payloadDialogOpen}
          onOpenChange={setPayloadDialogOpen}
          onLoadPayloads={handleLoadPayloads}
          onSelectPayloadFile={handleSelectPayloadFile}
        />
      </div>
    </TabbedPageLayout>
  );
}
