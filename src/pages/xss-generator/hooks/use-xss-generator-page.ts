import { useState, useMemo, useEffect, useCallback } from 'react';
import type { XssPayloadCategory, XssPayload, XssEncodingType } from '../types';
import { XSS_PAYLOADS, ENCODING_ORDER } from '../constants';
import { ENCODING_FUNCTIONS } from '../lib/encoding-functions';

export function useXssGeneratorPage() {
  const [activeCategory, setActiveCategory] = useState<XssPayloadCategory>('reflected');
  const [basePayload, setBasePayload] = useState('');
  const [encodings, setEncodings] = useState<Set<XssEncodingType>>(new Set());
  const [injectionContext, setInjectionContext] = useState('');
  const [encodedOutput, setEncodedOutput] = useState('');

  const filteredPayloads = useMemo(
    () => XSS_PAYLOADS.filter((p) => p.category === activeCategory),
    [activeCategory],
  );

  // Toggle encoding
  const toggleEncoding = useCallback((type: XssEncodingType) => {
    setEncodings((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }, []);

  // Auto-encode pipeline
  useEffect(() => {
    if (!basePayload.trim()) {
      setEncodedOutput('');
      return;
    }

    let result = basePayload;
    for (const enc of ENCODING_ORDER) {
      if (encodings.has(enc)) {
        result = ENCODING_FUNCTIONS[enc](result);
      }
    }

    if (injectionContext.trim()) {
      result = injectionContext.replace(/PAYLOAD|\$/g, result);
    }

    setEncodedOutput(result);
  }, [basePayload, encodings, injectionContext]);

  const handleSelectPayload = useCallback((payload: XssPayload) => {
    setBasePayload(payload.payload);
  }, []);

  const handleCopy = useCallback(async (text: string) => {
    if (text) await navigator.clipboard.writeText(text);
  }, []);

  const handleClear = useCallback(() => {
    setBasePayload('');
    setEncodings(new Set());
    setInjectionContext('');
    setEncodedOutput('');
  }, []);

  return {
    // State
    activeCategory,
    setActiveCategory,
    basePayload,
    setBasePayload,
    encodings,
    injectionContext,
    setInjectionContext,
    encodedOutput,
    // Derived
    filteredPayloads,
    // Handlers
    toggleEncoding,
    handleSelectPayload,
    handleCopy,
    handleClear,
  };
}
