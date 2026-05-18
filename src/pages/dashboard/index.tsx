'use client';

import { DashboardComposer } from './components/dashboard-composer';
import { DashboardThread } from './components/dashboard-thread';
import { useDashboardPage } from './hooks/use-dashboard-page';

export function DashboardPage() {
  const {
    fetchTargets,
    framework,
    handleAnalyze,
    isAnalyzing,
    libraryTargets,
    messages,
    prompt,
    selectedTarget,
    selectedTargetId,
    setFramework,
    setPrompt,
    setSelectedTargetId,
    usingDummyData,
  } = useDashboardPage();

  return (
    <div className="flex h-full min-h-0 flex-col">
      <DashboardThread
        libraryCount={libraryTargets.length}
        messages={messages}
        selectedTarget={selectedTarget}
        usingDummyData={usingDummyData}
      />
      <DashboardComposer
        fetchTargets={fetchTargets}
        framework={framework}
        isAnalyzing={isAnalyzing}
        libraryTargets={libraryTargets}
        onAnalyze={handleAnalyze}
        prompt={prompt}
        selectedTarget={selectedTarget}
        selectedTargetId={selectedTargetId}
        setFramework={setFramework}
        setPrompt={setPrompt}
        setSelectedTargetId={setSelectedTargetId}
      />
    </div>
  );
}
