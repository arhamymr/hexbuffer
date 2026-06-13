import React from 'react';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { TabsContent } from '@/components/ui/tabs';
import { TabbedPageLayout } from '@/components/tabs-layout/tabbed-page-layout';
import { useRegressionPage } from './hooks/use-regression-page';
import { useRegressionStore } from '@/stores/regression';
import { TestCaseList } from './components/test-case-list';
import { TestSuiteEditor } from './components/test-suite-editor';
import { TestRunner } from './components/test-runner';
import { TestResults } from './components/test-results';

export function RegressionPage() {
  const {
    testCases,
    selectedCase,
    activeRun,
    liveSteps,
    internalTabs,
    tabs,
    activeTabId,
    handleCreate,
    handleEdit,
    handleSave,
    handleDelete,
    handleRun,
    handleCancelEdit,
    openTestCase,
    handleCloseTab,
    handleRenameTab,
    setActiveTabId,
  } = useRegressionPage();

  const runs = useRegressionStore((s) => s.runs);
  const isRunning = activeRun?.status === 'running' || activeRun?.status === 'queued';

  return (
    <TabbedPageLayout
      tabs={tabs}
      activeTabId={activeTabId}
      onTabChange={setActiveTabId}
      onTabRename={handleRenameTab}
      onTabClose={handleCloseTab}
      contentClassName="flex-1 rounded-md overflow-hidden bg-background min-h-0"
    >
      {tabs.length === 0 ? (
        <TabsContent value="__empty__" className="h-full">
          <div className="flex h-full min-h-0">
            <div className="flex flex-col items-center justify-center flex-1 text-center p-6">
              <div className="text-muted-foreground/30 mb-2">
                <svg className="size-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                  <rect x="9" y="3" width="6" height="4" rx="1" />
                  <path d="M9 12h6M9 16h6" />
                </svg>
              </div>
              <p className="text-sm text-muted-foreground mb-1">No test case open</p>
              <p className="text-xs text-muted-foreground/70">
                Select a test case from the list or create a new one
              </p>
            </div>
          </div>
        </TabsContent>
      ) : (
        internalTabs.map((tab) => {
          const tabTestCase =
            tab.editingCase ||
            testCases.find((c) => c.id === tab.testCaseId) ||
            null;
          const tabRuns = tab.testCaseId ? runs[tab.testCaseId] || [] : [];
          const latestRun = tabRuns.length > 0 ? tabRuns[0] : null;

          return (
            <TabsContent key={tab.id} value={tab.id} className="h-full">
              <div className="flex h-full min-h-0">
                <ResizablePanelGroup direction="horizontal" className="h-full">
                  {/* Left panel: Test case list */}
                  <ResizablePanel defaultSize={22} minSize={18} maxSize={35}>
                    <TestCaseList
                      testCases={testCases}
                      selectedId={selectedCase?.id || null}
                      onSelect={openTestCase}
                      onCreate={handleCreate}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onRun={handleRun}
                      isRunning={isRunning}
                    />
                  </ResizablePanel>

                  <ResizableHandle withHandle />

                  {/* Right panel: Editor or Runner + Results */}
                  <ResizablePanel defaultSize={78} minSize={40}>
                    {tab.isEditing ? (
                      <TestSuiteEditor
                        testCase={tab.editingCase!}
                        isNew={tab.isNew}
                        onSave={handleSave}
                        onCancel={handleCancelEdit}
                      />
                    ) : (
                      <ResizablePanelGroup direction="vertical" className="h-full">
                        <ResizablePanel defaultSize={55} minSize={30}>
                          <TestRunner
                            testCase={tabTestCase}
                            activeRun={activeRun}
                            liveSteps={liveSteps}
                            latestRun={latestRun}
                            onRun={handleRun}
                            isRunning={isRunning}
                          />
                        </ResizablePanel>
                        <ResizableHandle withHandle />
                        <ResizablePanel defaultSize={45} minSize={20}>
                          <TestResults
                            runs={tabRuns}
                            onRun={handleRun}
                            isRunning={isRunning}
                          />
                        </ResizablePanel>
                      </ResizablePanelGroup>
                    )}
                  </ResizablePanel>
                </ResizablePanelGroup>
              </div>
            </TabsContent>
          );
        })
      )}
    </TabbedPageLayout>
  );
}
