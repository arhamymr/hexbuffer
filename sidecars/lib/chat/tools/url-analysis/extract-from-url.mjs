import { z } from 'zod';

import {
  extractFormsFromHtml,
  extractLinksFromHtml,
  extractTitle,
  extractVisibleText,
} from '../../../extract-html.mjs';

/**
 * Strip HTML tags from a string, returning plain text content.
 * Example: "<h1>hello</h1>" -> "hello"
 */
function stripHtmlTags(html) {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, '') // Remove all HTML tags
    .replace(/\s+/g, ' ') // Collapse multiple whitespace
    .trim();
}

export const extractFromUrlDef = {
  description: 'Fetch a URL and extract its title, links, forms, and visible text. Use for quick passive reconnaissance on a single page.',
  inputSchema: z.object({
    url: z.string().describe('The fully qualified URL to fetch and extract content from.'),
  }),
  execute: async ({ url }, ctx) => {
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; hexbuffer/1.0)' },
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
      const title = stripHtmlTags(extractTitle(html));
      const links = extractLinksFromHtml(html, url);
      const forms = extractFormsFromHtml(html);
      const text = stripHtmlTags(extractVisibleText(html)).slice(0, 5000);
      ctx.emitAction({
        action: 'url_extracted',
        payload: { url, title, linksCount: links.length, formsCount: forms.length },
      });
      return {
        url,
        title,
        status: response.status,
        links: links.slice(0, 40).map((l) => ({ href: l.href, text: stripHtmlTags(l.text) })),
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
};
