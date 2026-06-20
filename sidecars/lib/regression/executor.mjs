import { randomUUID } from 'node:crypto';
import { chromium } from 'playwright';

import { emit, log } from '../events.mjs';
import { testCaseSchema, stepResultSchema } from './types.mjs';
import { verifyWithAI } from './ai-verifier.mjs';

/**
 * Execute a single regression test step using Playwright.
 * Emits events for each step start/complete/fail so the Tauri backend
 * can relay them to the frontend in real time.
 */
export async function runRegressionSteps(testCase, runId, artifactDir, sessionId) {
  const steps = testCase.steps;
  const results = [];
  let browser;
  let context;
  let page;
  let aiVerdict = null;

  log(runId, 'info', 'regression', `Starting regression test "${testCase.name}"`, testCase.targetUrl);
  log(runId, 'info', 'regression', `Test case has ${steps.length} step(s)`);

  emit({
    type: 'regression:test_started',
    testCaseId: testCase.id,
    runId,
    targetUrl: testCase.targetUrl,
    stepCount: steps.length,
    startedAt: new Date().toISOString(),
  });

  try {
    log(runId, 'info', 'regression', 'Launching Playwright Chromium browser', testCase.targetUrl);
    browser = await chromium.launch({ headless: true });
    log(runId, 'info', 'regression', 'Browser launched successfully');

    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      ignoreHTTPSErrors: true,
    });

    page = await context.newPage();
    log(runId, 'info', 'regression', 'Browser context and page created');

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const stepStartedAt = Date.now();

      log(runId, 'info', 'regression', `Step ${i + 1}/${steps.length}: ${step.kind}`, page.url());

      emit({
        type: 'regression:step_started',
        runId,
        stepIndex: i,
        kind: step.kind,
        startedAt: new Date(stepStartedAt).toISOString(),
      });

      try {
        const executeResult = await executeStep(page, step, i, runId, artifactDir, sessionId);
        let screenshotPath = null;
        if (executeResult && typeof executeResult === 'object') {
          if (executeResult.screenshotPath) screenshotPath = executeResult.screenshotPath;
          if (executeResult.aiVerdict) {
            aiVerdict = executeResult.aiVerdict;
          }
        } else if (typeof executeResult === 'string') {
          screenshotPath = executeResult;
        }
        const durationMs = Date.now() - stepStartedAt;

        log(runId, 'info', 'regression', `Step ${i + 1} passed (${durationMs}ms)`, page.url());

        const result = {
          stepIndex: i,
          kind: step.kind,
          status: 'passed',
          error: null,
          screenshotPath,
          durationMs,
          startedAt: new Date(stepStartedAt).toISOString(),
          finishedAt: new Date().toISOString(),
        };
        results.push(result);

        emit({
          type: 'regression:step_completed',
          runId,
          stepIndex: i,
          kind: step.kind,
          durationMs,
          screenshotPath,
          finishedAt: result.finishedAt,
        });
      } catch (error) {
        if (page && page.aiVerdict) {
          aiVerdict = page.aiVerdict;
        }
        const durationMs = Date.now() - stepStartedAt;

        log(runId, 'error', 'regression', `Step ${i + 1} failed: ${error.message}`, page.url());

        let screenshotPath = null;
        try {
          screenshotPath = await takeScreenshot(page, `step-${i}-error`, artifactDir);
          log(runId, 'info', 'regression', `Error screenshot captured: ${screenshotPath}`);
        } catch { /* screenshot best-effort */ }

        const result = {
          stepIndex: i,
          kind: step.kind,
          status: 'failed',
          error: error.message,
          screenshotPath,
          durationMs,
          startedAt: new Date(stepStartedAt).toISOString(),
          finishedAt: new Date().toISOString(),
        };
        results.push(result);

        emit({
          type: 'regression:step_failed',
          runId,
          stepIndex: i,
          kind: step.kind,
          error: error.message,
          screenshotPath,
          finishedAt: result.finishedAt,
        });

        // Stop on first failure for deterministic results
        break;
      }
    }
  } finally {
    if (browser) {
      log(runId, 'info', 'regression', 'Closing Playwright browser');
      await browser.close().catch(() => {});
      log(runId, 'info', 'regression', 'Browser closed');
    }
  }

  const passedCount = results.filter((r) => r.status === 'passed').length;
  const failedCount = results.filter((r) => r.status === 'failed').length;
  log(runId, 'info', 'regression', `Test completed: ${passedCount} passed, ${failedCount} failed out of ${results.length} step(s)`);

  return { results, aiVerdict };
}

