import { z } from 'zod';

import { log } from '../events.mjs';
import { withRetry } from '../retry.mjs';
import { createAgent, createToolContext } from '../ai/adapter.mjs';
import { getApiKeyEnvName } from '../ai/provider.mjs';
import { runRedactionWorkflow } from '../privacy/redaction.mjs';

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

function validateDefinitionOfDone(agentState, sessionId, url) {
  const issues = [];

  if (!agentState.pageContextRead) {
    issues.push('agent did not read page context');
  }

  const hasFinalInsights = agentState.finalAnalysis?.insights?.length > 0;
  const hasDraftInsights = agentState.insightDrafts.length > 0;
  const hasFinalSummary = !!agentState.finalAnalysis?.summary?.trim();

  if (!agentState.finalAnalysis && !hasDraftInsights) {
    issues.push('agent produced no analysis — no final analysis and no insight drafts');
  }

  if (agentState.finalAnalysis && !hasFinalInsights && !hasFinalSummary) {
    issues.push('agent finished analysis but produced no insights and no summary');
  }

  if (issues.length > 0) {
    log(sessionId, 'warning', 'ai', `AI analysis Definition of Done not met: ${issues.join('; ')}`, url, {
      aiUsedForAnalysis: true,
      layer: 'verification-feedback',
      dodIssues: issues,
      pageContextRead: agentState.pageContextRead,
      draftInsightCount: agentState.insightDrafts.length,
      finalInsightCount: agentState.finalAnalysis?.insights?.length || 0,
      hasFinalSummary,
    });
  }

  return issues;
}

