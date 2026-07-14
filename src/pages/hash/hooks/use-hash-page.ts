import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import type { HashType } from '../types';
import { computeHash } from '../lib/hash-functions';

export function useHashPage() {
  const [input, setInput] = useState('');
  const [activeType, setActiveType] = useState<HashType>('sha256');
  const [output, setOutput] = useState('');

  const handleHash = useCallback(() => {
    setOutput(computeHash(input, activeType));
  }, [input, activeType]);

  // Auto-hash on input/type change
  useEffect(() => {
    handleHash();
  }, [handleHash]);

  const handleCopy = useCallback(async () => {
    if (output) {
      await navigator.clipboard.writeText(output);
      toast.success('Hash copied to clipboard');
    }
  }, [output]);

  const handleClear = useCallback(() => {
    setInput('');
    setOutput('');
  }, []);

  const isEmpty = !input && !output;

  return {
    input,
    setInput,
    activeType,
    setActiveType,
    output,
    handleCopy,
    handleClear,
    isEmpty,
  };
}
