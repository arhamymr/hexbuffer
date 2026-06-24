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
  testName: string;
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

// ── Scraped page structure for AI step generation context ────────────

export interface FormField {
  tagName: string;
  name: string;
  id: string;
  type: string;
  placeholder: string;
  ariaLabel: string;
  autocomplete: string;
  required: boolean;
  disabled: boolean;
}

export interface ButtonInfo {
  text: string;
  id: string;
  className: string;
  tagName: string;
  type: string;
}

export interface LinkInfo {
  text: string;
  href: string;
  id: string;
  className: string;
}

export interface PageStructure {
  title: string;
  url: string;
  finalUrl?: string;
  statusCode?: number | null;
  forms: FormField[];
  buttons: ButtonInfo[];
  links: LinkInfo[];
  headings: string[];
  textContent: string;
}

// ── Regression log entries for the Playwright log panel ──────────────

export interface RegressionLogEntry {
  id: string;
  runId: string;
  level: 'info' | 'warning' | 'error';
  logType: string;
  message: string;
  url?: string;
  createdAt: string;
}
