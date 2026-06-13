import { invoke } from '@tauri-apps/api/core';
import type {
  GhidraValidationResult,
  ThreatAnalysisOptions,
  ThreatAnalysisResult,
  ThreatAnalysisRun,
  ThreatSample,
  ThreatSettings,
} from './types';

export function getThreatsSettings() {
  return invoke<ThreatSettings>('get_threats_settings');
}

export function saveThreatsSettings(settings: ThreatSettings) {
  return invoke<ThreatSettings>('save_threats_settings', { settings });
}

export function validateGhidraHeadless(path: string) {
  return invoke<GhidraValidationResult>('validate_ghidra_headless', { path });
}

export function importYaraRulePack(filePath: string) {
  return invoke<ThreatSettings>('import_yara_rule_pack', { filePath });
}

export function updateYaraRulePack(id: string, enabled: boolean) {
  return invoke<ThreatSettings>('update_yara_rule_pack', { pack: { id, enabled } });
}

export function deleteYaraRulePack(packId: string) {
  return invoke<ThreatSettings>('delete_yara_rule_pack', { packId });
}

export function importThreatSample(filePath: string) {
  return invoke<ThreatSample>('import_threat_sample', { filePath });
}

export function listThreatSamples() {
  return invoke<ThreatSample[]>('list_threat_samples');
}

export function startThreatAnalysis(sampleId: string, options: ThreatAnalysisOptions) {
  return invoke<ThreatAnalysisRun>('start_threat_analysis', { sampleId, options });
}

export function getThreatAnalysis(sampleId: string) {
  return invoke<ThreatAnalysisResult | null>('get_threat_analysis', { sampleId });
}

export function deleteThreatSample(sampleId: string) {
  return invoke<{ sampleId: string; deleted: boolean }>('delete_threat_sample', { sampleId });
}

export function cancelThreatAnalysis(sampleId: string) {
  return invoke<void>('cancel_threat_analysis', { sampleId });
}
