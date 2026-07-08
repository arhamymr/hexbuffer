import { generateObject } from 'ai';
import { z } from 'zod';

import { providerModel } from '../ai/provider.mjs';
import { emit } from '../events.mjs';
import { runRedactionWorkflow } from '../privacy/redaction.mjs';
import { withRetry } from '../retry.mjs';

const STRUCTURAL_HEADERS = new Set([
  'accept-encoding',
  'connection',
  'content-length',
  'host',
  'if-modified-since',
  'if-none-match',
  'proxy-authorization',
  'te',
  'transfer-encoding',
  'upgrade',
]);

const FUZZABLE_HEADERS = new Set([
  'accept',
  'accept-language',
  'authorization',
  'content-type',
  'cookie',
  'origin',
  'referer',
  'user-agent',
  'x-api-key',
  'x-auth-token',
  'x-csrf-token',
  'x-forwarded-for',
  'x-forwarded-host',
  'x-real-ip',
  'x-requested-with',
]);

const candidateSelectionSchema = z.object({
  suggestions: z.array(z.object({
    candidateId: z.string(),
    confidence: z.number().min(0).max(1),
    reason: z.string().max(180),
  })).max(12),
});

function markerRanges(raw) {
  const ranges = [];
  let searchStart = 0;

  while (true) {
    const start = raw.indexOf('$', searchStart);
    if (start === -1) break;
    const end = raw.indexOf('$', start + 1);
    if (end === -1) break;
    ranges.push({ start, end: end + 1 });
    searchStart = end + 1;
  }

  return ranges;
}

function overlapsAny(start, end, ranges) {
  return ranges.some((range) => start < range.end && end > range.start);
}

function addCandidate(candidates, ranges, candidate) {
  if (candidate.start < 0 || candidate.end <= candidate.start) return;
  if (!candidate.value || !candidate.value.trim()) return;
  if (candidate.value.includes('$')) return;
  if (overlapsAny(candidate.start, candidate.end, ranges)) return;

  const id = `cand_${String(candidates.length + 1).padStart(3, '0')}`;
  candidates.push({
    id,
    ...candidate,
    preview: candidate.value.length > 80 ? `${candidate.value.slice(0, 77)}...` : candidate.value,
  });
}

function parseHead(raw) {
  const normalized = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const splitIndex = normalized.indexOf('\n\n');
  const head = splitIndex === -1 ? normalized : normalized.slice(0, splitIndex);
  const body = splitIndex === -1 ? '' : normalized.slice(splitIndex + 2);
  const lines = head.split('\n');
  const requestLine = lines[0] ?? '';
  const headers = [];
  let offset = requestLine.length + 1;

  for (const line of lines.slice(1)) {
    const separator = line.indexOf(':');
    if (separator > 0) {
      const name = line.slice(0, separator);
      const rawValue = line.slice(separator + 1);
      const leadingSpace = rawValue.match(/^\s*/)?.[0].length ?? 0;
      headers.push({
        name,
        value: rawValue.trim(),
        line,
        nameStart: offset,
        valueStart: offset + separator + 1 + leadingSpace,
      });
    }
    offset += line.length + 1;
  }

  return {
    body,
    bodyStart: splitIndex === -1 ? raw.length : splitIndex + 2,
    headers,
    requestLine,
  };
}

function requestTargetInfo(requestLine) {
  const match = requestLine.match(/^(\S+)\s+(\S+)/);
  if (!match) return null;
  return {
    method: match[1],
    target: match[2],
    targetStart: match[1].length + 1,
  };
}

