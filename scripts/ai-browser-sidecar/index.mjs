#!/usr/bin/env node

import { randomUUID } from 'node:crypto';

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
    const response = await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: config.timeoutMs || 30000,
    });
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

async function aiAnalyze(extract) {
  const provider = process.env.APPRECON_AI_PROVIDER || 'deepseek';
  if (provider !== 'deepseek') {
    emit({
      type: 'diagnostic',
      level: 'warning',
      message: `AI browser sidecar supports DeepSeek analysis; Settings provider "${provider}" will use heuristic analysis.`,
    });
    return heuristicAnalyze(extract);
  }

  if (!process.env.DEEPSEEK_API_KEY) {
    emit({
      type: 'diagnostic',
      level: 'warning',
      message: 'No DeepSeek API key found in Settings; using heuristic analyzer.',
    });
    return heuristicAnalyze(extract);
  }

  try {
    const [{ generateObject }, { deepseek }, { z }] = await Promise.all([
      import('ai'),
      import('@ai-sdk/deepseek'),
      import('zod'),
    ]);
    const schema = z.object({
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
    const model = process.env.APPRECON_AI_MODEL || 'deepseek-chat';
    const result = await generateObject({
      model: deepseek(model),
      schema,
      prompt: [
        'Analyze this web page for reconnaissance. Do not suggest destructive actions.',
        `URL: ${extract.finalUrl}`,
        `Title: ${extract.title}`,
        `HTTP Status: ${extract.httpStatus || 'unknown'}`,
        `Visible Text: ${extract.visibleText.slice(0, 5000)}`,
        `Links:\n${extract.links.map((link) => `${link.href} ${link.text || ''}`).join('\n')}`,
        `Forms: ${JSON.stringify(extract.forms).slice(0, 4000)}`,
        `Buttons: ${extract.buttons.join(', ')}`,
        `Scripts: ${extract.scripts.join('\n')}`,
      ].join('\n\n'),
    });
    return result.object;
  } catch (error) {
    emit({
      type: 'diagnostic',
      level: 'warning',
      message: `DeepSeek analysis unavailable, using heuristic analyzer: ${error.message}`,
    });
    return heuristicAnalyze(extract);
  }
}

async function crawl() {
  const sessionId = process.env.APPRECON_CRAWL_SESSION_ID;
  const config = JSON.parse(process.env.APPRECON_CRAWL_CONFIG_JSON || '{}');
  if (!sessionId || !config.targetUrl) {
    throw new Error('Missing APPRECON_CRAWL_SESSION_ID or APPRECON_CRAWL_CONFIG_JSON.targetUrl');
  }

  const queue = [{ url: normalizeUrl(config.targetUrl), depth: 0, parentUrl: undefined, discoveredBy: 'seed' }]
    .filter((item) => item.url);
  const visited = new Set();

  log(sessionId, 'info', 'session', 'Sidecar crawl started (BFS)', config.targetUrl);

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
      const analysis = await aiAnalyze(extract);
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

      const candidates = [...extract.links, ...(analysis.prioritizedUrls || [])]
        .map((entry) => normalizeUrl(entry.href || entry.url))
        .filter(Boolean);
      for (const candidate of candidates) {
        if (!shouldBlockUrl(candidate, config, visited, item.depth + 1)) {
          queue.push({ url: candidate, depth: item.depth + 1, parentUrl: extract.finalUrl, discoveredBy: 'link' });
        }
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

crawl().catch((error) => {
  emit({ type: 'session_failed', message: error.message, createdAt: new Date().toISOString() });
  process.exitCode = 1;
});
