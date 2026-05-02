import { useState, useCallback } from 'react';
import {
  AttackConfig,
  AttackMode,
  PayloadType,
  PayloadProcessingStep,
  createDefaultAttackConfig,
} from '../types';

export function useBruteForceConfig() {
  const [config, setConfig] = useState<AttackConfig>(createDefaultAttackConfig());

  const updateConfig = useCallback((updates: Partial<AttackConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  }, []);

  const updatePayloadConfig = useCallback((updates: Partial<AttackConfig['payload_config']>) => {
    setConfig((prev) => ({
      ...prev,
      payload_config: { ...prev.payload_config, ...updates },
    }));
  }, []);

  const updateAttackMode = useCallback((mode: AttackMode) => {
    updateConfig({ mode });
  }, [updateConfig]);

  const updatePayloadType = useCallback((payload_type: PayloadType) => {
    updatePayloadConfig({ payload_type });
  }, [updatePayloadConfig]);

  const updatePayloadValues = useCallback((values: string[]) => {
    updatePayloadConfig({ values });
  }, [updatePayloadConfig]);

  const updateNumberRange = useCallback((updates: { number_start?: number; number_end?: number; number_step?: number; number_format?: string }) => {
    updatePayloadConfig(updates);
  }, [updatePayloadConfig]);

  const addProcessingStep = useCallback((step: PayloadProcessingStep) => {
    setConfig((prev) => ({
      ...prev,
      payload_config: {
        ...prev.payload_config,
        processing: [...prev.payload_config.processing, step],
      },
    }));
  }, []);

  const removeProcessingStep = useCallback((index: number) => {
    setConfig((prev) => ({
      ...prev,
      payload_config: {
        ...prev.payload_config,
        processing: prev.payload_config.processing.filter((_, i) => i !== index),
      },
    }));
  }, []);

  const updateGrepMatch = useCallback((enabled: boolean, keyword?: string, case_sensitive?: boolean) => {
    setConfig((prev) => ({
      ...prev,
      grep_match: {
        ...prev.grep_match,
        enabled,
        ...(keyword !== undefined && { keyword }),
        ...(case_sensitive !== undefined && { case_sensitive }),
      },
    }));
  }, []);

  const updateGrepExtract = useCallback((enabled: boolean, regex?: string, replacement?: string) => {
    setConfig((prev) => ({
      ...prev,
      grep_extract: {
        ...prev.grep_extract,
        enabled,
        ...(regex !== undefined && { regex }),
        ...(replacement !== undefined && { replacement }),
      },
    }));
  }, []);

  const updateSessionHandling = useCallback((enabled: boolean, extract_token_name?: string, update_header_name?: string) => {
    setConfig((prev) => ({
      ...prev,
      session_handling: {
        ...prev.session_handling,
        enabled,
        ...(extract_token_name !== undefined && { extract_token_name }),
        ...(update_header_name !== undefined && { update_header_name }),
      },
    }));
  }, []);

  const setBaseRequest = useCallback((base_request: AttackConfig['base_request']) => {
    updateConfig({ base_request });
  }, [updateConfig]);

  return {
    config,
    setConfig,
    updateConfig,
    updatePayloadConfig,
    updateAttackMode,
    updatePayloadType,
    updatePayloadValues,
    updateNumberRange,
    addProcessingStep,
    removeProcessingStep,
    updateGrepMatch,
    updateGrepExtract,
    updateSessionHandling,
    setBaseRequest,
  };
}