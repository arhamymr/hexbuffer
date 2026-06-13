import React from 'react';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { useRegressionPage } from './hooks/use-regression-page';
import { TestCaseList } from './components/test-case-list';
import { TestSuiteEditor } from './components/test-suite-editor';
import { TestRunner } from './components/test-runner';
import { TestResults } from './components/test-results';


export function RegressionPage() {
  const {
    testCases,
    selectedCase,
    selectedRuns,
    activeRun,
    liveSteps,
    editingCase,
    isNew,
    handleCreate,
    handleEdit,
    handleSave,
    handleDelete,
    handleRun,
    handleCancelEdit,
    setSelectedCaseId,
  } = useRegressionPage();

  const isRunning = activeRun?.status === 'running' || activeRun?.status === 'queued';
  const latestRun = selectedRuns.length > 0 ? selectedRuns[0] : null;

  // If editing a test case, show the editor on the right
  // Otherwise show runner + results
  const isEditing = editingCase !== null;

  return (
    <div className="h-full flex">
      <ResizablePanelGroup direction="horizontal" className="h-full">
        {/* Left panel: Test case list */}
        <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
          <TestCaseList
            testCases={testCases}
            selectedId={selectedCase?.id || null}
            onSelect={setSelectedCaseId}
            onCreate={handleCreate}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onRun={handleRun}
            isRunning={isRunning}
          />
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Right panel: Editor / Runner + Results */}
        <ResizablePanel defaultSize={75} minSize={40}>
          {isEditing ? (
            <TestSuiteEditor
              testCase={editingCase!}
              isNew={isNew}
              onSave={handleSave}
              onCancel={handleCancelEdit}
            />
          ) : (
            <div className="flex flex-col h-full">
              {/* Top: Runner */}
              <div className="flex-1 min-h-0">
                <TestRunner
                  testCase={selectedCase}
                  activeRun={activeRun}
                  liveSteps={liveSteps}
                  latestRun={latestRun}
                  onRun={handleRun}
                  isRunning={isRunning}
                />
              </div>

              {/* Bottom: Results tabs */}
              <ResizablePanelGroup direction="vertical" className="border-t">
                <ResizablePanel defaultSize={40} minSize={20}>
                  <TestResults
                    runs={selectedRuns}
                    onRun={handleRun}
                    isRunning={isRunning}
                  />
                </ResizablePanel>
              </ResizablePanelGroup>
            </div>
          )}
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
