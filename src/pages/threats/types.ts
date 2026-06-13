export type ThreatAnalysisStatus = 'running' | 'completed' | 'failed' | 'cancelled';

export interface ThreatSettings {
  ghidraHeadlessPath?: string;
  yaraRulePacks: YaraRulePack[];
}

export interface YaraRulePack {
  id: string;
  name: string;
  path: string;
  enabled: boolean;
  importedAt: string;
}

export interface GhidraValidationResult {
  valid: boolean;
  message: string;
  path: string;
}

export interface ThreatSample {
  id: string;
  fileName: string;
  originalPath: string;
  storedPath: string;
  size: number;
  sha256: string;
  createdAt: string;
  updatedAt: string;
}

export interface ThreatAnalysisOptions {
  runGhidra: boolean;
  yaraRulesPath?: string;
  enabledYaraRulePaths?: string[];
}

export interface ThreatAnalysisRun {
  id: string;
  sampleId: string;
  status: ThreatAnalysisStatus;
  startedAt: string;
  finishedAt?: string;
  error?: string;
  logs: string[];
}

export interface ThreatAnalysisLogEvent {
  sampleId: string;
  runId: string;
  message: string;
  timestamp: string;
}

export interface ThreatAnalysisResult {
  sample: ThreatSample;
  latestRun?: ThreatAnalysisRun;
  artifacts: ThreatArtifacts;
}

export interface ThreatArtifacts {
  metadata?: BinaryMetadata;
  hashes?: FileHashes;
  strings: ExtractedString[];
  imports: BinarySymbol[];
  exports: BinarySymbol[];
  entropy?: EntropyReport;
  yara: YaraMatch[];
  functions: GhidraFunction[];
  decompiled: GhidraDecompiledFunction[];
  callGraph?: GhidraCallGraph;
}

export interface FileHashes {
  md5: string;
  sha1: string;
  sha256: string;
}

export interface BinaryMetadata {
  fileType: string;
  architecture?: string;
  endian?: string;
  entryPoint?: string;
  compiler?: string;
  sections: BinarySection[];
}

export interface BinarySection {
  name: string;
  address: string;
  size: number;
  entropy: number;
}

export interface BinarySymbol {
  name: string;
  library?: string;
  address?: string;
  ordinal?: number;
}

export interface ExtractedString {
  value: string;
  offset: number;
  length: number;
  encoding: string;
}

export interface EntropyReport {
  fileEntropy: number;
  sections: BinarySection[];
}

export interface YaraMatch {
  rule: string;
  namespace?: string;
  rulePack?: string;
  tags: string[];
  meta: unknown;
}

export interface GhidraFunction {
  id: string;
  address: string;
  name: string;
  signature?: string;
  size?: number;
  namespace?: string;
  references: string[];
}

export interface GhidraDecompiledFunction {
  functionId: string;
  address: string;
  name: string;
  code: string;
  warnings: string[];
}

export interface GhidraCallGraph {
  nodes: GhidraCallGraphNode[];
  edges: GhidraCallGraphEdge[];
}

export interface GhidraCallGraphNode {
  id: string;
  address: string;
  label: string;
}

export interface GhidraCallGraphEdge {
  id: string;
  source: string;
  target: string;
}
