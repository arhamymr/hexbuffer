import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import type { JwtMode, JwtAlgorithm, JwtDecoded, JwtVulnerability } from '../types';
import {
  decodeJwt,
  checkVulnerabilities,
  signJwt,
} from '../lib/jwt-helpers';
import { useJwtStore } from '@/stores/jwt-store';

export type { JwtMode } from '../types';

export function useJwtPage() {
  // ── Persisted state (Zustand store) ────────────────
  const mode = useJwtStore((s) => s.mode);
  const setMode = useJwtStore((s) => s.setMode);
  const tokenInput = useJwtStore((s) => s.tokenInput);
  const setTokenInput = useJwtStore((s) => s.setTokenInput);
  const genHeader = useJwtStore((s) => s.genHeader);
  const setGenHeader = useJwtStore((s) => s.setGenHeader);
  const genPayload = useJwtStore((s) => s.genPayload);
  const setGenPayload = useJwtStore((s) => s.setGenPayload);
  const genSecret = useJwtStore((s) => s.genSecret);
  const setGenSecret = useJwtStore((s) => s.setGenSecret);
  const genAlgorithm = useJwtStore((s) => s.genAlgorithm);
  const setGenAlgorithm = useJwtStore((s) => s.setGenAlgorithm);
  const generatedToken = useJwtStore((s) => s.generatedToken);
  const setGeneratedToken = useJwtStore((s) => s.setGeneratedToken);
  const clearDecode = useJwtStore((s) => s.clearDecode);
  const clearGenerate = useJwtStore((s) => s.clearGenerate);

  // ── Derived / ephemeral state (local useState) ──────
  const [decoded, setDecoded] = useState<JwtDecoded | null>(null);
  const [vulnerabilities, setVulnerabilities] = useState<JwtVulnerability[]>([]);
  const [decodeError, setDecodeError] = useState<string | null>(null);
  const [genError, setGenError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  // ── Auto-decode on input change ─────────────────────
  useEffect(() => {
    if (!tokenInput.trim()) {
      setDecoded(null);
      setVulnerabilities([]);
      setDecodeError(null);
      return;
    }
    const result = decodeJwt(tokenInput);
    if (result) {
      setDecoded(result);
      setVulnerabilities(checkVulnerabilities(result));
      setDecodeError(null);
    } else {
      setDecoded(null);
      setVulnerabilities([]);
      setDecodeError('Invalid JWT format. Expected three base64url-encoded parts separated by dots.');
    }
  }, [tokenInput]);

  // ── Generate ────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    setGenError(null);
    setGenerating(true);
    try {
      let headerObj: Record<string, unknown>;
      let payloadObj: Record<string, unknown>;
      try {
        headerObj = JSON.parse(genHeader);
      } catch {
        setGenError('Invalid JSON in header field');
        setGenerating(false);
        return;
      }
      try {
        payloadObj = JSON.parse(genPayload);
      } catch {
        setGenError('Invalid JSON in payload field');
        setGenerating(false);
        return;
      }
      if (!genSecret) {
        setGenError('Secret key is required');
        setGenerating(false);
        return;
      }
      headerObj.alg = genAlgorithm;
      const token = await signJwt(headerObj, payloadObj, genSecret, genAlgorithm);
      setGeneratedToken(token);
    } catch (e) {
      setGenError(`Signing failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setGenerating(false);
    }
  }, [genHeader, genPayload, genSecret, genAlgorithm]);

  // ── Actions ─────────────────────────────────────────
  const handleCopy = useCallback(async (text: string) => {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  }, []);

  const handleClear = useCallback(() => {
    clearDecode();
    setDecoded(null);
    setVulnerabilities([]);
    setDecodeError(null);
  }, [clearDecode]);

  const handleClearGenerate = useCallback(() => {
    clearGenerate();
    setGenError(null);
  }, [clearGenerate]);

  return {
    // Mode
    mode,
    setMode,
    // Decode
    tokenInput,
    setTokenInput,
    decoded,
    vulnerabilities,
    decodeError,
    // Generate
    genHeader,
    setGenHeader,
    genPayload,
    setGenPayload,
    genSecret,
    setGenSecret,
    genAlgorithm,
    setGenAlgorithm,
    generatedToken,
    setGeneratedToken,
    genError,
    generating,
    // Actions
    handleGenerate,
    handleCopy,
    handleClear,
    handleClearGenerate,
  };
}
