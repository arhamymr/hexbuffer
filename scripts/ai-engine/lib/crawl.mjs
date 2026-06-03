import { randomUUID } from 'node:crypto';

import { analyzeWithAgent, heuristicAnalyze, restrictedGate } from './analysis.mjs';
import { emit, log } from './events.mjs';
import { fetchExtract, playwrightExtract } from './extractors.mjs';
import { normalizeUrl, shouldBlockUrl } from './url-policy.mjs';

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
      log(sessionId, 'info', 'navigation', `Visited ${extract.finalUrl}`, extract.finalUrl, {
        aiUsedForAnalysis: !!analysis.aiUsedForAnalysis,
      });

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
          aiUsedForAnalysis: !!analysis.aiUsedForAnalysis,
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
          aiUsedForAnalysis: !!analysis.aiUsedForAnalysis,
          createdAt: new Date().toISOString(),
        });
        log(sessionId, 'warning', 'policy', `Skipped restricted page ${extract.finalUrl}: ${gate.reason}`, extract.finalUrl, {
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

  emit({ type: 'session_finished', sessionId, finishedAt: new Date().toISOString() });
}
