import { ToolLoopAgent, stepCountIs, tool } from 'ai';
import { z } from 'zod';

import { log } from './events.mjs';
import { getApiKeyEnvName, providerModel } from './provider.mjs';

export function restrictedGate(extract) {
  const lowerUrl = extract.finalUrl.toLowerCase();
  const lowerText = extract.visibleText.toLowerCase();
  const fields = extract.forms.flatMap((form) => form.fields);
  const hasPassword = fields.some((field) => field.type?.toLowerCase() === 'password');
  const hasOtp = fields.some((field) => /otp|mfa|2fa|token|code/i.test(`${field.name || ''} ${field.placeholder || ''}`));
  const hasUpload = fields.some((field) => field.type?.toLowerCase() === 'file');
  const isPayment = /payment|checkout/.test(lowerUrl) || /card number|checkout/.test(lowerText);

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

  return null;
}

export function heuristicAnalyze(extract) {
  const lowerUrl = extract.finalUrl.toLowerCase();
  const lowerText = extract.visibleText.toLowerCase();
  const hasPassword = extract.forms.some((form) =>
    form.fields.some((field) => field.type?.toLowerCase() === 'password')
  );
  const hasUpload = extract.forms.some((form) =>
    form.fields.some((field) => field.type?.toLowerCase() === 'file')
  );
  const insights = [];

  if (hasPassword || lowerUrl.includes('login') || lowerText.includes('sign in')) {
    insights.push({
      severity: 'info',
      type: 'login-form',
      title: 'Login page detected',
      description: 'The page contains authentication indicators or password fields.',
    });
  }
  if (lowerUrl.includes('admin')) {
    insights.push({
      severity: 'medium',
      type: 'admin-route',
      title: 'Admin route discovered',
      description: 'The crawler discovered a URL that appears to expose an admin route.',
    });
  }
  if (hasUpload) {
    insights.push({
      severity: 'medium',
      type: 'upload-form',
      title: 'Upload form detected',
      description: 'The page contains a file input and should be reviewed for upload handling.',
    });
  }
  if ((extract.httpStatus || 0) >= 400) {
    insights.push({
      severity: extract.httpStatus >= 500 ? 'low' : 'info',
      type: 'error-page',
      title: 'Error page detected',
      description: `The page returned HTTP ${extract.httpStatus}.`,
    });
  }

  return {
    summary: extract.title || extract.visibleText.slice(0, 180) || 'No page summary available.',
    aiUsedForAnalysis: false,
    interesting: insights.length > 0,
    priorityScore: insights.length > 0 ? 80 : 40,
    insights,
    prioritizedUrls: extract.links.slice(0, 20).map((link) => ({
      url: link.href,
      reason: link.text || 'Linked page',
      priorityScore: /login|admin|dashboard|api|upload/i.test(link.href) ? 85 : 40,
    })),
  };
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
      'Never submit forms, credentials, payments, uploads, deletes, or other destructive actions.',
      'Use tools to read page context, create insights, prioritize URLs, request human input when needed, then finish analysis.',
    ].join('\n'),
    stopWhen: stepCountIs(6),
    tools: {
      readPageContext: tool({
        description: 'Read the extracted page context.',
        inputSchema: z.object({}),
        execute: async () => {
          state.pageContextRead = true;
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
        `URL: ${extract.finalUrl}`,
        `Title: ${extract.title}`,
        `HTTP status: ${extract.httpStatus || 'unknown'}`,
      ].join('\n'),
    });
  } catch (error) {
    log(sessionId, 'warning', 'ai', `AI agent analysis unavailable; using deterministic analysis: ${error.message}`, extract.finalUrl, {
      aiUsedForAnalysis: false,
    });
    return fallback;
  }

  const finalAnalysis = state.finalAnalysis || fallback;
  return {
    ...finalAnalysis,
    aiUsedForAnalysis: true,
    insights: state.insightDrafts.length > 0 ? state.insightDrafts : finalAnalysis.insights,
    prioritizedUrls: state.prioritizedUrls.length > 0 ? state.prioritizedUrls : finalAnalysis.prioritizedUrls,
    humanInputRequest: state.humanInputRequest,
  };
}
