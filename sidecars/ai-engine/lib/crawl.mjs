import { randomUUID } from 'node:crypto';

import { analyzeWithAgent, heuristicAnalyze, restrictedGate } from './analysis/analysis.mjs';
import { emit, log } from './events.mjs';
import {
  closePlaywrightRuntime,
  createPlaywrightRuntime,
  fetchExtract,
  playwrightExtract,
} from './extractors.mjs';
import { normalizeUrl, shouldBlockUrl } from './url-policy.mjs';
import { withRetry } from './retry.mjs';
import { isAiProviderAvailable } from './provider.mjs';

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
      analysisSource: insight.analysisSource || analysis.analysisSource || (analysis.aiUsedForAnalysis ? 'ai' : undefined),
      analysisToolId: insight.analysisToolId,
      analysisToolName: insight.analysisToolName,
      createdAt: new Date().toISOString(),
    });
  }
}

function enqueueCandidates({ queue, enqueued, visited, extract, analysis, config, depth, front = false }) {
  const candidates = [...new Set(
    [...extract.links, ...(analysis.prioritizedUrls || [])]
      .map((entry) => normalizeUrl(entry.href || entry.url))
      .filter(Boolean)
  )];
  for (const candidate of candidates) {
    if (!enqueued.has(candidate) && !shouldBlockUrl(candidate, config, visited, depth + 1)) {
      enqueued.add(candidate);
      const nextItem = { url: candidate, depth: depth + 1, parentUrl: extract.finalUrl, discoveredBy: 'link' };
      if (front) {
        queue.unshift(nextItem);
      } else {
        queue.push(nextItem);
      }
    }
  }
}

export async function runCrawl() {
  const sessionId = process.env['0XBUFFER_CRAWL_SESSION_ID'];
  const config = JSON.parse(process.env['0XBUFFER_CRAWL_CONFIG_JSON'] || '{}');
  if (!sessionId || !config.targetUrl) {
    throw new Error('Missing 0XBUFFER_CRAWL_SESSION_ID or 0XBUFFER_CRAWL_CONFIG_JSON.targetUrl');
  }

  let playwrightRuntime;
  const useFetchCrawler = process.env['0XBUFFER_USE_FETCH_CRAWLER'] === '1' && config.headless !== false;

  const seedUrl = normalizeUrl(config.resumeFromUrl || config.targetUrl);
  const queue = [{
    url: seedUrl,
    depth: 0,
    parentUrl: undefined,
    discoveredBy: config.resumeFromUrl ? 'human-input-resume' : 'seed',
    humanInput: config.humanInputFields ? { fields: config.humanInputFields } : undefined,
  }]
    .filter((item) => item.url);
  const visited = new Set();
  const enqueued = new Set(queue.map((item) => item.url));

  log(sessionId, 'info', 'session', 'Browser Automation started (BFS)', config.targetUrl);

  const aiEnabled = config.enableAiInsights && isAiProviderAvailable();
  if (config.enableAiInsights && !aiEnabled) {
    const provider = process.env.XBUFFER_AI_PROVIDER || 'deepseek';
    const apiKeyEnv = provider === 'openai' ? 'OPENAI_API_KEY' : 'DEEPSEEK_API_KEY';
    log(sessionId, 'warning', 'ai', `${provider === 'openai' ? 'OpenAI' : 'DeepSeek'} AI agent unavailable (${apiKeyEnv} missing). Using deterministic analysis for all pages.`, config.targetUrl);
  }
  if (config.headless === false && !useFetchCrawler) {
    try {
      playwrightRuntime = await createPlaywrightRuntime(config);
      log(sessionId, 'info', 'session', 'Browser Automation started in visible browser mode', config.targetUrl);
    } catch (error) {
      log(sessionId, 'error', 'error', error.message, config.targetUrl);
      throw error;
    }
  }

  try {
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
        const extract = await withRetry(async () => {
          return useFetchCrawler
            ? await fetchExtract(item.url, config)
            : await playwrightExtract(item.url, config, pageId, item.humanInput, playwrightRuntime);
        }, { maxAttempts: 2, name: `extract:${item.url}` });
        const baseline = heuristicAnalyze(extract);
        let analysis = baseline;
        if (aiEnabled && baseline.interesting) {
          analysis = await analyzeWithAgent(extract, baseline, sessionId);
        }
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
          log(sessionId, 'warning', 'human', `Human input required for ${extract.finalUrl}: ${gate.reason}`, extract.finalUrl, {
            humanInputRequestId: requestId,
            requestedFields: [...new Set(gate.requestedFields || [])],
            aiUsedForAnalysis: !!analysis.aiUsedForAnalysis,
          });
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
  } finally {
    await closePlaywrightRuntime(playwrightRuntime);
  }

  emit({ type: 'session_finished', sessionId, finishedAt: new Date().toISOString() });
}
