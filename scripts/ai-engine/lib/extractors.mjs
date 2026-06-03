import {
  extractButtonsFromHtml,
  extractFormsFromHtml,
  extractLinksFromHtml,
  extractScriptsFromHtml,
  extractTitle,
  extractVisibleText,
} from './extract-html.mjs';
import { normalizeUrl } from './url-policy.mjs';

export async function fetchExtract(url, config) {
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

export async function playwrightExtract(url, config) {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ headless: true });
  try {
    const proxyPort = process.env['0XBUFFER_PROXY_PORT'] || '8888';
    const context = await browser.newContext({
      ignoreHTTPSErrors: true,
      proxy: { server: `http://127.0.0.1:${proxyPort}` },
    });
    const page = await context.newPage();

    const response = await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: config.timeoutMs || 30000,
    });

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
