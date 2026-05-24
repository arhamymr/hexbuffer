'use client';

import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TabbedPageLayout } from '@/components/tabs-layout/tabbed-page-layout';
import { BruteForceConfigDialog } from './components/brute-force-config-dialog';
import { BruteForceFilters } from './components/brute-force-filters';
import { BruteForcePayloadDialog } from './components/brute-force-payload-dialog';
import { BruteForceProgress } from './components/brute-force-progress';
import { BruteForceRequestDialog } from './components/brute-force-request-dialog';
import { BruteForceResultDrawer } from './components/brute-force-result-drawer';
import { BruteForceResultsPane } from './components/brute-force-results-pane';
import { BruteForceToolbar } from './components/brute-force-toolbar';
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
    rawRequestDialogOpen,
    setRawRequestDialogOpen,
    rawRequestContent,
    setRawRequestContent,
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
    handleParseRawRequest,
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
      contentClassName="flex-1 min-h-0 overflow-hidden bg-background"
    >
      <div className="mb-2 flex justify-end">
        <Button variant="outline" size="xs" onClick={() => addAttackTab()}>
          <Plus className="h-4 w-4 mr-1" />
          New Attack
        </Button>
      </div>
      <div className="flex h-full min-h-0 flex-col">
      <BruteForceToolbar
        isRunning={isRunning}
        progress={progress}
        canStart={canStart}
        startBlockedReason={startBlockedReason}
        onOpenImport={() => setRawRequestDialogOpen(true)}
        onStart={() => {
          clearStartError();
          handleStartAttack();
        }}
        onStop={stopAttack}
      />

      <BruteForceProgress progress={progress} />

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

      <div className="mt-4 flex min-h-0 flex-1 flex-col">
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

      <BruteForceResultDrawer
        open={Boolean(selectedResult)}
        result={selectedResult}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedResult(null);
          }
        }}
      />

      <BruteForceRequestDialog
        open={rawRequestDialogOpen}
        onOpenChange={setRawRequestDialogOpen}
        rawRequestContent={rawRequestContent}
        onRawRequestChange={setRawRequestContent}
        onImport={handleParseRawRequest}
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
