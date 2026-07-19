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
import { RegressionTree } from './components/regression-tree';
import { RelationalDashboard } from './components/relational-dashboard';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

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
        <div className="flex flex-row h-full min-h-0 bg-background">
          {/* Left Panel */}
          <div className="w-[240px] border-r shrink-0 flex flex-col bg-card">
            {/* Sidebar Switcher */}
            <div className="flex border-b text-center select-none text-[11px] shrink-0 p-1 bg-muted/30">
              <button
                onClick={() => page.setSidebarMode('builder')}
                className={cn(
                  "flex-1 py-1 font-bold rounded-sm active:scale-[0.97] transition-all",
                  page.sidebarMode === 'builder'
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Suites Tree
              </button>
              <button
                onClick={() => page.setSidebarMode('dashboard')}
                className={cn(
                  "flex-1 py-1 font-bold rounded-sm active:scale-[0.97] transition-all",
                  page.sidebarMode === 'dashboard'
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Dashboard
              </button>
            </div>

            {page.sidebarMode === 'builder' ? (
              <RegressionTree
                testCases={page.testCases}
                activeTestCaseId={page.activeTabTestCase?.id ?? null}
                onSelectTestCase={page.openTestCase}
                onDeleteTestCase={page.handleDelete}
                onEditTestCase={page.handleEdit}
                onRunTestCase={page.handleRun}
                onRenameFolder={page.handleRenameFolder}
                onDeleteFolder={page.handleDeleteFolder}
                onSaveTestCase={page.handleSave}
                onRefresh={page.loadTestCases}
                onAbortTestCase={page.abortTest}
                isRunning={page.isRunning}
                onCreateTestCase={page.handleCreate}
              />
            ) : (
              /* Dashboard Sidebar Info */
              <div className="flex-1 flex flex-col p-4 space-y-4 select-none">
                <div>
                  <h3 className="text-xs font-bold text-foreground">Relational Schema</h3>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Playwright metrics are normalized across Projects, Environments, Runs, Suites, and Errors.
                  </p>
                </div>
                <div className="border rounded bg-muted/10 p-3 space-y-2 text-[10px] text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <span>Projects</span>
                    <Badge variant="outline" className="text-[8px] bg-background">Active</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Execution Envs</span>
                    <Badge variant="outline" className="text-[8px] bg-background">Multi-env</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Error signatures</span>
                    <Badge variant="outline" className="text-[8px] bg-background">Deduplicated</Badge>
                  </div>
                </div>
                <div className="text-[10px] text-muted-foreground/60 leading-normal">
                  <span className="font-semibold block text-foreground/80 mb-0.5">Optimization note:</span>
                  The catalog utilizes composite indexes for sub-second database lookups.
                </div>
              </div>
            )}
          </div>

          {/* Right: Main Content Panel */}
          <div className="flex-1 flex flex-col min-w-0">
            {page.sidebarMode === 'dashboard' ? (
              <RelationalDashboard />
            ) : page.internalTabs.length === 0 ? (
              <RegressionEmptyState onCreate={page.handleCreate} />
            ) : (
              <>
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
                  onRunAll={page.handleRunAllInActiveTest}
                  onRun={() => page.activeTabTestCase && page.handleRun(page.activeTabTestCase.id)}
                  onAbort={page.abortTest}
                  queue={page.queue}
                  onStopQueue={page.stopQueue}
                />

                <main className="min-h-0 flex-1">
                  <div className="h-full min-h-0">
                    {page.enrichedInternalTabs.map((tab) => (
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
                          <ResizablePanelGroup orientation="vertical" className="h-full min-h-0">
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
                                logs={page.logs}
                                onClearLogs={page.clearLogs}
                              />
                            </ResizablePanel>
                          </ResizablePanelGroup>
                        )}
                      </TabsContent>
                    ))}
                  </div>
                </main>
              </>
            )}
          </div>
        </div>
      </TabbedPageLayout>
    </ReactFlowProvider>
  );
}

