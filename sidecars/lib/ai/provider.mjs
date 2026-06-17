import { deepseek } from '@ai-sdk/deepseek';
import { openai } from '@ai-sdk/openai';

export function getApiKeyEnvName(provider) {
  return provider === 'openai' ? 'OPENAI_API_KEY' : 'DEEPSEEK_API_KEY';
}

export function getApiKey(provider) {
  const envName = getApiKeyEnvName(provider);
  const key = process.env[envName];
  if (!key || !key.trim()) {
    throw new Error(`No ${provider === 'openai' ? 'OpenAI' : 'DeepSeek'} API key found (env ${envName} is empty)`);
  }
  return key.trim();
}

export function isAiProviderAvailable() {
  const provider = process.env.XBUFFER_AI_PROVIDER || 'deepseek';
  if (!['deepseek', 'openai'].includes(provider)) return false;
  const apiKeyEnv = getApiKeyEnvName(provider);
  return !!process.env[apiKeyEnv]?.trim();
}

export function providerModel() {
  const provider = process.env.XBUFFER_AI_PROVIDER || 'deepseek';
  const model = process.env['HEXBUFFER_AI_MODEL'] || 'deepseek-chat';
  const temperature = parseFloat(process.env['HEXBUFFER_AI_TEMPERATURE'] || '0.2');

  if (provider === 'openai') {
    getApiKey(provider);
    return openai(model, { temperature });
  }

  if (provider === 'deepseek') {
    getApiKey(provider);
    return deepseek(model, { temperature });
  }

  throw new Error(`Unsupported AI SDK agent provider: ${provider}`);
}
