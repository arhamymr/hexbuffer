import { ToolLoopAgent, stepCountIs, tool } from 'ai';
import { z } from 'zod';

import { emit } from '../events.mjs';
import { providerModel } from '../provider.mjs';
import { runRedactionWorkflow } from '../privacy/redaction.mjs';
import {
  extractFormsFromHtml,
  extractLinksFromHtml,
  extractTitle,
  extractVisibleText,
} from '../extract-html.mjs';

const CHAT_AGENT_ID = '0xbuffer-chat-agent';

const CHAT_INSTRUCTIONS = [
  'You are the AI Analyst inside 0xbuffer, a desktop application for web application recon, traffic analysis, security testing, and reporting.',
  'Help users understand captured HTTP traffic, summarize recon and crawler results, identify suspicious patterns, and suggest safe testing steps.',
  'When users ask about targets, add them to scope using the addScope tool so the app tracks them.',
  'When users want findings or notes saved, write them to documents using the writeDocumentSection tool.',
  'When users ask about a specific URL, extract its content using the extractFromUrl tool.',
  'Recon workflow: use analyzeTargetUrl to gather hosts, links, forms, and content from a target URL, then add discovered hosts with addScope, and save findings/notes with writeDocumentSection.',
  'Security info workflow: use extractSecurityInfo to inspect security headers, security.txt, and cookie flags on a URL.',
  'Only work within declared project scope. Prefer passive analysis over active testing.',
  'Be evidence-based. If data is insufficient, explain what is missing.',
  'Be concise, practical, and professional.',
].join('\n');

const MAX_TOOL_STEPS = 12;

function emitAction(action) {
  emit({ type: 'chat_action', ...action, createdAt: new Date().toISOString() });
}

function toChatMessages(messages) {
  return messages
    .filter((message) => ['user', 'assistant', 'system'].includes(message.role) && message.content?.trim())
    .map((message) => ({
      role: message.role,
      content: message.content,
    }));
}

