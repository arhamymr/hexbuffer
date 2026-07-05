#!/usr/bin/env node

// Suppress AI SDK warnings from leaking into stdout JSON-line protocol
process.env.AI_SDK_LOG_WARNINGS = 'false';
globalThis.AI_SDK_LOG_WARNINGS = false;

/**
 * hexbuffer AI Engine Sidecar — Harness Contract
 *
 * Spawned by the Tauri app. Reads configuration from environment variables
 * and communicates results via JSON lines on stdout.
 *
 * ## Modes
 * - `crawl` (default): Browser automation BFS crawl with AI analysis
 * - `chat`: Interactive AI chat agent
 * - `invoker-auto-mark`: AI-assisted Invoker marker suggestion
 * - `regression`: Browser-based regression test runner with Playwright + AI verification
 * - `scrape-page`: Scrape a target page's DOM structure for AI step generation
 * - `regression-single-step`: Run a single regression step via Playwright
 * - `validate`: Dry-run that checks all prerequisites without executing
 *
 * ## Definition of Done
 * - crawl: Emits `session_finished` after queue exhausted or maxPages reached
 * - chat: Emits `session_finished` when chat loop exits
 * - validate: Exits 0 if all checks pass, non-zero with diagnostics otherwise
 *
 * ## Required Environment Variables
 * - HEXBUFFER_AI_ENGINE_MODE: 'crawl' | 'chat' | 'invoker-auto-mark' | 'regression' | 'validate'
 * - HEXBUFFER_CRAWL_SESSION_ID (crawl mode): Session identifier
 * - HEXBUFFER_CRAWL_CONFIG_JSON (crawl mode): JSON crawl configuration
 * - XBUFFER_AI_PROVIDER: 'deepseek' | 'openai'
 * - OPENAI_API_KEY or DEEPSEEK_API_KEY: depending on provider
 *
 * ## Failure Attribution Layers
 * 1. task-specification: Missing or malformed env vars / config
 * 2. execution-environment: Missing deps, wrong Node version
 * 3. context-provision: Missing API keys when AI is needed
 * 4. verification-feedback: Runtime errors during crawl/chat
 */

import { runCli } from './lib/cli.mjs';
import { emit } from './lib/events.mjs';

export { runCli };

// ---------------------------------------------------------------------------
// Pre-flight validation (Harness Layers 1–3)
// ---------------------------------------------------------------------------

const VALID_MODES = ['crawl', 'chat', 'invoker-auto-mark', 'validate', 'regression', 'scrape-page', 'regression-single-step', 'audit'];

