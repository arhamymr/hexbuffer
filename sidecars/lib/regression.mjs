import { randomUUID } from 'node:crypto';

import { emit, log } from './events.mjs';
import { testCaseSchema } from './regression/types.mjs';
import { runRegressionSteps } from './regression/executor.mjs';

/**
 * Regression test runner — entry point for the `regression` sidecar mode.
 *
 * Reads test case config from `HEXBUFFER_REGRESSION_CONFIG_JSON` env var,
 * executes Playwright steps, runs AI verification on ai-verify steps,
 * and emits JSON-line events for real-time progress.
 */
export async function runRegression() {
  const rawConfig = process.env['HEXBUFFER_REGRESSION_CONFIG_JSON'];
  if (!rawConfig) {
    emit({
      type: 'regression:test_failed',
      runId: 'unknown',
      error: '[task-specification] Missing HEXBUFFER_REGRESSION_CONFIG_JSON',
      finishedAt: new Date().toISOString(),
    });
    process.exitCode = 1;
    return;
  }

  let config;
  try {
    config = JSON.parse(rawConfig);
  } catch {
    emit({
      type: 'regression:test_failed',
      runId: 'unknown',
      error: '[task-specification] Invalid JSON in HEXBUFFER_REGRESSION_CONFIG_JSON',
      finishedAt: new Date().toISOString(),
    });
    process.exitCode = 1;
    return;
  }

  const parsed = testCaseSchema.safeParse(config);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    emit({
      type: 'regression:test_failed',
      runId: 'unknown',
      error: `[task-specification] Invalid test case config:\n${issues}`,
      finishedAt: new Date().toISOString(),
    });
    process.exitCode = 1;
    return;
  }

  const testCase = parsed.data;
  const runId = randomUUID();
  const sessionId = process.env['HEXBUFFER_REGRESSION_SESSION_ID'] || `regression-${runId.slice(0, 8)}`;
  const artifactDir = process.env['HEXBUFFER_AI_ARTIFACT_DIR'] || null;

  log(sessionId, 'info', 'regression', `Starting regression test "${testCase.name}"`, testCase.targetUrl);

  // Run Playwright steps and inline AI verification
  const { results: stepResults, aiVerdict } = await runRegressionSteps(testCase, runId, artifactDir, sessionId);

  const passedSteps = stepResults.filter((r) => r.status === 'passed').length;
  const failedSteps = stepResults.filter((r) => r.status === 'failed').length;
  const status = failedSteps > 0 ? 'failed' : 'passed';

  emit({
    type: 'regression:test_finished',
    runId,
    status,
    passedSteps,
    failedSteps,
    totalSteps: stepResults.length,
    stepResults,
    aiVerdict,
    finishedAt: new Date().toISOString(),
  });

  log(sessionId, 'info', 'regression',
    `Regression test "${testCase.name}" ${status}: ${passedSteps}/${stepResults.length} passed`,
    testCase.targetUrl,
  );
}
