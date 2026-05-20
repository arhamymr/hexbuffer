import { useEffect, useMemo, useState } from 'react';
import { useTargets } from '@/hooks/useTargets';
import type { Target } from '@/types';
import {
  DASHBOARD_DEFAULT_AI_MODEL,
  DASHBOARD_DUMMY_TARGETS,
} from '../constants';
import { analyzeAssetInput, type DashboardAnalysisFramework } from '../lib/analyze-asset-input';
import type { DashboardAnalysisMessage } from '../types';

function buildAnalysisInput(target: Target) {
  return [
    `Target name: ${target.name}`,
    target.description ? `Description: ${target.description}` : '',
    target.scope.length > 0 ? `Scope:\n${target.scope.join('\n')}` : 'Scope: not set',
  ]
    .filter(Boolean)
    .join('\n\n');
}

export function useDashboardPage() {
  const { targets, fetchTargets } = useTargets(null);
  const [selectedTargetId, setSelectedTargetId] = useState('');
  const [framework, setFramework] = useState<DashboardAnalysisFramework>('general');
  const [model, setModel] = useState(DASHBOARD_DEFAULT_AI_MODEL);
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<DashboardAnalysisMessage[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const libraryTargets = useMemo(
    () => (targets.length > 0 ? targets : DASHBOARD_DUMMY_TARGETS),
    [targets]
  );
  const usingDummyData = targets.length === 0;

  useEffect(() => {
    if (!selectedTargetId && libraryTargets.length > 0) {
      setSelectedTargetId(libraryTargets[0].id);
    }
  }, [libraryTargets, selectedTargetId]);

  const selectedTarget = useMemo(
    () => libraryTargets.find((target) => target.id === selectedTargetId) ?? null,
    [libraryTargets, selectedTargetId]
  );

  const handleAnalyze = async () => {
    if (!selectedTarget) {
      return;
    }

    setIsAnalyzing(true);
    await new Promise((resolve) => window.setTimeout(resolve, 320));

    const assetInput = buildAnalysisInput(selectedTarget);
    const analysisInput = [assetInput, prompt.trim() ? `Analyst prompt:\n${prompt.trim()}` : '']
      .filter(Boolean)
      .join('\n\n');
    const result = analyzeAssetInput(analysisInput, 'surface', framework);

    const message: DashboardAnalysisMessage = {
      id: `${selectedTarget.id}-${Date.now()}`,
      target: selectedTarget,
      result,
      provider: 'local',
    };

    setMessages((current) => [...current, message]);
    setIsAnalyzing(false);
  };

  return {
    fetchTargets,
    handleAnalyze,
    isAnalyzing,
    framework,
    libraryTargets,
    messages,
    model,
    prompt,
    selectedTarget,
    selectedTargetId,
    setFramework,
    setModel,
    setPrompt,
    setSelectedTargetId,
    usingDummyData,
  };
}
