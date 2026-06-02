#!/usr/bin/env node

import { randomUUID } from 'node:crypto';
import { ToolLoopAgent, stepCountIs, tool } from 'ai';
import { deepseek } from '@ai-sdk/deepseek';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

const DANGEROUS_PATTERNS = [
  '/logout',
  '/signout',
  '/delete',
  '/remove',
  '/destroy',
  '/payment',
  '/billing',
  '/checkout',
];

function emit(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

function log(sessionId, level, type, message, url) {
  emit({
    type: 'log_created',
    id: randomUUID(),
    sessionId,
    level,
    logType: type,
    message,
    url,
    createdAt: new Date().toISOString(),
  });
}

function getApiKeyEnvName(provider) {
  return provider === 'openai' ? 'OPENAI_API_KEY' : 'DEEPSEEK_API_KEY';
}

function getApiKey(provider) {
  const envName = getApiKeyEnvName(provider);
  const key = process.env[envName];
  if (!key || !key.trim()) {
    throw new Error(`No ${provider === 'openai' ? 'OpenAI' : 'DeepSeek'} API key found (env ${envName} is empty)`);
  }
  return key.trim();
}

function providerModel() {
  const provider = process.env.APPRECON_AI_PROVIDER || 'deepseek';
  const model = process.env.APPRECON_AI_MODEL || 'deepseek-chat';

  if (provider === 'openai') {
    getApiKey(provider); // validates key exists
    return openai(model);
  }

  if (provider === 'deepseek') {
    getApiKey(provider); // validates key exists
    return deepseek(model);
  }

  throw new Error(`Unsupported AI SDK agent provider: ${provider}`);
}

function normalizeUrl(value) {
  try {
    const url = new URL(value);
    url.hash = '';
    return url.toString().replace(/\/$/, '/');
  } catch {
    return null;
  }
}

function shouldBlockUrl(url, config, visited, depth) {
  const parsed = new URL(url);
  const target = new URL(config.targetUrl);
  const pathname = parsed.pathname.toLowerCase();
  const excludes = String(config.excludePaths || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  if (visited.has(url)) return 'duplicate';
  if (depth > config.maxDepth) return 'max-depth';
  if (config.sameDomainOnly && parsed.hostname !== target.hostname) return 'outside-scope';
  if (DANGEROUS_PATTERNS.some((pattern) => pathname.includes(pattern))) return 'dangerous-url';
  if (excludes.some((pattern) => pathname.includes(pattern.replace(/\*/g, '')))) return 'excluded-path';

  return null;
}

function extractLinksFromHtml(html, baseUrl) {
  const links = [];
  const anchorPattern = /<a\b[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gis;
  for (const match of html.matchAll(anchorPattern)) {
    try {
      const href = normalizeUrl(new URL(match[1], baseUrl).toString());
      if (href) {
        links.push({
          href,
          text: match[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
        });
      }
    } catch {
      // Ignore malformed hrefs.
    }
  }
  return links;
}

function extractFormsFromHtml(html) {
  const forms = [];
  const formPattern = /<form\b([^>]*)>(.*?)<\/form>/gis;
  for (const formMatch of html.matchAll(formPattern)) {
    const attrs = formMatch[1];
    const body = formMatch[2];
    const action = attrs.match(/\baction=["']([^"']+)["']/i)?.[1];
    const method = attrs.match(/\bmethod=["']([^"']+)["']/i)?.[1] || 'get';
    const fields = [];
    const inputPattern = /<(input|textarea|select)\b([^>]*)>/gis;
    for (const inputMatch of body.matchAll(inputPattern)) {
      const inputAttrs = inputMatch[2];
      fields.push({
        name: inputAttrs.match(/\bname=["']([^"']+)["']/i)?.[1],
        type: inputAttrs.match(/\btype=["']([^"']+)["']/i)?.[1] || inputMatch[1].toLowerCase(),
        placeholder: inputAttrs.match(/\bplaceholder=["']([^"']+)["']/i)?.[1],
      });
    }
    forms.push({ action, method, fields });
  }
  return forms;
}

function extractButtonsFromHtml(html) {
  return [...html.matchAll(/<button\b[^>]*>(.*?)<\/button>/gis)]
    .map((match) => match[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function extractScriptsFromHtml(html, baseUrl) {
  return [...html.matchAll(/<script\b[^>]*src=["']([^"']+)["'][^>]*>/gis)]
    .map((match) => {
      try {
        return new URL(match[1], baseUrl).toString();
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function extractTitle(html) {
  return html.match(/<title[^>]*>(.*?)<\/title>/is)?.[1]?.replace(/\s+/g, ' ').trim() || '';
}

function extractVisibleText(html) {
  return html
    .replace(/<script\b[^>]*>.*?<\/script>/gis, ' ')
    .replace(/<style\b[^>]*>.*?<\/style>/gis, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchExtract(url, config) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs || 30000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
    });
    const html = await response.text();
    return {
      url,
      finalUrl: normalizeUrl(response.url) || url,
      title: extractTitle(html),
      httpStatus: response.status,
      visibleText: extractVisibleText(html),
      links: extractLinksFromHtml(html, response.url),
      forms: extractFormsFromHtml(html),
      buttons: extractButtonsFromHtml(html),
      scripts: extractScriptsFromHtml(html, response.url),
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function playwrightExtract(url, config) {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ headless: true });
  try {
    const proxyPort = process.env.APPRECON_PROXY_PORT || '8888';
    const context = await browser.newContext({
      ignoreHTTPSErrors: true,
      proxy: { server: `http://127.0.0.1:${proxyPort}` },
    });
    const page = await context.newPage();

    // Wait for the page to fully load including all JS-triggered network
    // requests (XHR, fetch, dynamic script loads). 'networkidle' waits
    // until there are zero network connections for at least 500ms, which
    // captures API calls that SPA frameworks make after initial render.
    const response = await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: config.timeoutMs || 30000,
    });

    // Extra settle time: some SPAs fire additional API calls after the
    // first networkidle (e.g. client-side routing, lazy hydration, or
    // analytics beacons). A short pause lets those requests flow through
    // the proxy so they show up in traffic history.
    const settleMs = config.networkSettleMs || 2000;
    await page.waitForTimeout(settleMs);

    const extract = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href]')).map((anchor) => ({
        href: anchor.href,
        text: anchor.textContent?.trim() || '',
      }));
      const forms = Array.from(document.querySelectorAll('form')).map((form) => ({
        action: form.getAttribute('action') || undefined,
        method: form.getAttribute('method') || 'get',
        fields: Array.from(form.querySelectorAll('input, textarea, select')).map((field) => ({
          name: field.getAttribute('name') || undefined,
          type: field.getAttribute('type') || field.tagName.toLowerCase(),
          placeholder: field.getAttribute('placeholder') || undefined,
        })),
      }));
      const buttons = Array.from(document.querySelectorAll('button'))
        .map((button) => button.textContent?.trim() || '')
        .filter(Boolean);
      const scripts = Array.from(document.querySelectorAll('script[src]')).map((script) => script.src);
      return {
        title: document.title,
        visibleText: document.body?.innerText || '',
        links,
        forms,
        buttons,
        scripts,
      };
    });

    return {
      url,
      finalUrl: normalizeUrl(page.url()) || url,
      httpStatus: response?.status(),
      ...extract,
    };
  } finally {
    await browser.close();
  }
}

function restrictedGate(extract) {
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

function heuristicAnalyze(extract) {
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

async function analyzeWithAgent(extract, sessionId) {
  const fallback = heuristicAnalyze(extract);
  const provider = process.env.APPRECON_AI_PROVIDER || 'deepseek';
  const apiKeyEnv = getApiKeyEnvName(provider);
  const hasKey = !!process.env[apiKeyEnv]?.trim();

  if (!hasKey || !['deepseek', 'openai'].includes(provider)) {
    log(sessionId, 'warning', 'ai', `${provider === 'openai' ? 'OpenAI' : 'DeepSeek'} AI agent unavailable (${apiKeyEnv} ${hasKey ? 'set' : 'missing'}, provider=${provider}); using deterministic page analysis.`, extract.finalUrl);
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
    id: 'apprecon-crawl-advisor',
    model: providerModel(),
    instructions: [
      'You are AppRecon crawl advisor.',
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
    log(sessionId, 'warning', 'ai', `AI agent analysis unavailable; using deterministic analysis: ${error.message}`, extract.finalUrl);
    return fallback;
  }

  const finalAnalysis = state.finalAnalysis || fallback;
  return {
    ...finalAnalysis,
    insights: state.insightDrafts.length > 0 ? state.insightDrafts : finalAnalysis.insights,
    prioritizedUrls: state.prioritizedUrls.length > 0 ? state.prioritizedUrls : finalAnalysis.prioritizedUrls,
    humanInputRequest: state.humanInputRequest,
  };
}

function toChatMessages(messages) {
  return messages
    .filter((message) => ['user', 'assistant', 'system'].includes(message.role) && message.content?.trim())
    .map((message) => ({
      role: message.role,
      content: message.content,
    }));
}

async function runChat() {
  const request = JSON.parse(process.env.APPRECON_AI_CHAT_REQUEST_JSON || '{"messages":[]}');
  const context = JSON.parse(process.env.APPRECON_AI_CONTEXT_JSON || '{}');
  const provider = process.env.APPRECON_AI_PROVIDER || 'deepseek';
  const model = process.env.APPRECON_AI_MODEL || 'deepseek-chat';
  emit({ type: 'chat_started', provider, model, createdAt: new Date().toISOString() });

  try {
    const agent = new ToolLoopAgent({
      id: 'apprecon-chat-agent',
      model: providerModel(),
      instructions: [
        'You are AppRecon AI chat assistant.',
        'Be concise, practical, and focused on web security reconnaissance.',
        'Use read-only AppRecon context tools when they help answer the user.',
        'Do not claim you performed scans or actions that are not present in context.',
      ].join('\n'),
      stopWhen: stepCountIs(6),
      tools: {
        listCrawlSessions: tool({
          description: 'List recent AI browser crawl sessions available in context.',
          inputSchema: z.object({}),
          execute: async () => context.crawlSessions || [],
        }),
        getCrawlContext: tool({
          description: 'Read crawl pages, insights, and logs from the latest crawl context.',
          inputSchema: z.object({
            sessionId: z.string().optional(),
          }),
          execute: async ({ sessionId }) => {
            const targetId = sessionId || context.latestCrawl?.session?.id;
            if (!targetId || context.latestCrawl?.session?.id !== targetId) {
              return { session: null, pages: [], insights: [], logs: [] };
            }
            return context.latestCrawl;
          },
        }),
        getProxySummary: tool({
          description: 'Read recent HTTP proxy summary context.',
          inputSchema: z.object({}),
          execute: async () => context.proxySummary || [],
        }),
        getRecentInsights: tool({
          description: 'Read recent reconnaissance insights.',
          inputSchema: z.object({}),
          execute: async () => context.latestCrawl?.insights || [],
        }),
      },
    });
    const result = await agent.stream({
      messages: toChatMessages(request.messages),
    });

    let content = '';
    for await (const delta of result.textStream) {
      content += delta;
      emit({ type: 'chat_delta', delta });
    }
    emit({
      type: 'chat_finished',
      provider,
      model,
      content,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    emit({
      type: 'chat_failed',
      provider,
      model,
      message: error.message,
      createdAt: new Date().toISOString(),
    });
    process.exitCode = 1;
  }
}

async function runCrawl() {
  const sessionId = process.env.APPRECON_CRAWL_SESSION_ID;
  const config = JSON.parse(process.env.APPRECON_CRAWL_CONFIG_JSON || '{}');
  if (!sessionId || !config.targetUrl) {
    throw new Error('Missing APPRECON_CRAWL_SESSION_ID or APPRECON_CRAWL_CONFIG_JSON.targetUrl');
  }

  const queue = [{ url: normalizeUrl(config.targetUrl), depth: 0, parentUrl: undefined, discoveredBy: 'seed' }]
    .filter((item) => item.url);
  const visited = new Set();
  const enqueued = new Set(queue.map((item) => item.url));

  log(sessionId, 'info', 'session', 'AI SDK agent crawl started (BFS)', config.targetUrl);

  while (queue.length > 0 && visited.size < config.maxPages) {
    const item = queue.shift();
    const blockReason = shouldBlockUrl(item.url, config, visited, item.depth);
    if (blockReason) {
      log(sessionId, 'warning', 'policy', `Blocked ${item.url}: ${blockReason}`, item.url);
      continue;
    }

    const pageId = randomUUID();
    emit({
      type: 'page_discovered',
      id: pageId,
      sessionId,
      url: item.url,
      parentUrl: item.parentUrl,
      depth: item.depth,
      discoveredAt: new Date().toISOString(),
    });
    visited.add(item.url);

    try {
      const extract = process.env.APPRECON_USE_FETCH_CRAWLER === '1'
        ? await fetchExtract(item.url, config)
        : await playwrightExtract(item.url, config);
      const analysis = heuristicAnalyze(extract);
      emit({
        type: 'page_visited',
        id: pageId,
        sessionId,
        url: extract.finalUrl,
        title: extract.title,
        httpStatus: extract.httpStatus,
        linksFound: extract.links.length,
        formsFound: extract.forms.length,
        status: (extract.httpStatus || 0) >= 500 ? 'error' : (extract.httpStatus || 0) >= 400 ? 'blocked' : 'visited',
        visitedAt: new Date().toISOString(),
        aiSummary: analysis.summary,
        interesting: analysis.interesting,
      });
      log(sessionId, 'info', 'navigation', `Visited ${extract.finalUrl}`, extract.finalUrl);

      for (const insight of analysis.insights || []) {
        emit({
          type: 'insight_created',
          id: randomUUID(),
          sessionId,
          pageId,
          url: extract.finalUrl,
          severity: insight.severity,
          insightType: insight.type,
          title: insight.title,
          description: insight.description,
          createdAt: new Date().toISOString(),
        });
      }

      const candidates = [...new Set(
        [...extract.links, ...(analysis.prioritizedUrls || [])]
          .map((entry) => normalizeUrl(entry.href || entry.url))
          .filter(Boolean)
      )];
      for (const candidate of candidates) {
        if (!enqueued.has(candidate) && !shouldBlockUrl(candidate, config, visited, item.depth + 1)) {
          enqueued.add(candidate);
          queue.push({ url: candidate, depth: item.depth + 1, parentUrl: extract.finalUrl, discoveredBy: 'link' });
        }
      }

      const gate = analysis.humanInputRequest || restrictedGate(extract);
      if (gate) {
        emit({
          type: 'human_input_requested',
          id: randomUUID(),
          sessionId,
          pageId,
          url: extract.finalUrl,
          reason: gate.reason,
          requestedFields: [...new Set(gate.requestedFields || [])],
          safeActions: gate.safeActions?.length ? gate.safeActions : ['continue', 'skip-branch', 'stop-crawl'],
          createdAt: new Date().toISOString(),
        });
        log(sessionId, 'warning', 'policy', `Skipped restricted page ${extract.finalUrl}: ${gate.reason}`, extract.finalUrl);
        continue;
      }
    } catch (error) {
      emit({
        type: 'page_visited',
        id: pageId,
        sessionId,
        url: item.url,
        title: '',
        httpStatus: undefined,
        linksFound: 0,
        formsFound: 0,
        status: 'error',
        visitedAt: new Date().toISOString(),
        aiSummary: `Crawl failed: ${error.message}`,
        interesting: false,
      });
      log(sessionId, 'error', 'error', `Failed to crawl ${item.url}: ${error.message}`, item.url);
    }

    if (config.requestDelayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, Math.min(config.requestDelayMs, 3000)));
    }
  }

  emit({ type: 'session_finished', sessionId, finishedAt: new Date().toISOString() });
}

export async function runCli() {
  const mode = process.env.APPRECON_AI_ENGINE_MODE || 'crawl';
  const provider = process.env.APPRECON_AI_PROVIDER || 'deepseek';
  const apiKeyEnv = getApiKeyEnvName(provider);
  const hasKey = !!process.env[apiKeyEnv]?.trim();

  // Startup diagnostic — helps verify key injection without leaking secrets.
  const keyStatus = hasKey
    ? `${apiKeyEnv} set (${process.env[apiKeyEnv].trim().length} chars)`
    : `${apiKeyEnv} missing`;
  process.stderr.write(`[ai-engine] mode=${mode} provider=${provider} model=${process.env.APPRECON_AI_MODEL || 'default'} ${keyStatus}\n`);

  if (mode === 'chat') {
    await runChat();
    return;
  }
  await runCrawl();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runCli().catch((error) => {
    emit({ type: 'session_failed', message: error.message, createdAt: new Date().toISOString() });
    process.exitCode = 1;
  });
}
