import React from 'react';
import { FlaskConical, ListChecks, Play, Plus } from 'lucide-react';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { TabsContent } from '@/components/ui/tabs';
import { TabbedPageLayout } from '@/components/tabs-layout/tabbed-page-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useRegressionPage } from './hooks/use-regression-page';
import { useRegressionStore } from '@/stores/regression';
import { TestCaseList } from './components/test-case-list';
import { TestSuiteEditor } from './components/test-suite-editor';
import { TestRunner } from './components/test-runner';
import { TestResults } from './components/test-results';

export function RegressionPage() {
  const {
    testCases,
    totalRuns,
    selectedCase,
    activeRun,
    liveSteps,
    handleAddTab,
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
  const activeTab = internalTabs.find((tab) => tab.id === activeTabId) ?? null;
  const activeTabTestCase =
    activeTab?.editingCase ||
    testCases.find((testCase) => testCase.id === activeTab?.testCaseId) ||
    null;
  const activeTabRunCount = activeTab?.testCaseId ? runs[activeTab.testCaseId]?.length || 0 : 0;
  const enabledCount = testCases.filter((testCase) => testCase.enabled).length;

  return (
    <TabbedPageLayout
      tabs={tabs}
      activeTabId={activeTabId}
      onTabChange={setActiveTabId}
      onTabRename={handleRenameTab}
      onTabClose={handleCloseTab}
      onTabAdd={handleAddTab}
      contentClassName="flex-1 border rounded-md overflow-hidden bg-background min-h-0"
    >
      <div className="flex h-full min-h-0 flex-col bg-background">
        <header className="shrink-0 border-b bg-muted px-3 py-3">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-sm border bg-background text-muted-foreground">
                <FlaskConical className="size-4" />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-sm font-semibold">
                  {activeTabTestCase?.name || 'Regression tests'}
                </h1>
                <p className="truncate text-xs text-muted-foreground">
                  {activeTabTestCase?.targetUrl || 'Create, run, and review browser regression checks'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="h-7 gap-1.5 rounded-sm bg-background text-xs">
                <ListChecks className="size-3.5" />
                {testCases.length} case{testCases.length !== 1 ? 's' : ''}
              </Badge>
              <Badge variant="outline" className="h-7 rounded-sm bg-background text-xs">
                {enabledCount} enabled
              </Badge>
              <Badge variant="outline" className="h-7 rounded-sm bg-background text-xs">
                {activeTabRunCount || totalRuns} run{(activeTabRunCount || totalRuns) !== 1 ? 's' : ''}
              </Badge>
              <Button variant="outline" size="xs" onClick={handleCreate}>
                <Plus className="size-4" />
                New
              </Button>
              <Button
                size="xs"
                onClick={() => activeTabTestCase && handleRun(activeTabTestCase.id)}
                disabled={isRunning || !activeTabTestCase || activeTab?.isEditing}
              >
                <Play className="size-4" />
                Run
              </Button>
            </div>
          </div>
        </header>

        <main className="min-h-0 flex-1">
          <ResizablePanelGroup orientation="horizontal" className="min-h-0">
            <ResizablePanel defaultSize={24} minSize={18}>
              <div className="h-full min-h-0">
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
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle />

            <ResizablePanel defaultSize={76} minSize={42}>
              <div className="h-full min-h-0">
                {internalTabs.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center p-6 text-center">
                    <FlaskConical className="mb-3 size-10 text-muted-foreground/30" />
                    <p className="mb-1 text-sm font-medium">No test case open</p>
                    <p className="max-w-sm text-xs text-muted-foreground">
                      Select a test case from the list or create a new one to start building regression coverage.
                    </p>
                    <Button variant="outline" size="xs" className="mt-4" onClick={handleCreate}>
                      <Plus className="size-4" />
                      New test case
                    </Button>
                  </div>
                ) : (
                  internalTabs.map((tab) => {
                    const tabTestCase =
                      tab.editingCase ||
                      testCases.find((c) => c.id === tab.testCaseId) ||
                      null;
                    const tabRuns = tab.testCaseId ? runs[tab.testCaseId] || [] : [];
                    const latestRun = tabRuns.length > 0 ? tabRuns[0] : null;

                    return (
                      <TabsContent key={tab.id} value={tab.id} className="h-full min-h-0">
                        {tab.isEditing ? (
                          <TestSuiteEditor
                            testCase={tab.editingCase!}
                            isNew={tab.isNew}
                            onSave={handleSave}
                            onCancel={handleCancelEdit}
                          />
                        ) : (
                          <ResizablePanelGroup orientation="vertical" className="min-h-0">
                            <ResizablePanel defaultSize={58} minSize={30}>
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
                            <ResizablePanel defaultSize={42} minSize={20}>
                              <TestResults
                                runs={tabRuns}
                                onRun={handleRun}
                                isRunning={isRunning}
                              />
                            </ResizablePanel>
                          </ResizablePanelGroup>
                        )}
                      </TabsContent>
                    );
                  })
                )}
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </main>
      </div>
    </TabbedPageLayout>
  );
}
