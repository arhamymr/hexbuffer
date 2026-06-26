import { useState, useEffect, useCallback, useMemo } from 'react';
import type { CodecType, CodecMode } from '../types';
import { MODE_LABELS } from '../constants';
import { convert } from '../lib/codec-functions';

export function useEncoderPage() {
  const [input, setInput] = useState('');
  const [activeType, setActiveType] = useState<CodecType>('url');
  const [mode, setMode] = useState<CodecMode>('encode');
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const currentMode = useMemo(() => MODE_LABELS[mode], [mode]);

  const handleConvert = useCallback(() => {
    const result = convert(input, activeType, mode);
    setOutput(result.output);
    setError(result.error);
  }, [input, activeType, mode]);

  // Auto-convert on input/type/mode change
  useEffect(() => {
    handleConvert();
  }, [handleConvert]);

  const handleCopy = useCallback(async () => {
    if (output) {
      await navigator.clipboard.writeText(output);
    }
  }, [output]);

  const handleClear = useCallback(() => {
    setInput('');
    setOutput('');
    setError(null);
  }, []);

  const handleSwap = useCallback(() => {
    setMode((currentMode) => (currentMode === 'encode' ? 'decode' : 'encode'));
    setInput(output || input);
  }, [output, input]);

  const isEmpty = !input && !output && !error;

  return {
    input,
    setInput,
    activeType,
    setActiveType,
    mode,
    setMode,
    output,
    error,
    currentMode,
    handleCopy,
    handleClear,
    handleSwap,
    isEmpty,
  };
}