function runPreflight() {
  const mode = process.env['HEXBUFFER_AI_ENGINE_MODE'] || 'crawl';
  const checks = [];

  // ── Layer 1: Task Specification ──────────────────────────────────────

  if (!VALID_MODES.includes(mode)) {
    checks.push({
      layer: 'task-specification',
      message: `Invalid mode "${mode}". Must be one of: ${VALID_MODES.join(', ')}`,
      fix: 'Set HEXBUFFER_AI_ENGINE_MODE to a valid value',
    });
  }

  if (mode === 'crawl') {
    const sessionId = process.env['HEXBUFFER_CRAWL_SESSION_ID'];
    if (!sessionId) {
      checks.push({
        layer: 'task-specification',
        message: 'Missing required env var: HEXBUFFER_CRAWL_SESSION_ID',
        fix: 'Ensure the Tauri backend sets HEXBUFFER_CRAWL_SESSION_ID before spawning',
      });
    }

    const rawConfig = process.env['HEXBUFFER_CRAWL_CONFIG_JSON'] || '{}';
    try {
      const config = JSON.parse(rawConfig);
      if (!config.targetUrl) {
        checks.push({
          layer: 'task-specification',
          message: 'HEXBUFFER_CRAWL_CONFIG_JSON missing required field: targetUrl',
          fix: 'Include targetUrl in the crawl config JSON',
        });
      }
    } catch {
      checks.push({
        layer: 'task-specification',
        message: 'HEXBUFFER_CRAWL_CONFIG_JSON is not valid JSON',
        fix: 'Ensure the config is serialized as valid JSON before spawning the sidecar',
      });
    }
  }

  if (mode === 'regression') {
    const rawConfig = process.env['HEXBUFFER_REGRESSION_CONFIG_JSON'];
    if (!rawConfig) {
      checks.push({
        layer: 'task-specification',
        message: 'Missing required env var: HEXBUFFER_REGRESSION_CONFIG_JSON',
        fix: 'Ensure the Tauri backend sets HEXBUFFER_REGRESSION_CONFIG_JSON before spawning',
      });
    } else {
      try {
        const config = JSON.parse(rawConfig);
        if (!config.targetUrl) {
          checks.push({
            layer: 'task-specification',
            message: 'HEXBUFFER_REGRESSION_CONFIG_JSON missing required field: targetUrl',
            fix: 'Include targetUrl in the regression config JSON',
          });
        }
        if (!config.steps || config.steps.length === 0) {
          checks.push({
            layer: 'task-specification',
            message: 'HEXBUFFER_REGRESSION_CONFIG_JSON requires at least one step',
            fix: 'Include a non-empty steps array in the regression config JSON',
          });
        }
      } catch {
        checks.push({
          layer: 'task-specification',
          message: 'HEXBUFFER_REGRESSION_CONFIG_JSON is not valid JSON',
          fix: 'Ensure the config is serialized as valid JSON before spawning the sidecar',
        });
      }
    }
  }

  if (mode === 'invoker-auto-mark' && !process.env['HEXBUFFER_INVOKER_RAW_REQUEST']?.trim()) {
    checks.push({
      layer: 'task-specification',
      message: 'Missing required env var: HEXBUFFER_INVOKER_RAW_REQUEST',
      fix: 'Ensure the Tauri backend passes the raw HTTP request before spawning',
    });
  }

  // ── Layer 2: Execution Environment ───────────────────────────────────

  const nodeMajor = Number.parseInt(process.versions.node.split('.')[0], 10);
  if (nodeMajor < 20) {
    checks.push({
      layer: 'execution-environment',
      message: `Node.js v${process.versions.node} is too old. Minimum: v20.x`,
      fix: 'Upgrade Node.js to v20 or later',
    });
  }

  // ── Layer 3: Context Provision (API keys) ────────────────────────────

  const provider = process.env.XBUFFER_AI_PROVIDER || 'deepseek';
  if (!['deepseek', 'openai'].includes(provider)) {
    checks.push({
      layer: 'context-provision',
      message: `Unknown AI provider "${provider}". Supported: deepseek, openai`,
      fix: 'Set XBUFFER_AI_PROVIDER to deepseek or openai',
    });
  } else {
    const apiKeyEnv = provider === 'openai' ? 'OPENAI_API_KEY' : 'DEEPSEEK_API_KEY';
    if (!process.env[apiKeyEnv]?.trim()) {
      checks.push({
        layer: 'context-provision',
        message: `AI provider "${provider}" selected but ${apiKeyEnv} is not set`,
        fix: `Set ${apiKeyEnv} in the environment, or set enableAiInsights: false to skip AI`,
      });
    }
  }

  return { mode, checks };
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

const isMain = 
  (typeof require !== 'undefined' && require.main === module) ||
  (import.meta && import.meta.url === `file://${process.argv[1]}`);

if (isMain) {
  const isValidateMode =
    process.argv.includes('--validate') ||
    process.env['HEXBUFFER_AI_ENGINE_MODE'] === 'validate';

  const { mode, checks } = runPreflight();
  const failures = checks;

  // ── Validate mode: dry-run, report all issues, exit ──────────────────

  if (isValidateMode) {
    if (failures.length === 0) {
      process.stderr.write(`[ai-engine] validate: all checks passed (mode=${mode})\n`);
      process.exit(0);
    }
    process.stderr.write(`[ai-engine] validate: ${failures.length} failure(s):\n`);
    for (const f of failures) {
      process.stderr.write(`  [${f.layer}] ${f.message}\n    → fix: ${f.fix}\n`);
    }
    process.exit(1);
  }

  // ── Normal mode: warn on non-fatal issues, bail on fatal ones ───────

  if (failures.length > 0) {
    process.stderr.write(`[ai-engine] preflight: ${failures.length} warning(s):\n`);
    for (const f of failures) {
      process.stderr.write(`  [${f.layer}] ${f.message}\n`);
    }

    const fatal = failures.filter((f) => f.layer === 'task-specification');
    if (fatal.length > 0) {
      for (const f of fatal) {
        emit({
          type: 'session_failed',
          message: `[${f.layer}] ${f.message}`,
          layer: f.layer,
          fix: f.fix,
          createdAt: new Date().toISOString(),
        });
      }
      process.exit(1);
    }
  }

  runCli().catch((error) => {
    emit({
      type: 'session_failed',
      message: error.message,
      layer: 'verification-feedback',
      createdAt: new Date().toISOString(),
    });
    process.exitCode = 1;
  });
}
