import { normalizeUrl } from './url-policy.mjs';

export function extractLinksFromHtml(html, baseUrl) {
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

export function extractFormsFromHtml(html) {
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

export function extractButtonsFromHtml(html) {
  return [...html.matchAll(/<button\b[^>]*>(.*?)<\/button>/gis)]
    .map((match) => match[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

export function extractScriptsFromHtml(html, baseUrl) {
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

export function extractTitle(html) {
  return html.match(/<title[^>]*>(.*?)<\/title>/is)?.[1]?.replace(/\s+/g, ' ').trim() || '';
}

export function extractVisibleText(html) {
  return html
    .replace(/<script\b[^>]*>.*?<\/script>/gis, ' ')
    .replace(/<style\b[^>]*>.*?<\/style>/gis, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