export async function analyzeWithAgent(extract, baseline, sessionId) {
  const provider = process.env.XBUFFER_AI_PROVIDER || 'deepseek';
  const apiKeyEnv = getApiKeyEnvName(provider);
  const hasKey = !!process.env[apiKeyEnv]?.trim();

  if (!hasKey || !['deepseek', 'openai'].includes(provider)) {
    log(sessionId, 'warning', 'ai', `${provider === 'openai' ? 'OpenAI' : 'DeepSeek'} AI agent unavailable (${apiKeyEnv} ${hasKey ? 'set' : 'missing'}, provider=${provider}); using deterministic page analysis.`, extract.finalUrl, {
      aiUsedForAnalysis: false,
    });
    return baseline;
  }

  let redactedContext;
  try {
    const redaction = runRedactionWorkflow({
      ...buildProviderPageContext(extract),
      heuristicInsights: baseline.insights.map((insight) => ({
        type: insight.type,
        title: insight.title,
        severity: insight.severity,
        description: insight.description,
        analysisToolId: insight.analysisToolId,
      })),
      heuristicPrioritizedUrls: baseline.prioritizedUrls.slice(0, 10),
    });
    redactedContext = redaction.redactedValue;
    log(sessionId, 'info', 'ai', 'Prepared redacted AI analysis context with heuristic baseline', redactedContext.url, {
      aiUsedForAnalysis: true,
      aiRedaction: redaction.report,
      heuristicInsightCount: baseline.insights.length,
    });
  } catch (error) {
    log(sessionId, 'warning', 'ai', `AI redaction failed; using deterministic analysis: ${error.message}`, extract.finalUrl, {
      aiUsedForAnalysis: false,
    });
    return baseline;
  }

  let agentState = {
    pageContextRead: false,
    insightDrafts: [],
    prioritizedUrls: [],
    finalAnalysis: null,
    humanInputRequest: null,
  };

  const toolContext = createToolContext();

  const createCrawlAgent = () => createAgent({
    id: '0xbuffer-crawl-advisor',
    instructions: [
      'You are 0xbuffer crawl advisor.',
      'Analyze pages for reconnaissance only.',
      'A deterministic heuristic engine has already analyzed this page. You will receive its findings as baseline context.',
      'Build on the heuristic findings: add deeper reasoning, surface issues regex cannot catch, refine severity, or identify subtle indicators.',
      'Do not duplicate heuristic insights unless you can add meaningful context or correction.',
      'Consider OWASP Top 10:2025 web application categories and OWASP API Security Top 10:2023 categories when labeling review candidates.',
      'Phrase OWASP findings as indicators or review candidates, not confirmed vulnerabilities, unless the extracted page context proves the issue.',
      'Never submit forms, credentials, payments, uploads, deletes, or other destructive actions.',
      'Use tools to read page context, create insights, prioritize URLs, request human input when needed, then finish analysis.',
    ].join('\n'),
    ctx: toolContext,
    maxSteps: 6,
    tools: {
      readPageContext: {
        description: 'Read the redacted extracted page context.',
        inputSchema: z.object({}),
        execute: async () => {
          agentState.pageContextRead = true;
          return redactedContext;
        },
      },
      createInsight: {
        description: 'Draft one reconnaissance insight. Build on heuristic baseline findings with deeper analysis.',
        inputSchema: z.object({
          severity: z.enum(['info', 'low', 'medium', 'high', 'critical']),
          type: z.string(),
          title: z.string(),
          description: z.string(),
        }),
        execute: async (input) => {
          agentState.insightDrafts.push(input);
          return { stored: true };
        },
      },
      prioritizeUrls: {
        description: 'Prioritize safe URLs for deterministic crawler enqueueing.',
        inputSchema: z.object({
          urls: z.array(z.object({
            url: z.string(),
            reason: z.string(),
            priorityScore: z.number().min(0).max(100),
          })),
        }),
        execute: async ({ urls }) => {
          agentState.prioritizedUrls = urls;
          return { accepted: urls.length };
        },
      },
      requestHumanInput: {
        description: 'Request human input for restricted credential, MFA, upload, payment, or destructive workflows.',
        inputSchema: z.object({
          reason: z.string(),
          requestedFields: z.array(z.string()),
          safeActions: z.array(z.enum(['continue', 'skip-branch', 'stop-crawl'])),
        }),
        execute: async (input) => {
          agentState.humanInputRequest = input;
          return { requested: true };
        },
      },
      finishAnalysis: {
        description: 'Return the final page analysis.',
        inputSchema: analysisSchema(),
        execute: async (input) => {
          agentState.finalAnalysis = input;
          return { finished: true };
        },
      },
    },
  });

  try {
    await withRetry(async () => {
      agentState = {
        pageContextRead: false,
        insightDrafts: [],
        prioritizedUrls: [],
        finalAnalysis: null,
        humanInputRequest: null,
      };
      const agent = createCrawlAgent();
      const baselineSummary = redactedContext.heuristicInsights?.length > 0
        ? redactedContext.heuristicInsights.map((i) => `- [${i.severity}] ${i.title}: ${i.description}`).join('\n')
        : '(no heuristic insights found)';
      await agent.generate({
        prompt: [
          'Analyze the current page using the available tools.',
          `URL: ${redactedContext.url}`,
          `Title: ${redactedContext.title}`,
          `HTTP status: ${redactedContext.httpStatus || 'unknown'}`,
          '',
          'Heuristic baseline findings:',
          baselineSummary,
          '',
          'Build on these findings with deeper analysis. Add new insights the heuristic engine could not detect.',
        ].join('\n'),
      });
    }, { maxAttempts: 3, name: 'analyzeWithAgent' });
  } catch (error) {
    log(sessionId, 'warning', 'ai', `AI agent analysis unavailable after retries; using deterministic analysis: ${error.message}`, extract.finalUrl, {
      aiUsedForAnalysis: false,
      layer: 'verification-feedback',
    });
    return baseline;
  }

  const dodIssues = validateDefinitionOfDone(agentState, sessionId, extract.finalUrl);

  const heuristicInsights = baseline.insights.map((insight) => ({
    ...insight,
    analysisSource: 'default',
  }));
  const aiInsights = (agentState.insightDrafts.length > 0 ? agentState.insightDrafts : (agentState.finalAnalysis?.insights || []))
    .map((insight) => ({
      ...insight,
      analysisSource: 'ai',
    }));

  const finalAnalysis = agentState.finalAnalysis || baseline;
  const aiActuallyContributed = agentState.insightDrafts.length > 0
    || (agentState.finalAnalysis && agentState.finalAnalysis !== baseline);
  const aiUsedForAnalysis = aiActuallyContributed && dodIssues.length === 0;

  return {
    ...finalAnalysis,
    analysisSource: aiUsedForAnalysis ? 'ai' : 'default',
    aiUsedForAnalysis,
    summary: finalAnalysis.summary || baseline.summary,
    interesting: true,
    insights: [...heuristicInsights, ...aiInsights],
    prioritizedUrls: agentState.prioritizedUrls.length > 0 ? agentState.prioritizedUrls : baseline.prioritizedUrls,
    humanInputRequest: agentState.humanInputRequest,
  };
}
