'use client';

import { DashboardComposer } from './components/dashboard-composer';
import { DashboardThread } from './components/dashboard-thread';
import { useDashboardPage } from './hooks/use-dashboard-page';

export function DashboardPage() {
  const {
    apiKey,
    fetchTargets,
    framework,
    handleAnalyze,
    isAnalyzing,
    libraryTargets,
    messages,
    model,
    prompt,
    selectedTarget,
    selectedTargetId,
    setApiKey,
    setFramework,
    setModel,
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
        apiKey={apiKey}
        fetchTargets={fetchTargets}
        framework={framework}
        isAnalyzing={isAnalyzing}
        libraryTargets={libraryTargets}
        model={model}
        onAnalyze={handleAnalyze}
        prompt={prompt}
        selectedTarget={selectedTarget}
        selectedTargetId={selectedTargetId}
        setApiKey={setApiKey}
        setFramework={setFramework}
        setModel={setModel}
        setPrompt={setPrompt}
        setSelectedTargetId={setSelectedTargetId}
      />
    </div>
  );
}