function addUrlCandidates(raw, ranges, candidates, requestLine) {
  const targetInfo = requestTargetInfo(requestLine);
  if (!targetInfo) return;

  const target = targetInfo.target;
  let parsed;
  try {
    parsed = new URL(target, 'https://placeholder.local');
  } catch {
    return;
  }

  const pathStartInTarget = target.indexOf(parsed.pathname);
  if (pathStartInTarget >= 0) {
    let cursor = 0;
    for (const segment of parsed.pathname.split('/')) {
      if (!segment || segment === '.' || segment === '..') {
        cursor += segment.length + 1;
        continue;
      }
      const lower = decodeURIComponent(segment).toLowerCase();
      const meaningful =
        segment.length > 1 &&
        !/^(api|v\d+|graphql|rest|assets|static|public|private)$/i.test(lower);
      if (meaningful) {
        const start = targetInfo.targetStart + pathStartInTarget + cursor;
        addCandidate(candidates, ranges, {
          start,
          end: start + segment.length,
          value: raw.slice(start, start + segment.length),
          category: 'path',
          location: `path segment /${segment}`,
        });
      }
      cursor += segment.length + 1;
    }
  }

  const queryStartInTarget = target.indexOf('?');
  if (queryStartInTarget === -1) return;

  const query = target.slice(queryStartInTarget + 1).split('#')[0];
  let cursor = 0;
  for (const part of query.split('&')) {
    const eq = part.indexOf('=');
    if (eq > -1 && eq < part.length - 1) {
      const key = part.slice(0, eq);
      const value = part.slice(eq + 1);
      const start = targetInfo.targetStart + queryStartInTarget + 1 + cursor + eq + 1;
      addCandidate(candidates, ranges, {
        start,
        end: start + value.length,
        value: raw.slice(start, start + value.length),
        category: 'query',
        location: `query parameter ${key}`,
      });
    }
    cursor += part.length + 1;
  }
}

function addHeaderCandidates(ranges, candidates, headers) {
  for (const header of headers) {
    const lowerName = header.name.toLowerCase();
    if (STRUCTURAL_HEADERS.has(lowerName)) continue;

    if (lowerName === 'cookie') {
      let cursor = 0;
      for (const part of header.value.split(';')) {
        const trimmedStart = part.match(/^\s*/)?.[0].length ?? 0;
        const cookie = part.trim();
        const eq = cookie.indexOf('=');
        if (eq > -1 && eq < cookie.length - 1) {
          const name = cookie.slice(0, eq);
          const value = cookie.slice(eq + 1);
          const start = header.valueStart + cursor + trimmedStart + eq + 1;
          addCandidate(candidates, ranges, {
            start,
            end: start + value.length,
            value,
            category: 'cookie',
            location: `cookie ${name}`,
          });
        }
        cursor += part.length + 1;
      }
      continue;
    }

    const isCustomHeader = lowerName.startsWith('x-');
    if (FUZZABLE_HEADERS.has(lowerName) || isCustomHeader) {
      addCandidate(candidates, ranges, {
        start: header.valueStart,
        end: header.valueStart + header.value.length,
        value: header.value,
        category: 'header',
        location: `header ${header.name}`,
      });
    }
  }
}

function addJsonValueCandidates(raw, ranges, candidates, body, bodyStart) {
  const valuePattern = /"([^"\\]*(?:\\.[^"\\]*)*)"\s*:\s*("(?:[^"\\]|\\.)*"|-?\d+(?:\.\d+)?|true|false|null)/g;
  let match;
  while ((match = valuePattern.exec(body)) !== null) {
    const key = match[1];
    const rawValue = match[2];
    if (rawValue === 'null') continue;
    const valueOffset = match[0].lastIndexOf(rawValue);
    const absoluteValueStart = bodyStart + match.index + valueOffset;
    const isQuoted = rawValue.startsWith('"') && rawValue.endsWith('"');
    const start = absoluteValueStart + (isQuoted ? 1 : 0);
    const end = absoluteValueStart + rawValue.length - (isQuoted ? 1 : 0);
    addCandidate(candidates, ranges, {
      start,
      end,
      value: raw.slice(start, end),
      category: 'body',
      location: `JSON field ${key}`,
    });
  }
}

