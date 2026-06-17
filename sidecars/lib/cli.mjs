import { runChat } from './chat/agent.mjs';
import { runCrawl } from './crawl.mjs';
import { runInvokerAutoMark } from './invoker/auto-mark.mjs';
import { runRegression } from './regression.mjs';
import { scrapePageStructure } from './regression/scraper.mjs';
import { runSingleStep } from './regression/executor.mjs';
import { testStepSchema } from './regression/types.mjs';
import { getApiKeyEnvName } from './ai/provider.mjs';
import { emit } from './events.mjs';

export async function runCli() {
  const mode = process.env['HEXBUFFER_AI_ENGINE_MODE'] || 'crawl';
  const provider = process.env.XBUFFER_AI_PROVIDER || 'deepseek';
  const apiKeyEnv = getApiKeyEnvName(provider);
  const hasKey = !!process.env[apiKeyEnv]?.trim();

  const keyStatus = hasKey
    ? `${apiKeyEnv} set (${process.env[apiKeyEnv].trim().length} chars)`
    : `${apiKeyEnv} missing`;
  process.stderr.write(`[ai-engine] mode=${mode} provider=${provider} model=${process.env['HEXBUFFER_AI_MODEL'] || 'default'} ${keyStatus}\n`);

  if (mode === 'chat') {
    await runChat();
    return;
  }
  if (mode === 'invoker-auto-mark') {
    await runInvokerAutoMark();
    return;
  }
  if (mode === 'regression') {
    await runRegression();
    return;
  }
  if (mode === 'scrape-page') {
    const targetUrl = process.env['HEXBUFFER_SCRAPE_TARGET_URL'];
    if (!targetUrl) {
      emit({
        type: 'scrape:failed',
        error: '[task-specification] Missing HEXBUFFER_SCRAPE_TARGET_URL',
        createdAt: new Date().toISOString(),
      });
      process.exitCode = 1;
      return;
    }
    try {
      const result = await scrapePageStructure(targetUrl);
      emit({
        type: 'scrape:result',
        data: result,
        createdAt: new Date().toISOString(),
      });
    } catch (error) {
      emit({
        type: 'scrape:failed',
        error: error.message,
        createdAt: new Date().toISOString(),
      });
      process.exitCode = 1;
    }
    return;
  }
  if (mode === 'regression-single-step') {
    const stepJson = process.env['HEXBUFFER_REGRESSION_STEP_JSON'];
    const targetUrl = process.env['HEXBUFFER_REGRESSION_TARGET_URL'] || '';

    if (!stepJson) {
      emit({
        type: 'step:failed',
        error: '[task-specification] Missing HEXBUFFER_REGRESSION_STEP_JSON',
        createdAt: new Date().toISOString(),
      });
      process.exitCode = 1;
      return;
    }

    try {
      const stepData = JSON.parse(stepJson);
      const step = testStepSchema.parse(stepData);

      const result = await runSingleStep(step, targetUrl, null);

      emit({
        type: 'step:result',
        data: result,
        createdAt: new Date().toISOString(),
      });
    } catch (error) {
      emit({
        type: 'step:failed',
        error: error.message,
        createdAt: new Date().toISOString(),
      });
      process.exitCode = 1;
    }
    return;
  }
  await runCrawl();
}
