'use client';

import { PromptInjectionPayloadDialog } from './components/payload-dialog';
import { PromptInjectionRequestPanel } from './components/request-panel';
import { PromptInjectionResultPane } from './components/result-pane';
import { usePromptInjectionTester } from './components/use-prompt-injection-tester';
import { TOOL_CONFIGS } from './components/config';

interface AIPayloadTesterProps {
  tool: keyof typeof TOOL_CONFIGS;
}

function AIPayloadTester({ tool }: AIPayloadTesterProps) {
  const tester = usePromptInjectionTester(tool);

  return (
    <div className="grid h-full min-h-0 grid-cols-1 bg-muted lg:grid-cols-2">
      <PromptInjectionRequestPanel
        payloadMode={tester.payloadMode}
        allPayloadsCount={tester.allPayloads.length}
        payloadsToRun={tester.payloadsToRun}
        markedTargetCount={tester.markedTargetCount}
        requestBody={tester.requestBody}
        endpoint={tester.endpoint}
        attackType={tester.attackType}
        isRunning={tester.isRunning}
        requestEditorRef={tester.requestEditorRef}
        onPayloadConfigOpen={() => tester.setPayloadDialogOpen(true)}
        onMarkRequestTarget={tester.markRequestTarget}
        onRequestBodyChange={tester.setRequestBody}
        onEndpointChange={tester.setEndpoint}
        onAttackTypeChange={tester.setAttackType}
        onRun={tester.runAttack}
        onStop={tester.stopAttack}
      />

      <PromptInjectionResultPane
        results={tester.results}
        selectedResult={tester.selectedResult}
        isRunning={tester.isRunning}
        currentRunningIndex={tester.currentRunningIndex}
        runTotal={tester.runTotal}
        successCount={tester.successCount}
        anomalyCount={tester.anomalyCount}
        onSelectResult={tester.setSelectedResultId}
        onCopySelectedResponse={tester.copySelectedResponse}
        onExportResults={tester.exportResults}
        onClearResults={tester.clearResults}
      />

      <PromptInjectionPayloadDialog
        open={tester.payloadDialogOpen}
        config={tester.config}
        draftPayloadMode={tester.draftPayloadMode}
        draftManualPayloads={tester.draftManualPayloads}
        draftImportedPayloads={tester.draftImportedPayloads}
        draftSelectedPayloads={tester.draftSelectedPayloads}
        draftAllPayloads={tester.draftAllPayloads}
        attackSettings={tester.attackSettings}
        fileInputRef={tester.fileInputRef}
        onOpenChange={tester.setPayloadDialogOpen}
        onDraftPayloadModeChange={tester.setDraftPayloadMode}
        onDraftManualPayloadsChange={tester.setDraftManualPayloads}
        onAttackSettingsChange={tester.setAttackSettings}
        onLoadPayloadFile={tester.loadPayloadFile}
        onLoadBundledPayloads={tester.loadBundledPayloads}
        onToggleDraftPayload={tester.toggleDraftPayload}
        onSelectAllPayloads={tester.selectAllPayloads}
        onSave={tester.savePayloadConfig}
      />
    </div>
  );
}

export function PromptInjectionTool() {
  return <AIPayloadTester tool="prompt-injection" />;
}
