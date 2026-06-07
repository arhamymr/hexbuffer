import { tool } from 'ai';
import { z } from 'zod';

import {
  extractLinksFromHtml,
  extractTitle,
  extractVisibleText,
} from '../../extract-html.mjs';

export function createAnalyzeTargetUrlTool(emitAction) {
  return tool({
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
  });
}