/**
 * Execute a single regression test step independently.
 * Used by the UI for per-step "Run Step" execution.
 * For navigate steps, navigates to step.value directly.
 * For all other steps, first navigates to targetUrl, then executes the step.
 */
export async function runSingleStep(step, targetUrl, artifactDir) {
  const runId = randomUUID();
  const stepStartedAt = Date.now();
  let browser;

  try {
    log(runId, 'info', 'regression', `Running single step: ${step.kind}`, targetUrl);
    browser = await chromium.launch({ headless: true });
    log(runId, 'info', 'regression', 'Browser launched for single step');

    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      ignoreHTTPSErrors: true,
    });
    const page = await context.newPage();

    // For non-navigate steps, navigate to targetUrl first
    if (step.kind !== 'navigate') {
      if (!targetUrl) {
        throw new Error('targetUrl is required for non-navigate steps');
      }
      log(runId, 'info', 'navigation', `Navigating to ${targetUrl}`, targetUrl);
      await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 30000 });
      log(runId, 'info', 'navigation', 'Navigation completed', page.url());
    }

    const executeResult = await executeStep(page, step, 0, runId, artifactDir, runId);
    let screenshotPath = null;
    if (executeResult && typeof executeResult === 'object') {
      if (executeResult.screenshotPath) screenshotPath = executeResult.screenshotPath;
    } else if (typeof executeResult === 'string') {
      screenshotPath = executeResult;
    }
    const durationMs = Date.now() - stepStartedAt;

    log(runId, 'info', 'regression', `Single step passed (${durationMs}ms)`, page.url());

    return {
      stepIndex: 0,
      kind: step.kind,
      status: 'passed',
      error: null,
      screenshotPath,
      durationMs,
      startedAt: new Date(stepStartedAt).toISOString(),
      finishedAt: new Date().toISOString(),
    };
  } catch (error) {
    const durationMs = Date.now() - stepStartedAt;
    log(runId, 'error', 'regression', `Single step failed: ${error.message}`);

    return {
      stepIndex: 0,
      kind: step.kind,
      status: 'failed',
      error: error.message,
      screenshotPath: null,
      durationMs,
      startedAt: new Date(stepStartedAt).toISOString(),
      finishedAt: new Date().toISOString(),
    };
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
      log(runId, 'info', 'regression', 'Browser closed after single step');
    }
  }
}

