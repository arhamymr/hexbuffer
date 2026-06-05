import { randomUUID } from 'node:crypto';
import readline from 'node:readline';

import { analyzeWithAgent, heuristicAnalyze, restrictedGate } from './analysis.mjs';
import { emit, log } from './events.mjs';
import { fetchExtract, playwrightExtract } from './extractors.mjs';
import { normalizeUrl, shouldBlockUrl } from './url-policy.mjs';

const pendingHumanInputs = new Map();

const humanInputReader = readline.createInterface({ input: process.stdin });

humanInputReader.on('line', (line) => {
  if (!line.trim()) return;

  try {
    const message = JSON.parse(line);
    if (message.type !== 'human_input_response' || !message.requestId) return;
    const pending = pendingHumanInputs.get(message.requestId);
    if (!pending) return;

    pendingHumanInputs.delete(message.requestId);
    pending.resolve(message);
  } catch (error) {
    process.stderr.write(`[ai-engine] ignored invalid stdin message: ${error.message}\n`);
  }
});

function waitForHumanInput(requestId) {
  return new Promise((resolve) => {
    pendingHumanInputs.set(requestId, { resolve });
  });
}

function emitPageVisited({ pageId, sessionId, extract, analysis }) {
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
    aiUsedForAnalysis: !!analysis.aiUsedForAnalysis,
    interesting: analysis.interesting,
    screenshotPath: extract.screenshotPath,
    renderedHtmlPath: extract.renderedHtmlPath,
  });
}

function emitInsights({ sessionId, pageId, url, analysis }) {
  for (const insight of analysis.insights || []) {
    emit({
      type: 'insight_created',
      id: randomUUID(),
      sessionId,
      pageId,
      url,
      severity: insight.severity,
      insightType: insight.type,
      title: insight.title,
      description: insight.description,
      aiUsedForAnalysis: !!analysis.aiUsedForAnalysis,
      createdAt: new Date().toISOString(),
    });
  }
}

function enqueueCandidates({ queue, enqueued, visited, extract, analysis, config, depth }) {
  const candidates = [...new Set(
    [...extract.links, ...(analysis.prioritizedUrls || [])]
      .map((entry) => normalizeUrl(entry.href || entry.url))
      .filter(Boolean)
  )];
  for (const candidate of candidates) {
    if (!enqueued.has(candidate) && !shouldBlockUrl(candidate, config, visited, depth + 1)) {
      enqueued.add(candidate);
      queue.push({ url: candidate, depth: depth + 1, parentUrl: extract.finalUrl, discoveredBy: 'link' });
    }
  }
}

export async function runCrawl() {
  const sessionId = process.env['0XBUFFER_CRAWL_SESSION_ID'];
  const config = JSON.parse(process.env['0XBUFFER_CRAWL_CONFIG_JSON'] || '{}');
  if (!sessionId || !config.targetUrl) {
    throw new Error('Missing 0XBUFFER_CRAWL_SESSION_ID or 0XBUFFER_CRAWL_CONFIG_JSON.targetUrl');
  }

  const queue = [{ url: normalizeUrl(config.targetUrl), depth: 0, parentUrl: undefined, discoveredBy: 'seed' }]
    .filter((item) => item.url);
  const visited = new Set();
  const enqueued = new Set(queue.map((item) => item.url));

  log(sessionId, 'info', 'session', 'Browser Automation started (BFS)', config.targetUrl);

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
      const extract = process.env['0XBUFFER_USE_FETCH_CRAWLER'] === '1'
        ? await fetchExtract(item.url, config)
        : await playwrightExtract(item.url, config, pageId);
      const analysis = config.enableAiInsights
        ? await analyzeWithAgent(extract, sessionId)
        : heuristicAnalyze(extract);
      emitPageVisited({ pageId, sessionId, extract, analysis });
      log(sessionId, 'info', 'navigation', `Visited ${extract.finalUrl}`, extract.finalUrl, {
        aiUsedForAnalysis: !!analysis.aiUsedForAnalysis,
      });

      emitInsights({ sessionId, pageId, url: extract.finalUrl, analysis });
      enqueueCandidates({ queue, enqueued, visited, extract, analysis, config, depth: item.depth });

      const gate = analysis.humanInputRequest || restrictedGate(extract);
      if (gate) {
        const requestId = randomUUID();
        emit({
          type: 'human_input_requested',
          id: requestId,
          sessionId,
          pageId,
          url: extract.finalUrl,
          reason: gate.reason,
          requestedFields: [...new Set(gate.requestedFields || [])],
          safeActions: gate.safeActions?.length ? gate.safeActions : ['continue', 'skip-branch', 'stop-crawl'],
          aiUsedForAnalysis: !!analysis.aiUsedForAnalysis,
          createdAt: new Date().toISOString(),
        });
        log(sessionId, 'warning', 'policy', `Human input required for ${extract.finalUrl}: ${gate.reason}`, extract.finalUrl, {
          humanInputRequestId: requestId,
          requestedFields: [...new Set(gate.requestedFields || [])],
          aiUsedForAnalysis: !!analysis.aiUsedForAnalysis,
        });

        const response = await waitForHumanInput(requestId);
        if (response.action === 'stop-crawl') {
          log(sessionId, 'warning', 'policy', 'Human selected stop-crawl for restricted workflow.', extract.finalUrl);
          break;
        }
        if (response.action !== 'continue') {
          log(sessionId, 'info', 'policy', `Human selected ${response.action || 'skip-branch'} for restricted workflow.`, extract.finalUrl);
          continue;
        }
        if (process.env['0XBUFFER_USE_FETCH_CRAWLER'] === '1') {
          log(sessionId, 'warning', 'policy', 'Human input cannot be replayed by the fetch crawler; skipped restricted branch.', extract.finalUrl);
          continue;
        }

        log(sessionId, 'info', 'policy', `Applying human input for ${extract.finalUrl} and resuming protected crawl.`, extract.finalUrl);
        const authenticatedExtract = await playwrightExtract(extract.finalUrl, config, pageId, {
          fields: response.fields || {},
        });
        const authenticatedAnalysis = config.enableAiInsights
          ? await analyzeWithAgent(authenticatedExtract, sessionId)
          : heuristicAnalyze(authenticatedExtract);
        emitPageVisited({ pageId, sessionId, extract: authenticatedExtract, analysis: authenticatedAnalysis });
        log(sessionId, 'info', 'navigation', `Visited protected page ${authenticatedExtract.finalUrl}`, authenticatedExtract.finalUrl, {
          aiUsedForAnalysis: !!authenticatedAnalysis.aiUsedForAnalysis,
        });
        emitInsights({ sessionId, pageId, url: authenticatedExtract.finalUrl, analysis: authenticatedAnalysis });
        enqueueCandidates({ queue, enqueued, visited, extract: authenticatedExtract, analysis: authenticatedAnalysis, config, depth: item.depth });
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
        aiSummary: `Automation failed: ${error.message}`,
        aiUsedForAnalysis: false,
        interesting: false,
      });
      log(sessionId, 'error', 'error', `Failed to crawl ${item.url}: ${error.message}`, item.url, {
        aiUsedForAnalysis: false,
      });
    }

    if (config.requestDelayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, Math.min(config.requestDelayMs, 3000)));
    }
  }

  emit({ type: 'session_finished', sessionId, finishedAt: new Date().toISOString() });
  humanInputReader.close();
}
