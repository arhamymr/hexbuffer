import { ToolLoopAgent, stepCountIs, tool } from 'ai';
import { z } from 'zod';

import { log } from '../events.mjs';
import { getApiKeyEnvName, providerModel } from '../provider.mjs';
import { runRedactionWorkflow } from '../privacy/redaction.mjs';
import { heuristicAnalyze } from './default-tools.mjs';

export function restrictedGate(extract) {
  const lowerUrl = extract.finalUrl.toLowerCase();
  const lowerText = extract.visibleText.toLowerCase();
  const fields = extract.forms.flatMap((form) => form.fields);
  const actionableFields = fields.filter((field) => {
    const fieldType = field.type?.toLowerCase();
    return !['hidden', 'submit', 'button', 'reset', 'image'].includes(fieldType || '');
  });
  const hasPassword = fields.some((field) => field.type?.toLowerCase() === 'password');
  const hasOtp = fields.some((field) => /otp|mfa|2fa|token|code/i.test(`${field.name || ''} ${field.placeholder || ''}`));
  const hasUpload = fields.some((field) => field.type?.toLowerCase() === 'file');
  const isPayment = /payment|checkout/.test(lowerUrl) || /card number|checkout/.test(lowerText);

  const requestedFormFields = actionableFields
    .map((field) => field.name || field.placeholder || field.label || field.type || 'form-field')
    .filter(Boolean);

  if (hasPassword || hasOtp || lowerUrl.includes('login') || lowerText.includes('sign in')) {
    const requestedFields = fields
      .filter((field) => {
        const fieldType = field.type?.toLowerCase();
        const fieldLabel = `${field.name || ''} ${field.placeholder || ''}`;
        return fieldType === 'password' || /email|user|otp|mfa|token|code/i.test(fieldLabel);
      })
      .map((field) => field.name || field.placeholder || field.type || 'credential');
    return {
      reason: 'Credential or authentication input is required before the agent can continue safely.',
      requestedFields: requestedFields.length ? requestedFields : ['credential'],
      safeActions: ['continue', 'skip-branch', 'stop-crawl'],
    };
  }
  if (hasUpload) {
    return {
      reason: 'A file upload form requires human review before interacting with the page.',
      requestedFields: fields.filter((field) => field.type === 'file').map((field) => field.name || 'file'),
      safeActions: ['skip-branch', 'stop-crawl'],
    };
  }
  if (isPayment) {
    return {
      reason: 'Payment or billing workflow detected; human approval is required.',
      requestedFields: [],
      safeActions: ['skip-branch', 'stop-crawl'],
    };
  }
  if (extract.forms.length > 0) {
    return {
      reason: 'A form was detected. Human input is required before submitting and crawling the resulting page.',
      requestedFields: requestedFormFields.length ? requestedFormFields : ['form-submit'],
      safeActions: ['continue', 'skip-branch', 'stop-crawl'],
    };
  }

  return null;
}

function analysisSchema() {
  return z.object({
    summary: z.string(),
    interesting: z.boolean(),
    priorityScore: z.number().min(0).max(100),
    insights: z.array(z.object({
      severity: z.enum(['info', 'low', 'medium', 'high', 'critical']),
      type: z.string(),
      title: z.string(),
      description: z.string(),
    })),
    prioritizedUrls: z.array(z.object({
      url: z.string(),
      reason: z.string(),
      priorityScore: z.number().min(0).max(100),
    })),
  });
}

function buildProviderPageContext(extract) {
  return {
    url: extract.finalUrl,
    title: extract.title,
    httpStatus: extract.httpStatus,
    visibleText: extract.visibleText.slice(0, 5000),
    links: extract.links.slice(0, 60),
    forms: extract.forms,
    buttons: extract.buttons,
    scripts: extract.scripts,
  };
}

