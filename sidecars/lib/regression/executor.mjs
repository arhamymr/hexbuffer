import { randomUUID } from 'node:crypto';
import { chromium } from 'playwright';

import { emit, log } from '../events.mjs';
import { testCaseSchema, stepResultSchema } from './types.mjs';

/**
 * Execute a single regression test step using Playwright.
 * Emits events for each step start/complete/fail so the Tauri backend
 * can relay them to the frontend in real time.
 */
export async function runRegressionSteps(testCase, runId, artifactDir) {
  const steps = testCase.steps;
  const results = [];
  let browser;
  let context;
  let page;

  emit({
    type: 'regression:test_started',
    testCaseId: testCase.id,
    runId,
    targetUrl: testCase.targetUrl,
    stepCount: steps.length,
    startedAt: new Date().toISOString(),
  });

  try {
    browser = await chromium.launch({ headless: true });
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      ignoreHTTPSErrors: true,
    });
    page = await context.newPage();

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const stepStartedAt = Date.now();

      emit({
        type: 'regression:step_started',
        runId,
        stepIndex: i,
        kind: step.kind,
        startedAt: new Date(stepStartedAt).toISOString(),
      });

      try {
        const screenshotPath = await executeStep(page, step, i, runId, artifactDir);
        const durationMs = Date.now() - stepStartedAt;

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
        const durationMs = Date.now() - stepStartedAt;
        let screenshotPath = null;
        try {
          screenshotPath = await takeScreenshot(page, `step-${i}-error`, artifactDir);
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
      await browser.close().catch(() => {});
    }
  }

  return results;
}

async function executeStep(page, step, stepIndex, runId, artifactDir) {
  switch (step.kind) {
    case 'navigate': {
      if (!step.value) throw new Error('navigate step requires a URL');
      await page.goto(step.value, { waitUntil: 'networkidle', timeout: 30000 });
      return null;
    }
    case 'click': {
      if (!step.selector) throw new Error('click step requires a selector');
      await page.click(step.selector, { timeout: 5000 });
      return null;
    }
    case 'fill': {
      if (!step.selector) throw new Error('fill step requires a selector');
      if (step.value === undefined) throw new Error('fill step requires a value');
      await page.fill(step.selector, step.value, { timeout: 5000 });
      return null;
    }
    case 'wait': {
      const ms = step.ms || 1000;
      await page.waitForTimeout(ms);
      return null;
    }
    case 'screenshot': {
      const name = step.name || `step-${stepIndex}`;
      return await takeScreenshot(page, name, artifactDir);
    }
    case 'assert-visible': {
      if (!step.selector) throw new Error('assert-visible step requires a selector');
      await page.waitForSelector(step.selector, { state: 'visible', timeout: 10000 });
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
      try {
        await page.getByText(step.value).first().waitFor({ state: 'visible', timeout: 10000 });
        emit({
          type: 'regression:assertion_passed',
          runId,
          stepIndex,
          kind: 'assert-text',
          description: `Text "${step.value}" found`,
        });
      } catch {
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
      try {
        await page.waitForURL(step.pattern, { timeout: 10000 });
        emit({
          type: 'regression:assertion_passed',
          runId,
          stepIndex,
          kind: 'assert-url',
          description: `URL matches pattern "${step.pattern}"`,
        });
      } catch {
        const currentUrl = page.url();
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
      // ai-verify is handled separately by the ai-verifier after all steps
      return null;
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
