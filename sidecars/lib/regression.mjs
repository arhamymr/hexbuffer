import { randomUUID } from 'node:crypto';

import { emit, log } from './events.mjs';
import { testCaseSchema } from './regression/types.mjs';
import { runRegressionSteps } from './regression/executor.mjs';
import { verifyWithAI } from './regression/ai-verifier.mjs';

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

  // Run Playwright steps
  const stepResults = await runRegressionSteps(testCase, runId, artifactDir);

  // Run AI verification for any ai-verify steps
  let aiVerdict = null;
  const aiVerifySteps = testCase.steps
    .map((s, i) => ({ step: s, index: i }))
    .filter(({ step }) => step.kind === 'ai-verify' && step.prompt);

  if (aiVerifySteps.length > 0) {
    // We need a browser page for AI verification. Re-open a quick browser.
    const { chromium } = await import('playwright');
    let browser;
    try {
      browser = await chromium.launch({ headless: true });
      const context = await browser.newContext({
        viewport: { width: 1280, height: 720 },
        ignoreHTTPSErrors: true,
      });
      const page = await context.newPage();

      // Navigate to the target URL to capture the final state
      await page.goto(testCase.targetUrl, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});

      // Run the last ai-verify step's prompt as the verification
      const lastAiStep = aiVerifySteps[aiVerifySteps.length - 1];
      aiVerdict = await verifyWithAI(page, lastAiStep.step.prompt, runId, sessionId);
      await browser.close();
    } catch (error) {
      log(sessionId, 'warning', 'regression', `AI verification browser setup failed: ${error.message}`, testCase.targetUrl);
      if (browser) await browser.close().catch(() => {});
    }
  }

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
    aiVerdict,
    finishedAt: new Date().toISOString(),
  });

  log(sessionId, 'info', 'regression',
    `Regression test "${testCase.name}" ${status}: ${passedSteps}/${stepResults.length} passed`,
    testCase.targetUrl,
  );
}
