'use client';

import { TabbedPageLayout } from '@/components/tabs-layout/tabbed-page-layout';
import { ThreatsWorkspace } from './components/threats-workspace';
import { useThreatsPage } from './hooks/use-threats-page';

export function ThreatsPage() {
  const page = useThreatsPage();

  return (
    <TabbedPageLayout
      tabs={page.tabs}
      activeTabId={page.activeTabId}
      onTabChange={page.setActiveTabId}
      contentClassName="flex-1 overflow-hidden bg-background min-h-0"
    >
      <ThreatsWorkspace
        samples={page.samples}
        selectedSample={page.selectedSample}
        selectedSampleId={page.selectedSampleId}
        setSelectedSampleId={page.setSelectedSampleId}
        analysis={page.analysis}
        analysisLogs={page.analysisLogs}
        loading={page.loading}
        analyzing={page.analyzing}
        runGhidra={page.runGhidra}
        setRunGhidra={page.setRunGhidra}
        yaraRulesPath={page.yaraRulesPath}
        search={page.search}
        setSearch={page.setSearch}
        handleAnalyze={page.handleAnalyze}
        handleCancelAnalysis={page.handleCancelAnalysis}
        handleDeleteSample={page.handleDeleteSample}
        handleChooseYaraRules={page.handleChooseYaraRules}
        handleImportSample={page.handleImportSample}
      />
    </TabbedPageLayout>
  );
}