async function executeStep(page, step, stepIndex, runId, artifactDir, sessionId) {
  switch (step.kind) {
    case 'navigate': {
      if (!step.value) throw new Error('navigate step requires a URL');
      log(runId, 'info', 'navigation', `Navigating to ${step.value}`, step.value);
      const response = await page.goto(step.value, { waitUntil: 'networkidle', timeout: 30000 });
      log(runId, 'info', 'navigation', `Navigation completed — status ${response?.status() || 'unknown'}`, page.url());
      return null;
    }
    case 'click': {
      if (!step.selector) throw new Error('click step requires a selector');
      log(runId, 'info', 'action', `Clicking "${step.selector}"`, page.url());
      await page.click(step.selector, { timeout: 5000 });
      log(runId, 'info', 'action', `Clicked "${step.selector}" successfully`, page.url());
      return null;
    }
    case 'fill': {
      if (!step.selector) throw new Error('fill step requires a selector');
      if (step.value === undefined) throw new Error('fill step requires a value');
      log(runId, 'info', 'action', `Filling "${step.selector}" with "${step.value}"`, page.url());
      await page.fill(step.selector, step.value, { timeout: 5000 });
      log(runId, 'info', 'action', `Filled "${step.selector}" successfully`, page.url());
      return null;
    }
    case 'wait': {
      const ms = step.ms || 1000;
      log(runId, 'info', 'action', `Waiting ${ms}ms`, page.url());
      await page.waitForTimeout(ms);
      log(runId, 'info', 'action', `Wait completed (${ms}ms)`, page.url());
      return null;
    }
    case 'screenshot': {
      const name = step.name || `step-${stepIndex}`;
      log(runId, 'info', 'action', `Taking screenshot "${name}"`, page.url());
      const path = await takeScreenshot(page, name, artifactDir);
      log(runId, 'info', 'action', `Screenshot saved: ${path || '(no artifact dir)'}`, page.url());
      return path;
    }
    case 'assert-visible': {
      if (!step.selector) throw new Error('assert-visible step requires a selector');
      log(runId, 'info', 'assertion', `Asserting element "${step.selector}" is visible`, page.url());
      await page.waitForSelector(step.selector, { state: 'visible', timeout: 10000 });
      log(runId, 'info', 'assertion', `Element "${step.selector}" is visible — assertion passed`, page.url());
      emit({
        type: 'regression:assertion_passed',
        runId,
        stepIndex,
        kind: 'assert-visible',
        description: `Element "${step.selector}" is visible`,
      });
      return null;
    }
    case 'assert-text': {
      if (!step.value) throw new Error('assert-text step requires expected text');
      log(runId, 'info', 'assertion', `Asserting text "${step.value}" is present`, page.url());
      try {
        await page.getByText(step.value).first().waitFor({ state: 'visible', timeout: 10000 });
        log(runId, 'info', 'assertion', `Text "${step.value}" found — assertion passed`, page.url());
        emit({
          type: 'regression:assertion_passed',
          runId,
          stepIndex,
          kind: 'assert-text',
          description: `Text "${step.value}" found`,
        });
      } catch {
        log(runId, 'error', 'assertion', `Text "${step.value}" not found on page`, page.url());
        emit({
          type: 'regression:assertion_failed',
          runId,
          stepIndex,
          kind: 'assert-text',
          description: `Text "${step.value}" not found`,
          expected: step.value,
          actual: '(not found)',
        });
        throw new Error(`Text "${step.value}" not found on page`);
      }
      return null;
    }
    case 'assert-url': {
      if (!step.pattern) throw new Error('assert-url step requires a pattern');
      log(runId, 'info', 'assertion', `Asserting URL matches pattern "${step.pattern}"`, page.url());
      try {
        await page.waitForURL(step.pattern, { timeout: 10000 });
        log(runId, 'info', 'assertion', `URL matches "${step.pattern}" — assertion passed`, page.url());
        emit({
          type: 'regression:assertion_passed',
          runId,
          stepIndex,
          kind: 'assert-url',
          description: `URL matches pattern "${step.pattern}"`,
        });
      } catch {
        const currentUrl = page.url();
        log(runId, 'error', 'assertion', `URL "${currentUrl}" does not match "${step.pattern}"`, page.url());
        emit({
          type: 'regression:assertion_failed',
          runId,
          stepIndex,
          kind: 'assert-url',
          description: `URL does not match pattern "${step.pattern}"`,
          expected: step.pattern,
          actual: currentUrl,
        });
        throw new Error(`URL "${currentUrl}" does not match pattern "${step.pattern}"`);
      }
      return null;
    }
    case 'ai-verify': {
      if (!step.prompt) throw new Error('ai-verify step requires a prompt');
      log(runId, 'info', 'regression', `Running AI verification: "${step.prompt}"`, page.url());
      const verdict = await verifyWithAI(page, step.prompt, runId, sessionId);
      if (!verdict) {
        throw new Error('AI verification skipped or failed to run (AI provider might be unavailable).');
      }
      page.aiVerdict = verdict;
      if (!verdict.pass) {
        log(runId, 'error', 'regression', `AI verification failed: ${verdict.reasoning}`, page.url());
        emit({
          type: 'regression:assertion_failed',
          runId,
          stepIndex,
          kind: 'ai-verify',
          description: `AI verification failed: ${verdict.reasoning}`,
          expected: step.prompt,
          actual: `Failed: ${verdict.reasoning}. Suggestions: ${verdict.suggestions.join(', ')}`,
        });
        throw new Error(`AI verification failed: ${verdict.reasoning}`);
      }
      log(runId, 'info', 'regression', `AI verification passed: ${verdict.reasoning}`, page.url());
      emit({
        type: 'regression:assertion_passed',
        runId,
        stepIndex,
        kind: 'ai-verify',
        description: `AI verification passed: ${verdict.reasoning}`,
      });
      return { aiVerdict: verdict };
    }
    default:
      throw new Error(`Unknown step kind: ${step.kind}`);
  }
}

async function takeScreenshot(page, name, artifactDir) {
  if (!artifactDir) return null;
  const fs = await import('node:fs/promises');
  await fs.mkdir(artifactDir, { recursive: true });
  const filename = `${name.replace(/[^a-zA-Z0-9_-]/g, '_')}.png`;
  const filepath = `${artifactDir}/${filename}`;
  await page.screenshot({ path: filepath, fullPage: true });
  return filepath;
}
