import { runChat } from './chat/agent.mjs';
import { runCrawl } from './crawl.mjs';
import { runInvokerAutoMark } from './invoker/auto-mark.mjs';
import { runRegression } from './regression.mjs';
import { getApiKeyEnvName } from './ai/provider.mjs';

export async function runCli() {
  const mode = process.env['0XBUFFER_AI_ENGINE_MODE'] || 'crawl';
  const provider = process.env.XBUFFER_AI_PROVIDER || 'deepseek';
  const apiKeyEnv = getApiKeyEnvName(provider);
  const hasKey = !!process.env[apiKeyEnv]?.trim();

  const keyStatus = hasKey
    ? `${apiKeyEnv} set (${process.env[apiKeyEnv].trim().length} chars)`
    : `${apiKeyEnv} missing`;
  process.stderr.write(`[ai-engine] mode=${mode} provider=${provider} model=${process.env['0XBUFFER_AI_MODEL'] || 'default'} ${keyStatus}\n`);

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
  await runCrawl();
}
