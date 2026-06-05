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

function storageStatePath() {
  const artifactRoot = process.env['0XBUFFER_AI_ARTIFACT_DIR'];
  const sessionId = process.env['0XBUFFER_CRAWL_SESSION_ID'];
  if (!artifactRoot || !sessionId) return undefined;
  return path.join(artifactRoot, sessionId, 'storage-state.json');
}

async function createContext(browser) {
  const proxyPort = process.env['0XBUFFER_PROXY_PORT'] || '8888';
  const storageState = storageStatePath();
  const contextOptions = {
    ignoreHTTPSErrors: true,
    proxy: { server: `http://127.0.0.1:${proxyPort}` },
  };

  if (storageState) {
    try {
      if (existsSync(storageState)) {
        contextOptions.storageState = storageState;
      }
    } catch {
      // Ignore unreadable storage state and continue with a clean context.
    }
  }

  return browser.newContext(contextOptions);
}

async function persistContextState(context) {
  const statePath = storageStatePath();
  if (!statePath) return;

  try {
    await fs.mkdir(path.dirname(statePath), { recursive: true });
    await context.storageState({ path: statePath });
  } catch (error) {
    process.stderr.write(`[ai-engine] storage state capture failed: ${error.message}\n`);
  }
}

async function extractPage(page, response, config, pageId) {
  const artifacts = await capturePageArtifacts(page, config, pageId);

  const extract = await page.evaluate(`(() => {
    const fieldLabel = (field) => {
      if (field.id) {
        const label = document.querySelector(\`label[for="\${CSS.escape(field.id)}"]\`);
        if (label?.textContent) return label.textContent.trim();
      }
      const parentLabel = field.closest('label');
      return parentLabel?.textContent?.trim() || undefined;
    };
    const fieldSelector = (field, index) => {
      if (field.id) return \`#\${CSS.escape(field.id)}\`;
      const name = field.getAttribute('name');
      if (name) return \`\${field.tagName.toLowerCase()}[name="\${CSS.escape(name)}"]\`;
      return \`\${field.tagName.toLowerCase()}:nth-of-type(\${index + 1})\`;
    };
    const links = Array.from(document.querySelectorAll('a[href]')).map((anchor) => ({
      href: anchor.href,
      text: anchor.textContent?.trim() || '',
    }));
    const forms = Array.from(document.querySelectorAll('form')).map((form) => ({
      action: form.getAttribute('action') || undefined,
      method: form.getAttribute('method') || 'get',
      fields: Array.from(form.querySelectorAll('input, textarea, select')).map((field, index) => ({
        id: field.getAttribute('id') || undefined,
        name: field.getAttribute('name') || undefined,
        type: field.getAttribute('type') || field.tagName.toLowerCase(),
        placeholder: field.getAttribute('placeholder') || undefined,
        label: fieldLabel(field),
        selector: fieldSelector(field, index),
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
    finalUrl: normalizeUrl(page.url()),
    httpStatus: response?.status(),
    ...artifacts,
    ...extract,
  };
}

function normalizeCredentialKey(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function credentialForField(field, values) {
  const entries = Object.entries(values || {}).filter(([, value]) => String(value ?? '').length > 0);
  if (!entries.length) return undefined;

  const descriptors = [field.name, field.id, field.placeholder, field.label, field.type]
    .map(normalizeCredentialKey)
    .filter(Boolean);

  const direct = entries.find(([key]) => descriptors.includes(normalizeCredentialKey(key)));
  if (direct) return direct[1];

  const fieldText = descriptors.join(' ');
  if (/pass/.test(fieldText)) {
    return entries.find(([key]) => /pass/.test(normalizeCredentialKey(key)))?.[1];
  }
  if (/email/.test(fieldText)) {
    return entries.find(([key]) => /email|user|login/.test(normalizeCredentialKey(key)))?.[1];
  }
  if (/user|login/.test(fieldText)) {
    return entries.find(([key]) => /user|email|login/.test(normalizeCredentialKey(key)))?.[1];
  }
  if (/otp|mfa|2fa|token|code/.test(fieldText)) {
    return entries.find(([key]) => /otp|mfa|2fa|token|code/.test(normalizeCredentialKey(key)))?.[1];
  }

  return undefined;
}

async function fillHumanInput(page, values) {
  const fields = await page.evaluate(`Array.from(document.querySelectorAll('input, textarea, select')).map((field, index) => {
    const label = field.id
      ? document.querySelector(\`label[for="\${CSS.escape(field.id)}"]\`)?.textContent?.trim()
      : field.closest('label')?.textContent?.trim();
    const name = field.getAttribute('name');
    return {
      id: field.getAttribute('id') || undefined,
      name: name || undefined,
      type: field.getAttribute('type') || field.tagName.toLowerCase(),
      placeholder: field.getAttribute('placeholder') || undefined,
      label: label || undefined,
      selector: field.id
        ? \`#\${CSS.escape(field.id)}\`
        : name
          ? \`\${field.tagName.toLowerCase()}[name="\${CSS.escape(name)}"]\`
          : \`\${field.tagName.toLowerCase()}:nth-of-type(\${index + 1})\`,
    };
  })`);

  let lastFilledSelector;
  for (const field of fields) {
    const fieldType = String(field.type || '').toLowerCase();
    if (['hidden', 'submit', 'button', 'checkbox', 'radio', 'file'].includes(fieldType)) continue;

    const value = credentialForField(field, values);
    if (value === undefined) continue;

    const locator = page.locator(field.selector).first();
    await locator.fill(String(value));
    lastFilledSelector = field.selector;
  }

  if (!lastFilledSelector) {
    throw new Error('No matching form fields were found for the provided human input.');
  }

  const submit = page.locator('button[type="submit"], input[type="submit"], button:has-text("Sign in"), button:has-text("Log in"), button:has-text("Login")').first();
  if (await submit.count()) {
    await Promise.allSettled([
      page.waitForLoadState('networkidle', { timeout: 10000 }),
      submit.click({ timeout: 5000 }),
    ]);
  } else {
    await Promise.allSettled([
      page.waitForLoadState('networkidle', { timeout: 10000 }),
      page.locator(lastFilledSelector).press('Enter', { timeout: 5000 }),
    ]);
  }
}

export async function playwrightExtract(url, config, pageId, humanInput) {
  const executablePath = installedChromeExecutable();
  if (!executablePath) {
    throw new Error('Google Chrome or Chromium is required for browser automation. Install Chrome or Chromium and retry.');
  }

  const browser = await chromium.launch({
    headless: true,
    executablePath,
  });
  try {
    const context = await createContext(browser);
    const page = await context.newPage();

    const response = await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: config.timeoutMs || 30000,
    });

    const settleMs = config.networkSettleMs || 2000;
    await page.waitForTimeout(settleMs);

    if (humanInput?.fields) {
      await fillHumanInput(page, humanInput.fields);
      await page.waitForTimeout(settleMs);
    }

    await persistContextState(context);
    const extract = await extractPage(page, response, config, pageId);
    return {
      url,
      finalUrl: extract.finalUrl || url,
      ...extract,
    };
  } finally {
    await browser.close();
  }
}