export async function analyzeWithAgent(extract, sessionId) {
  const fallback = heuristicAnalyze(extract);
  const provider = process.env.XBUFFER_AI_PROVIDER || 'deepseek';
  const apiKeyEnv = getApiKeyEnvName(provider);
  const hasKey = !!process.env[apiKeyEnv]?.trim();

  if (!hasKey || !['deepseek', 'openai'].includes(provider)) {
    log(sessionId, 'warning', 'ai', `${provider === 'openai' ? 'OpenAI' : 'DeepSeek'} AI agent unavailable (${apiKeyEnv} ${hasKey ? 'set' : 'missing'}, provider=${provider}); using deterministic page analysis.`, extract.finalUrl, {
      aiUsedForAnalysis: false,
    });
    return fallback;
  }

  let redactedContext;
  try {
    const redaction = runRedactionWorkflow(buildProviderPageContext(extract));
    redactedContext = redaction.redactedValue;
    log(sessionId, 'info', 'ai', 'Prepared redacted AI analysis context', redactedContext.url, {
      aiUsedForAnalysis: true,
      aiRedaction: redaction.report,
    });
  } catch (error) {
    log(sessionId, 'warning', 'ai', `AI redaction failed; using deterministic analysis: ${error.message}`, extract.finalUrl, {
      aiUsedForAnalysis: false,
    });
    return fallback;
  }

  const state = {
    pageContextRead: false,
    insightDrafts: [],
    prioritizedUrls: [],
    finalAnalysis: null,
    humanInputRequest: null,
  };
  const agent = new ToolLoopAgent({
    id: '0xbuffer-crawl-advisor',
    model: providerModel(),
    instructions: [
      'You are 0xbuffer crawl advisor.',
      'Analyze pages for reconnaissance only.',
      'Consider OWASP Top 10:2025 web application categories and OWASP API Security Top 10:2023 categories when labeling review candidates.',
      'Phrase OWASP findings as indicators or review candidates, not confirmed vulnerabilities, unless the extracted page context proves the issue.',
      'Never submit forms, credentials, payments, uploads, deletes, or other destructive actions.',
      'Use tools to read page context, create insights, prioritize URLs, request human input when needed, then finish analysis.',
    ].join('\n'),
    stopWhen: stepCountIs(6),
    tools: {
      readPageContext: tool({
        description: 'Read the redacted extracted page context.',
        inputSchema: z.object({}),
        execute: async () => {
          state.pageContextRead = true;
          return redactedContext;
        },
      }),
      createInsight: tool({
        description: 'Draft one reconnaissance insight for the current page.',
        inputSchema: z.object({
          severity: z.enum(['info', 'low', 'medium', 'high', 'critical']),
          type: z.string(),
          title: z.string(),
          description: z.string(),
        }),
        execute: async (input) => {
          state.insightDrafts.push(input);
          return { stored: true };
        },
      }),
      prioritizeUrls: tool({
        description: 'Prioritize safe URLs for deterministic crawler enqueueing.',
        inputSchema: z.object({
          urls: z.array(z.object({
            url: z.string(),
            reason: z.string(),
            priorityScore: z.number().min(0).max(100),
          })),
        }),
        execute: async ({ urls }) => {
          state.prioritizedUrls = urls;
          return { accepted: urls.length };
        },
      }),
      requestHumanInput: tool({
        description: 'Request human input for restricted credential, MFA, upload, payment, or destructive workflows.',
        inputSchema: z.object({
          reason: z.string(),
          requestedFields: z.array(z.string()),
          safeActions: z.array(z.enum(['continue', 'skip-branch', 'stop-crawl'])),
        }),
        execute: async (input) => {
          state.humanInputRequest = input;
          return { requested: true };
        },
      }),
      finishAnalysis: tool({
        description: 'Return the final page analysis.',
        inputSchema: analysisSchema(),
        execute: async (input) => {
          state.finalAnalysis = input;
          return { finished: true };
        },
      }),
    },
  });

  try {
    await agent.generate({
      prompt: [
        'Analyze the current page using the available tools.',
        `URL: ${redactedContext.url}`,
        `Title: ${redactedContext.title}`,
        `HTTP status: ${redactedContext.httpStatus || 'unknown'}`,
      ].join('\n'),
    });
  } catch (error) {
    log(sessionId, 'warning', 'ai', `AI agent analysis unavailable; using deterministic analysis: ${error.message}`, extract.finalUrl, {
      aiUsedForAnalysis: false,
    });
    return fallback;
  }

  const finalAnalysis = state.finalAnalysis || fallback;
  const aiInsights = state.insightDrafts.length > 0 ? state.insightDrafts : finalAnalysis.insights;
  return {
    ...finalAnalysis,
    analysisSource: 'ai',
    aiUsedForAnalysis: true,
    insights: aiInsights.map((insight) => ({
      ...insight,
      analysisSource: 'ai',
    })),
    prioritizedUrls: state.prioritizedUrls.length > 0 ? state.prioritizedUrls : finalAnalysis.prioritizedUrls,
    humanInputRequest: state.humanInputRequest,
  };
}
