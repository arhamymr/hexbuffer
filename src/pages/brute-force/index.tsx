'use client';

import { BruteForceConfigDialog } from './components/brute-force-config-dialog';
import { BruteForceFilters } from './components/brute-force-filters';
import { BruteForcePayloadDialog } from './components/brute-force-payload-dialog';
import { BruteForcePreviewPane } from './components/brute-force-preview-pane';
import { BruteForceProgress } from './components/brute-force-progress';
import { BruteForceRequestDialog } from './components/brute-force-request-dialog';
import { BruteForceResultsPane } from './components/brute-force-results-pane';
import { BruteForceToolbar } from './components/brute-force-toolbar';
import { useBruteForcePage } from './hooks/use-brute-force-page';

export function BruteForcePage() {
  const {
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
    selectedResult,
    setSelectedResult,
    startAttack,
    stopAttack,
    clearResults,
    configDialogOpen,
    setConfigDialogOpen,
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
    handleParseRawRequest,
    handleExportResults,
  } = useBruteForcePage();

  return (
    <div className="flex flex-col h-full">
      <BruteForceToolbar
        isRunning={isRunning}
        progress={progress}
        canStart={Boolean(config.base_request.url)}
        onOpenConfig={() => setConfigDialogOpen(true)}
        onOpenImport={() => setRawRequestDialogOpen(true)}
        onStart={startAttack}
        onStop={stopAttack}
      />

      <BruteForceProgress progress={progress} />

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

      <div className="flex-1 grid grid-cols-2 gap-4 min-h-0">
        <BruteForceResultsPane
          results={filteredResults}
          isRunning={isRunning}
          selectedResult={selectedResult}
          onSelectResult={setSelectedResult}
        />
        <BruteForcePreviewPane selectedResult={selectedResult} />
      </div>

      <BruteForceConfigDialog
        open={configDialogOpen}
        onOpenChange={setConfigDialogOpen}
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
      />
    </div>
  );
}
