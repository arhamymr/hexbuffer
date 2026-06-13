import { z } from 'zod';

// Mirrors src/pages/regression/types.ts — kept in sync manually.
// Used for runtime validation of test case config received from the Tauri backend.

export const stepKindSchema = z.enum([
  'navigate',
  'click',
  'fill',
  'wait',
  'screenshot',
  'assert-visible',
  'assert-text',
  'assert-url',
  'ai-verify',
]);

export const testStepSchema = z.object({
  kind: stepKindSchema,
  selector: z.string().optional(),
  value: z.string().optional(),
  ms: z.number().int().positive().optional(),
  name: z.string().optional(),
  prompt: z.string().optional(),
  pattern: z.string().optional(),
});

export const testCaseSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string().default(''),
  targetUrl: z.string().url(),
  steps: z.array(testStepSchema).min(1, 'At least one step is required'),
  enabled: z.boolean().default(true),
  createdAt: z.string().default(() => new Date().toISOString()),
  updatedAt: z.string().default(() => new Date().toISOString()),
});

export const stepResultStatusSchema = z.enum(['pending', 'running', 'passed', 'failed', 'skipped']);

export const stepResultSchema = z.object({
  stepIndex: z.number().int().min(0),
  kind: stepKindSchema,
  status: stepResultStatusSchema,
  error: z.string().nullable().default(null),
  screenshotPath: z.string().nullable().default(null),
  durationMs: z.number().int().min(0).default(0),
  startedAt: z.string().nullable().default(null),
  finishedAt: z.string().nullable().default(null),
});

export const runStatusSchema = z.enum(['queued', 'running', 'passed', 'failed', 'aborted']);

export const testRunSchema = z.object({
  id: z.string(),
  testCaseId: z.string(),
  status: runStatusSchema,
  stepResults: z.array(stepResultSchema).default([]),
  startedAt: z.string().nullable().default(null),
  finishedAt: z.string().nullable().default(null),
  error: z.string().nullable().default(null),
  createdAt: z.string().default(() => new Date().toISOString()),
});

/** Event types emitted on stdout by the regression runner. */
export const regressionEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('regression:test_started'), testCaseId: z.string(), runId: z.string(), targetUrl: z.string(), stepCount: z.number(), startedAt: z.string() }),
  z.object({ type: z.literal('regression:step_started'), runId: z.string(), stepIndex: z.number(), kind: stepKindSchema, startedAt: z.string() }),
  z.object({ type: z.literal('regression:step_completed'), runId: z.string(), stepIndex: z.number(), kind: stepKindSchema, durationMs: z.number(), screenshotPath: z.string().nullable(), finishedAt: z.string() }),
  z.object({ type: z.literal('regression:step_failed'), runId: z.string(), stepIndex: z.number(), kind: stepKindSchema, error: z.string(), screenshotPath: z.string().nullable(), finishedAt: z.string() }),
  z.object({ type: z.literal('regression:assertion_passed'), runId: z.string(), stepIndex: z.number(), kind: stepKindSchema, description: z.string() }),
  z.object({ type: z.literal('regression:assertion_failed'), runId: z.string(), stepIndex: z.number(), kind: stepKindSchema, description: z.string(), expected: z.string(), actual: z.string() }),
  z.object({ type: z.literal('regression:test_finished'), runId: z.string(), status: runStatusSchema, passedSteps: z.number(), failedSteps: z.number(), totalSteps: z.number(), aiVerdict: z.object({ pass: z.boolean(), reasoning: z.string(), suggestions: z.array(z.string()) }).nullable(), finishedAt: z.string() }),
  z.object({ type: z.literal('regression:test_failed'), runId: z.string(), error: z.string(), finishedAt: z.string() }),
]);
