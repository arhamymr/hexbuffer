// Regression test case step types — discriminated union of all supported step kinds.
// Mirrored in the sidecar Zod schemas (sidecars/lib/regression/types.mjs).

export type StepKind =
  | 'navigate'
  | 'click'
  | 'fill'
  | 'wait'
  | 'screenshot'
  | 'assert-visible'
  | 'assert-text'
  | 'assert-url'
  | 'ai-verify';

export interface TestStep {
  kind: StepKind;
  /** CSS / text selector for click/fill/assert steps */
  selector?: string;
  /** Fill value for 'fill' step, URL for 'navigate', text for 'assert-text' */
  value?: string;
  /** Wait duration in milliseconds */
  ms?: number;
  /** Screenshot name (saved to artifact dir) */
  name?: string;
  /** Natural-language prompt for ai-verify step */
  prompt?: string;
  /** URL pattern for assert-url (string match or regex) */
  pattern?: string;
}

export interface TestCase {
  id: string;
  name: string;
  description: string;
  targetUrl: string;
  steps: TestStep[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export type RunStatus = 'queued' | 'running' | 'passed' | 'failed' | 'aborted';

export type StepResultStatus = 'pending' | 'running' | 'passed' | 'failed' | 'skipped';

export interface StepResult {
  stepIndex: number;
  kind: StepKind;
  status: StepResultStatus;
  error: string | null;
  screenshotPath: string | null;
  durationMs: number;
  startedAt: string | null;
  finishedAt: string | null;
}

export interface AiVerdict {
  pass: boolean;
  reasoning: string;
  suggestions: string[];
}

export interface TestRun {
  id: string;
  testCaseId: string;
  status: RunStatus;
  stepResults: StepResult[];
  aiVerdict: AiVerdict | null;
  startedAt: string | null;
  finishedAt: string | null;
  error: string | null;
  createdAt: string;
}

/** Serialized form of a TestRun for DB reads (stepResults/aiVerdict are JSON). */
export interface TestRunRecord {
  id: string;
  testCaseId: string;
  status: RunStatus;
  stepResultsJson: string;
  aiVerdict: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  error: string | null;
  createdAt: string;
}
