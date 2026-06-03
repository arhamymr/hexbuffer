import {
  extractButtonsFromHtml,
  extractFormsFromHtml,
  extractLinksFromHtml,
  extractScriptsFromHtml,
  extractTitle,
  extractVisibleText,
} from './extract-html.mjs';
import { normalizeUrl } from './url-policy.mjs';
import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';

function executableInPath(name) {
  try {
    return execFileSync(process.platform === 'win32' ? 'where' : 'which', [name], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find(Boolean);
  } catch {
    return undefined;
  }
}

function installedChromeExecutable() {
  const candidates = [];

  if (process.platform === 'darwin') {
    candidates.push(
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
      '/Applications/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
      '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary'
    );
  } else if (process.platform === 'win32') {
    if (process.env.LOCALAPPDATA) {
      candidates.push(
        path.join(process.env.LOCALAPPDATA, 'Google/Chrome/Application/chrome.exe'),
        path.join(process.env.LOCALAPPDATA, 'Chromium/Application/chrome.exe')
      );
    }
    if (process.env.PROGRAMFILES) {
      candidates.push(
        path.join(process.env.PROGRAMFILES, 'Google/Chrome/Application/chrome.exe'),
        path.join(process.env.PROGRAMFILES, 'Chromium/Application/chrome.exe')
      );
    }
    if (process.env['PROGRAMFILES(X86)']) {
      candidates.push(path.join(process.env['PROGRAMFILES(X86)'], 'Google/Chrome/Application/chrome.exe'));
    }
  } else {
    candidates.push(
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser'
    );
  }

  return candidates.find((candidate) => {
    try {
      return existsSync(candidate);
    } catch {
      return false;
    }
  }) || executableInPath('google-chrome') || executableInPath('google-chrome-stable') || executableInPath('chromium') || executableInPath('chromium-browser');
}

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

async function capturePageArtifacts(page, config, pageId) {
  const artifactRoot = process.env['0XBUFFER_AI_ARTIFACT_DIR'];
  const sessionId = process.env['0XBUFFER_CRAWL_SESSION_ID'];
  if (!artifactRoot || !sessionId || !pageId) {
    return {};
  }

  const pageDir = path.join(artifactRoot, sessionId);
  await fs.mkdir(pageDir, { recursive: true });

  const artifacts = {};
  if (config.captureScreenshots !== false) {
    const screenshotPath = path.join(pageDir, `${pageId}.png`);
    try {
      await page.screenshot({ path: screenshotPath, fullPage: true });
      artifacts.screenshotPath = screenshotPath;
    } catch (error) {
      process.stderr.write(`[ai-engine] screenshot capture failed for ${page.url()}: ${error.message}\n`);
    }
  }

  if (config.captureRenderedHtml !== false) {
    const renderedHtmlPath = path.join(pageDir, `${pageId}.html`);
    try {
      await fs.writeFile(renderedHtmlPath, await page.content(), 'utf8');
      artifacts.renderedHtmlPath = renderedHtmlPath;
    } catch (error) {
      process.stderr.write(`[ai-engine] rendered HTML capture failed for ${page.url()}: ${error.message}\n`);
    }
  }

  return artifacts;
}

export async function playwrightExtract(url, config, pageId) {
  const executablePath = installedChromeExecutable();
  if (!executablePath) {
    throw new Error('Google Chrome or Chromium is required for browser automation. Install Chrome or Chromium and retry.');
  }

  const browser = await chromium.launch({
    headless: true,
    executablePath,
  });
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

    const artifacts = await capturePageArtifacts(page, config, pageId);

    const extract = await page.evaluate(`(() => {
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
    })()`);

    return {
      url,
      finalUrl: normalizeUrl(page.url()) || url,
      httpStatus: response?.status(),
      ...artifacts,
      ...extract,
    };
  } finally {
    await browser.close();
  }
}
