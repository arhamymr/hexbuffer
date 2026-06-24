import { ReactFlowProvider } from '@xyflow/react';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { TabsContent } from '@/components/ui/tabs';
import { TabbedPageLayout } from '@/components/tabs-layout/tabbed-page-layout';
import { useRegressionPage } from './hooks/use-regression-page';
import { RegressionHeader } from './components/regression-header';
import { RegressionEmptyState } from './components/regression-empty-state';
import { TestSuiteEditor } from './components/test-suite-editor';
import { TestRunner } from './components/test-runner';
import { TestResults } from './components/test-results';

export function RegressionPage() {
  const page = useRegressionPage();

  return (
    <ReactFlowProvider>
      <TabbedPageLayout
        tabs={page.tabs}
        activeTabId={page.activeTabId}
        onTabChange={page.setActiveTabId}
        onTabRename={page.handleRenameTab}
        onTabClose={page.handleCloseTab}
        onTabAdd={page.handleAddTab}
        contentClassName="flex-1 border rounded-md overflow-hidden bg-background min-h-0"
      >
        <div className="flex h-full min-h-0 flex-col bg-background">
          <RegressionHeader
            activeTestName={page.activeTestName}
            activeTabTestCase={page.activeTabTestCase}
            activeTestCases={page.activeTestCases}
            testCases={page.testCases}
            activeTestEnabledCount={page.activeTestEnabledCount}
            enabledCount={page.enabledCount}
            activeTabRunCount={page.activeTabRunCount}
            totalRuns={page.totalRuns}
            isRunning={page.isRunning}
            activeTab={page.activeTab}
            onCreate={page.handleCreate}
            onRunAll={page.handleRunAllInActiveTest}
            onRun={() => page.activeTabTestCase && page.handleRun(page.activeTabTestCase.id)}
          />

          <main className="min-h-0 flex-1">
            <div className="h-full min-h-0">
              {page.internalTabs.length === 0 ? (
                <RegressionEmptyState onCreate={page.handleCreate} />
              ) : (
                page.enrichedInternalTabs.map((tab) => (
                  <TabsContent key={tab.id} value={tab.id} className="h-full min-h-0">
                    {tab.isEditing ? (
                      <TestSuiteEditor
                        testCase={tab.editingCase!}
                        isNew={tab.isNew}
                        onSave={page.handleSave}
                        onDraftChange={page.handleDraftChange}
                        onCancel={page.handleCancelEdit}
                      />
                    ) : (
                      <ResizablePanelGroup orientation="vertical" className="min-h-0">
                        <ResizablePanel defaultSize={58} minSize={30}>
                          <TestRunner
                            testCase={tab.tabTestCase}
                            activeRun={page.activeRun}
                            liveSteps={page.liveSteps}
                            latestRun={tab.latestRun}
                            onRun={page.handleRun}
                            onRunStep={page.handleRunStep}
                            isRunning={page.isRunning}
                            runningStepIndex={page.runningStepIndex}
                            singleStepResults={page.singleStepResults}
                          />
                        </ResizablePanel>
                        <ResizableHandle withHandle />
                        <ResizablePanel defaultSize={42} minSize={20}>
                          <TestResults
                            runs={tab.tabRuns}
                            onRun={page.handleRun}
                            isRunning={page.isRunning}
                          />
                        </ResizablePanel>
                      </ResizablePanelGroup>
                    )}
                  </TabsContent>
                ))
              )}
            </div>
          </main>
        </div>
      </TabbedPageLayout>
    </ReactFlowProvider>
  );
}

