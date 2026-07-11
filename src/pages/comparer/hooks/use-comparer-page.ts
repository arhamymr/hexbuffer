import { useState, useMemo, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { diffLines, diffWords, diffChars, type Change } from 'diff';
import type { DiffMode } from '../types';

function buildUnifiedText(parts: Change[]): string {
  return parts
    .map((p) => {
      if (p.added) return p.value.split('\n').map((l) => `+ ${l}`).join('\n');
      if (p.removed) return p.value.split('\n').map((l) => `- ${l}`).join('\n');
      return p.value.split('\n').map((l) => `  ${l}`).join('\n');
    })
    .join('');
}

const diffFunctions: Record<DiffMode, (a: string, b: string) => Change[]> = {
  lines: (a, b) => diffLines(a, b, { ignoreNewlineAtEof: true }),
  words: (a, b) => diffWords(a, b),
  chars: (a, b) => diffChars(a, b),
};

export function useComparerPage() {
  const [valueA, setValueA] = useState(() => localStorage.getItem('comparer-value-a') ?? '');
  const [valueB, setValueB] = useState(() => localStorage.getItem('comparer-value-b') ?? '');
  const [diffMode, setDiffMode] = useState<DiffMode>(() => (localStorage.getItem('comparer-diff-mode') as DiffMode) ?? 'lines');

  useEffect(() => {
    localStorage.setItem('comparer-value-a', valueA);
  }, [valueA]);

  useEffect(() => {
    localStorage.setItem('comparer-value-b', valueB);
  }, [valueB]);

  useEffect(() => {
    localStorage.setItem('comparer-diff-mode', diffMode);
  }, [diffMode]);

  const diffResult = useMemo<Change[]>(() => {
    if (!valueA && !valueB) return [];
    return diffFunctions[diffMode](valueA, valueB);
  }, [valueA, valueB, diffMode]);

  const hasContent = valueA.length > 0 || valueB.length > 0;
  const hasDiff = diffResult.some((p) => p.added || p.removed);

  const handleCopy = useCallback(async () => {
    const text = buildUnifiedText(diffResult);
    if (!text) return;
    await navigator.clipboard.writeText(text);
    toast.success('Diff copied to clipboard');
  }, [diffResult]);

  const handleClear = useCallback(() => {
    setValueA('');
    setValueB('');
  }, []);

  const handleSwap = useCallback(() => {
    setValueA(valueB);
    setValueB(valueA);
  }, [valueA, valueB]);

  return {
    // State
    valueA,
    setValueA,
    valueB,
    setValueB,
    diffMode,
    setDiffMode,
    // Derived
    diffResult,
    hasContent,
    hasDiff,
    // Actions
    handleCopy,
    handleClear,
    handleSwap,
  };
}