export async function runChat() {
  const request = JSON.parse(process.env['0XBUFFER_AI_CHAT_REQUEST_JSON'] || '{"messages":[]}');
  const context = JSON.parse(process.env['0XBUFFER_AI_CONTEXT_JSON'] || '{}');
  const provider = process.env.XBUFFER_AI_PROVIDER || 'deepseek';
  const model = process.env['0XBUFFER_AI_MODEL'] || 'deepseek-chat';
  emit({ type: 'chat_started', provider, model, createdAt: new Date().toISOString() });

  try {
    const redactedRequest = runRedactionWorkflow(request).redactedValue;
    const redactedContext = runRedactionWorkflow(context).redactedValue;
    const agent = new ToolLoopAgent({
      id: CHAT_AGENT_ID,
      model: providerModel(),
      instructions: CHAT_INSTRUCTIONS,
      stopWhen: stepCountIs(MAX_TOOL_STEPS),
      tools: {
        listCrawlSessions: tool({
          description: 'List recent AI browser crawl sessions available in context.',
          inputSchema: z.object({}),
          execute: async () => redactedContext.crawlSessions || [],
        }),
        getCrawlContext: tool({
          description: 'Read crawl pages, insights, and logs from the latest crawl context.',
          inputSchema: z.object({
            sessionId: z.string().optional(),
          }),
          execute: async ({ sessionId }) => {
            const targetId = sessionId || redactedContext.latestCrawl?.session?.id;
            if (!targetId || redactedContext.latestCrawl?.session?.id !== targetId) {
              return { session: null, pages: [], insights: [], logs: [] };
            }
            return redactedContext.latestCrawl;
          },
        }),
        getProxySummary: tool({
          description: 'Read recent HTTP proxy summary context.',
          inputSchema: z.object({}),
          execute: async () => redactedContext.proxySummary || [],
        }),
        getRecentInsights: tool({
          description: 'Read recent reconnaissance insights.',
          inputSchema: z.object({}),
          execute: async () => redactedContext.latestCrawl?.insights || [],
        }),
        addScope: tool({
          description: 'Add a host or URL to the reconnaissance scope so the app tracks it as a target.',
          inputSchema: z.object({
            host: z.string().describe('The hostname or URL to add to scope, e.g. "example.com" or "https://example.com".'),
            name: z.string().optional().describe('A friendly display name for the target.'),
          }),
          execute: async ({ host, name }) => {
            emitAction({
              action: 'add_target',
              payload: { host, name: name || null },
            });
            return { success: true, host, message: `Target "${name || host}" added to scope.` };
          },
        }),
        writeDocumentSection: tool({
          description: 'Write or append content to a recon document section. Use to save findings, notes, or report content the user wants to keep.',
          inputSchema: z.object({
            documentId: z.string().optional().describe('Document ID to write to. Omit to use the currently active document.'),
            sectionKey: z.string().optional().describe('Key of an existing custom section to update. Omit to create a new section.'),
            title: z.string().optional().describe('Title for the new section when creating one, e.g. "Findings" or "Notes".'),
            content: z.string().describe('The markdown content to write into the document.'),
            mode: z.enum(['append', 'replace']).optional().describe('"append" adds after existing content; "replace" overwrites. Defaults to "append".'),
          }),
          execute: async ({ documentId, sectionKey, title, content, mode }) => {
            emitAction({
              action: 'write_document',
              payload: {
                documentId: documentId || null,
                sectionKey: sectionKey || null,
                title: title || null,
                content,
                mode: mode || 'append',
              },
            });
            return { success: true, message: 'Document content saved.' };
          },
        }),
        extractFromUrl: tool({
          description: 'Fetch a URL and extract its title, links, forms, and visible text. Use for quick passive reconnaissance on a single page.',
          inputSchema: z.object({
            url: z.string().describe('The fully qualified URL to fetch and extract content from.'),
          }),
          execute: async ({ url }) => {
            try {
              const response = await fetch(url, {
                headers: { 'User-Agent': 'Mozilla/5.0 (compatible; 0xbuffer/1.0)' },
                redirect: 'follow',
                signal: AbortSignal.timeout(15000),
              });
              if (!response.ok) {
                return { error: `HTTP ${response.status} ${response.statusText}`, url };
              }
              const contentType = response.headers.get('content-type') || '';
              if (!contentType.includes('text/html') && !contentType.includes('text/plain')) {
                return { error: `Unsupported content type: ${contentType}`, url, status: response.status };
              }
              const html = await response.text();
              const title = extractTitle(html);
              const links = extractLinksFromHtml(html, url);
              const forms = extractFormsFromHtml(html);
              const text = extractVisibleText(html).slice(0, 5000);
              emitAction({
                action: 'url_extracted',
                payload: { url, title, linksCount: links.length, formsCount: forms.length },
              });
              return {
                url,
                title,
                status: response.status,
                links: links.slice(0, 40).map((l) => ({ href: l.href, text: l.text })),
                totalLinks: links.length,
                forms: forms.slice(0, 10).map((f) => ({
                  action: f.action,
                  method: f.method,
                  fields: f.fields.slice(0, 10),
                })),
                totalForms: forms.length,
                textPreview: text,
              };
            } catch (error) {
              return { error: error.message, url };
            }
          },
        }),
        analyzeTargetUrl: tool({
          description: 'Fetch and deeply analyze a target URL. Extracts all discovered hosts/domains, links, forms, page structure sections, and rich content. Use this as a SOURCE tool — feed its output into addScope (for each discovered host) and writeDocumentSection (for findings/notes/reports). Works for any target: bug bounty programs, company security pages, application portals, API docs, or any recon target.',
          inputSchema: z.object({
            url: z.string().describe('The target URL to analyze. Any web page — a program page, company site, application, or recon target.'),
          }),
          execute: async ({ url }) => {
            try {
              const response = await fetch(url, {
                headers: { 'User-Agent': 'Mozilla/5.0 (compatible; 0xbuffer/1.0)' },
                redirect: 'follow',
                signal: AbortSignal.timeout(20000),
              });
              if (!response.ok) {
                return { error: `HTTP ${response.status} ${response.statusText}`, url };
              }
              const contentType = response.headers.get('content-type') || '';
              if (!contentType.includes('text/html') && !contentType.includes('text/plain')) {
                return { error: `Unsupported content type: ${contentType}`, url, status: response.status };
              }
              const html = await response.text();
              const title = extractTitle(html);
              const links = extractLinksFromHtml(html, url);
              const text = extractVisibleText(html).slice(0, 8000);

              // Extract hosts: look for hostnames and URL patterns in page text and links
              const allHosts = new Set();
              const domainPattern = /(?:https?:\/\/)?(?:[\w-]+\.)+[\w-]+/gi;
              for (const match of text.matchAll(domainPattern)) {
                const host = match[0].replace(/^https?:\/\//i, '').replace(/\/[^\s]*$/, '').toLowerCase();
                if (host && !host.match(/^\d+\.\d+\.\d+\.\d+$/)) allHosts.add(host);
              }
              for (const link of links) {
                try {
                  const u = new URL(link.href);
                  allHosts.add(u.hostname.toLowerCase());
                } catch {}
              }

              // Detect content sections generically
              const lowerText = text.toLowerCase();
              const sectionFields = [
                { key: 'authSection', patterns: ['login', 'sign in', 'sign-in', 'authentication', 'oauth', 'sso'] },
                { key: 'apiSection', patterns: ['api', 'endpoint', 'graphql', 'rest', 'swagger', 'openapi'] },
                { key: 'docsSection', patterns: ['documentation', 'docs', 'guide', 'tutorial', 'reference'] },
                { key: 'policySection', patterns: ['policy', 'terms', 'privacy', 'security', 'responsible disclosure', 'safe harbor'] },
                { key: 'contactSection', patterns: ['contact', 'support', 'security@', 'report', 'email'] },
              ];
              const detectedSections = {};
              for (const { key, patterns } of sectionFields) {
                detectedSections[key] = patterns.some((p) => lowerText.includes(p));
              }

              // Extract sections content using pattern matching
              function extractSection(text, startMarkers, endMarkers) {
                const lower = text.toLowerCase();
                let start = -1;
                for (const m of startMarkers) {
                  const idx = lower.indexOf(m);
                  if (idx !== -1) { start = idx; break; }
                }
                if (start === -1) return null;
                let end = text.length;
                for (const m of endMarkers) {
                  const idx = lower.indexOf(m, start + 20);
                  if (idx !== -1 && idx < end) { end = idx; }
                }
                return text.slice(start, end).trim().slice(0, 2000);
              }
              const allSectionMarkers = ['scope', 'rules', 'guidelines', 'policy', 'faq', 'documentation', 'api', 'contact', 'about', 'login', 'sign up'];
              const sectionContents = {};
              for (const [key, patterns] of Object.entries({
                scope: ['in scope', 'scope', 'eligible', 'targets', 'assets'],
                exclusions: ['out of scope', 'out-of-scope', 'excluded', 'exclusions', 'not eligible'],
                rules: ['rules', 'guidelines', 'code of conduct', 'policy', 'requirements', 'disclosure'],
                rewards: ['rewards', 'bounties', 'compensation', 'payout', 'swag', 'hall of fame'],
              })) {
                sectionContents[key] = extractSection(text, patterns, allSectionMarkers)?.slice(0, 2000) || null;
              }

              // Categorize links
              const importantLinks = links.filter((l) => {
                const t = (l.text + ' ' + l.href).toLowerCase();
                return /scope|api|docs|security|policy|login|sign|auth|admin/i.test(t);
              }).slice(0, 30);
              const externalLinks = links.filter((l) => {
                try { return new URL(l.href).hostname !== new URL(url).hostname; } catch { return false; }
              }).slice(0, 20);

              const result = {
                url,
                title,
                status: response.status,
                detectedSections,
                discoveredHosts: [...allHosts].slice(0, 50),
                hostsCount: allHosts.size,
                importantLinks: importantLinks.map((l) => ({ href: l.href, text: l.text })),
                externalLinks: externalLinks.slice(0, 10).map((l) => ({ href: l.href, text: l.text })),
                totalLinks: links.length,
                sectionContents,
              };
              emitAction({
                action: 'url_extracted',
                payload: { url, title, linksCount: links.length, hostsFound: allHosts.size },
              });
              return result;
            } catch (error) {
              return { error: error.message, url };
            }
          },
        }),
        extractSecurityInfo: tool({
          description: 'Fetch a URL and extract its security configuration: security headers (CSP, HSTS, X-Frame-Options, etc.), security.txt file contents, server info, and security-relevant cookie flags. Use this as a SOURCE tool for security posture analysis.',
          inputSchema: z.object({
            url: z.string().describe('The fully qualified URL to inspect for security configuration.'),
          }),
          execute: async ({ url }) => {
            try {
              const response = await fetch(url, {
                headers: { 'User-Agent': 'Mozilla/5.0 (compatible; 0xbuffer/1.0)' },
                redirect: 'follow',
                signal: AbortSignal.timeout(15000),
              });
              const finalUrl = response.url;
              const status = response.status;

              // Extract security headers
              const securityHeaders = {
                'strict-transport-security': response.headers.get('strict-transport-security') || null,
                'content-security-policy': response.headers.get('content-security-policy') || null,
                'x-frame-options': response.headers.get('x-frame-options') || null,
                'x-content-type-options': response.headers.get('x-content-type-options') || null,
                'x-xss-protection': response.headers.get('x-xss-protection') || null,
                'referrer-policy': response.headers.get('referrer-policy') || null,
                'permissions-policy': response.headers.get('permissions-policy') || null,
                'cross-origin-opener-policy': response.headers.get('cross-origin-opener-policy') || null,
                'cross-origin-resource-policy': response.headers.get('cross-origin-resource-policy') || null,
                'cross-origin-embedder-policy': response.headers.get('cross-origin-embedder-policy') || null,
                'server': response.headers.get('server') || null,
                'x-powered-by': response.headers.get('x-powered-by') || null,
              };

              // Extract cookies with security flags
              const setCookieHeaders = response.headers.getSetCookie?.() || [];
              const cookies = setCookieHeaders.map((header) => {
                const parts = header.split(';').map((p) => p.trim().toLowerCase());
                const nameValue = parts[0];
                return {
                  name: nameValue?.split('=')[0] || 'unknown',
                  httpOnly: parts.some((p) => p === 'httponly'),
                  secure: parts.some((p) => p === 'secure'),
                  sameSite: parts.find((p) => p.startsWith('samesite='))?.replace('samesite=', '') || 'none',
                };
              });

              // Try to fetch security.txt
              let securityTxt = null;
              try {
                const rootUrl = new URL(url);
                for (const path of ['/security.txt', '/.well-known/security.txt']) {
                  try {
                    const txtRes = await fetch(`${rootUrl.protocol}//${rootUrl.host}${path}`, {
                      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; 0xbuffer/1.0)' },
                      signal: AbortSignal.timeout(5000),
                    });
                    if (txtRes.ok) {
                      securityTxt = await txtRes.text();
                      break;
                    }
                  } catch {}
                }
              } catch {}

              // Extract HTML info if it's HTML
              let title = null;
              let visibleText = null;
              if (response.ok) {
                const contentType = response.headers.get('content-type') || '';
                if (contentType.includes('text/html')) {
                  const html = await response.text();
                  title = extractTitle(html);
                  visibleText = extractVisibleText(html).slice(0, 2000);
                }
              }

              // Compile security findings
              const findings = [];
              if (!securityHeaders['strict-transport-security']) findings.push({ level: 'info', header: 'Strict-Transport-Security', issue: 'HSTS header is missing. Consider enforcing HTTPS with HSTS.' });
              if (!securityHeaders['content-security-policy']) findings.push({ level: 'info', header: 'Content-Security-Policy', issue: 'CSP header is missing. Consider defining a content security policy.' });
              if (!securityHeaders['x-frame-options'] && !(securityHeaders['content-security-policy'] || '').includes('frame-ancestors')) findings.push({ level: 'low', header: 'X-Frame-Options', issue: 'No frame protection header found. The page may be vulnerable to clickjacking.' });
              if (!securityHeaders['x-content-type-options']) findings.push({ level: 'low', header: 'X-Content-Type-Options', issue: 'Missing X-Content-Type-Options header. Add it to prevent MIME sniffing.' });
              if (securityHeaders['server']) findings.push({ level: 'info', header: 'Server', issue: `Server header reveals: ${securityHeaders['server']}` });
              if (securityHeaders['x-powered-by']) findings.push({ level: 'info', header: 'X-Powered-By', issue: `Technology disclosure: ${securityHeaders['x-powered-by']}` });
              const insecureCookies = cookies.filter((c) => !c.secure || !c.httpOnly);
              if (insecureCookies.length > 0) findings.push({ level: 'low', header: 'Set-Cookie', issue: `${insecureCookies.length} cookie(s) missing Secure or HttpOnly flags: ${insecureCookies.map((c) => c.name).join(', ')}` });

              const result = {
                url,
                finalUrl: finalUrl !== url ? finalUrl : null,
                status,
                title,
                securityHeaders,
                cookies: cookies.slice(0, 20),
                insecureCookieCount: insecureCookies.length,
                securityTxt,
                findings,
                findingsCount: findings.length,
                textPreview: visibleText,
              };
              emitAction({
                action: 'url_extracted',
                payload: { url, title, status, findingsCount: findings.length },
              });
              return result;
            } catch (error) {
              return { error: error.message, url };
            }
          },
        }),
      },
    });
    const result = await agent.stream({
      messages: toChatMessages(redactedRequest.messages),
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