function addFormValueCandidates(raw, ranges, candidates, body, bodyStart) {
  if (!body.includes('=')) return;
  let cursor = 0;
  for (const part of body.split('&')) {
    const eq = part.indexOf('=');
    if (eq > -1 && eq < part.length - 1) {
      const key = part.slice(0, eq);
      const value = part.slice(eq + 1);
      const start = bodyStart + cursor + eq + 1;
      addCandidate(candidates, ranges, {
        start,
        end: start + value.length,
        value: raw.slice(start, start + value.length),
        category: 'body',
        location: `form field ${key}`,
      });
    }
    cursor += part.length + 1;
  }
}

export function extractInvokerMarkerCandidates(raw) {
  const ranges = markerRanges(raw);
  const candidates = [];
  const { body, bodyStart, headers, requestLine } = parseHead(raw);

  addUrlCandidates(raw, ranges, candidates, requestLine);
  addHeaderCandidates(ranges, candidates, headers);
  addJsonValueCandidates(raw, ranges, candidates, body, bodyStart);
  addFormValueCandidates(raw, ranges, candidates, body, bodyStart);

  return candidates.filter((candidate) => raw.slice(candidate.start, candidate.end) === candidate.value);
}

function buildAiContext(raw, candidates) {
  return {
    requestPreview: raw.slice(0, 6000),
    candidates: candidates.map((candidate) => ({
      id: candidate.id,
      category: candidate.category,
      location: candidate.location,
      valuePreview: candidate.preview,
    })),
  };
}

function validateAiSuggestions(candidates, selected) {
  const byId = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  const used = [];
  const suggestions = [];

  for (const item of selected.suggestions ?? []) {
    const candidate = byId.get(item.candidateId);
    if (!candidate) continue;
    if (used.some((range) => candidate.start < range.end && candidate.end > range.start)) continue;
    used.push({ start: candidate.start, end: candidate.end });
    suggestions.push({
      ...candidate,
      confidence: item.confidence,
      reason: item.reason?.trim() || 'AI selected this input as a fuzzing candidate.',
    });
  }

  return suggestions;
}

export async function runInvokerAutoMark() {
  const provider = process.env.XBUFFER_AI_PROVIDER || 'deepseek';
  const model = process.env['HEXBUFFER_AI_MODEL'] || 'deepseek-chat';
  const rawRequest = process.env['HEXBUFFER_INVOKER_RAW_REQUEST'] || '';

  if (!rawRequest.trim()) {
    emit({
      type: 'invoker_auto_mark_failed',
      provider,
      model,
      message: '[task-specification] Raw request is empty',
      createdAt: new Date().toISOString(),
    });
    process.exitCode = 1;
    return;
  }

  const candidates = extractInvokerMarkerCandidates(rawRequest);
  if (candidates.length === 0) {
    emit({
      type: 'invoker_auto_mark_finished',
      provider,
      model,
      suggestions: [],
      candidateCount: 0,
      createdAt: new Date().toISOString(),
    });
    return;
  }

  const redactedContext = runRedactionWorkflow(buildAiContext(rawRequest, candidates)).redactedValue;

  try {
    const selected = await withRetry(async () => {
      return await generateObject({
        model: providerModel(),
        schema: candidateSelectionSchema,
        system: [
          'You are helping configure hexbuffer Invoker fuzzing markers for an authorized web security test.',
          'Select only candidate IDs worth fuzzing.',
          'Prefer user-controlled identifiers, filters, search terms, IDs, tokens, JSON/form values, cookies, and custom auth-related headers.',
          'Avoid selecting generic static path words, structural protocol fields, or values that are unlikely to affect application behavior.',
          'Return concise reasons and confidence from 0 to 1.',
        ].join('\n'),
        prompt: JSON.stringify(redactedContext),
      });
    }, { maxAttempts: 2, name: 'runInvokerAutoMark' });

    const suggestions = validateAiSuggestions(candidates, selected.object);
    emit({
      type: 'invoker_auto_mark_finished',
      provider,
      model,
      suggestions,
      candidateCount: candidates.length,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    emit({
      type: 'invoker_auto_mark_failed',
      provider,
      model,
      message: error.message,
      createdAt: new Date().toISOString(),
    });
    process.exitCode = 1;
  }
}
