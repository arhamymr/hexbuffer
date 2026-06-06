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
import { log } from './events.mjs';

function sessionId() {
  return process.env['0XBUFFER_CRAWL_SESSION_ID'];
}

function nowMs() {
  return Date.now();
}

function durationSince(startedAt) {
  return Math.max(0, Date.now() - startedAt);
}

function playwrightLog(level, type, message, url, playwright) {
  const id = sessionId();
  if (!id) return;
  log(id, level, type, message, url, { playwright });
}

function compactField(field) {
  return {
    selector: field.selector,
    fieldName: field.name,
    fieldId: field.id,
    fieldLabel: field.label,
    fieldPlaceholder: field.placeholder,
    fieldType: field.type,
  };
}

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
    const startedAt = nowMs();
    try {
      await page.screenshot({ path: screenshotPath, fullPage: true });
      artifacts.screenshotPath = screenshotPath;
      playwrightLog('info', 'extraction', 'Captured screenshot', page.url(), {
        action: 'screenshot',
        pageId,
        path: screenshotPath,
        fullPage: true,
        durationMs: durationSince(startedAt),
      });
    } catch (error) {
      playwrightLog('warning', 'extraction', 'Screenshot capture failed', page.url(), {
        action: 'screenshot',
        pageId,
        path: screenshotPath,
        fullPage: true,
        durationMs: durationSince(startedAt),
        error: error.message,
      });
      process.stderr.write(`[ai-engine] screenshot capture failed for ${page.url()}: ${error.message}\n`);
    }
  }

  if (config.captureRenderedHtml !== false) {
    const renderedHtmlPath = path.join(pageDir, `${pageId}.html`);
    const startedAt = nowMs();
    try {
      await fs.writeFile(renderedHtmlPath, await page.content(), 'utf8');
      artifacts.renderedHtmlPath = renderedHtmlPath;
      playwrightLog('info', 'extraction', 'Captured rendered HTML', page.url(), {
        action: 'content',
        pageId,
        path: renderedHtmlPath,
        durationMs: durationSince(startedAt),
      });
    } catch (error) {
      playwrightLog('warning', 'extraction', 'Rendered HTML capture failed', page.url(), {
        action: 'content',
        pageId,
        path: renderedHtmlPath,
        durationMs: durationSince(startedAt),
        error: error.message,
      });
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
  const startedAt = nowMs();
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

  const context = await browser.newContext(contextOptions);
  playwrightLog('info', 'session', 'Created browser context', undefined, {
    action: 'newContext',
    proxy: contextOptions.proxy.server,
    storageStateLoaded: Boolean(contextOptions.storageState),
    durationMs: durationSince(startedAt),
  });
  return context;
}

async function persistContextState(context) {
  const statePath = storageStatePath();
  if (!statePath) return;

  try {
    await fs.mkdir(path.dirname(statePath), { recursive: true });
    const startedAt = nowMs();
    await context.storageState({ path: statePath });
    playwrightLog('info', 'session', 'Persisted browser storage state', undefined, {
      action: 'storageState',
      path: statePath,
      durationMs: durationSince(startedAt),
    });
  } catch (error) {
    playwrightLog('warning', 'session', 'Storage state capture failed', undefined, {
      action: 'storageState',
      path: statePath,
      error: error.message,
    });
    process.stderr.write(`[ai-engine] storage state capture failed: ${error.message}\n`);
  }
}

export async function createPlaywrightRuntime(config) {
  const startedAt = nowMs();
  const executablePath = installedChromeExecutable();
  if (!executablePath) {
    throw new Error('Google Chrome or Chromium is required for browser automation. Install Chrome or Chromium and retry.');
  }

  playwrightLog('info', 'session', 'Launching Chrome', config.targetUrl, {
    action: 'launch',
    headless: config.headless !== false,
    executablePath,
  });
  const browser = await chromium.launch({
    headless: config.headless !== false,
    executablePath,
  });

  try {
    const context = await createContext(browser);
    playwrightLog('info', 'session', 'Launched Chrome', config.targetUrl, {
      action: 'launch',
      headless: config.headless !== false,
      executablePath,
      durationMs: durationSince(startedAt),
    });
    return { browser, context, page: undefined };
  } catch (error) {
    playwrightLog('error', 'error', 'Failed to launch Chrome', config.targetUrl, {
      action: 'launch',
      headless: config.headless !== false,
      executablePath,
      durationMs: durationSince(startedAt),
      error: error.message,
    });
    await browser.close().catch(() => {});
    throw error;
  }
}

export async function closePlaywrightRuntime(runtime) {
  if (!runtime) return;

  const startedAt = nowMs();
  await runtime.context?.close().catch(() => {});
  await runtime.browser?.close().catch(() => {});
  playwrightLog('info', 'session', 'Closed browser runtime', undefined, {
    action: 'close',
    durationMs: durationSince(startedAt),
  });
}

async function extractPage(page, response, config, pageId) {
  const startedAt = nowMs();
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

  const result = {
    finalUrl: normalizeUrl(page.url()),
    httpStatus: response?.status(),
    ...artifacts,
    ...extract,
  };
  playwrightLog('info', 'extraction', 'Extracted page content', page.url(), {
    action: 'extract',
    pageId,
    status: response?.status(),
    linksFound: result.links.length,
    formsFound: result.forms.length,
    buttonsFound: result.buttons.length,
    scriptsFound: result.scripts.length,
    title: result.title,
    durationMs: durationSince(startedAt),
  });
  return result;
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
  const workflowStartedAt = nowMs();
  const urlBeforeInput = page.url();
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

  playwrightLog('info', 'human', 'Preparing Playwright input', urlBeforeInput, {
    action: 'inputWorkflow',
    urlBefore: urlBeforeInput,
    fieldsFound: fields.length,
    providedFieldKeys: Object.keys(values || {}),
  });

  let lastFilledSelector;
  let firstSubmitSelector;
  let filledCount = 0;
  for (const field of fields) {
    const fieldType = String(field.type || '').toLowerCase();
    if (['submit', 'button'].includes(fieldType) && !firstSubmitSelector) {
      firstSubmitSelector = field.selector;
      continue;
    }
    if (['hidden', 'reset', 'image', 'file'].includes(fieldType)) continue;

    const value = credentialForField(field, values);
    if (value === undefined) continue;

    const locator = page.locator(field.selector).first();
    const actionStartedAt = nowMs();
    let action = 'fill';
    if (fieldType === 'checkbox' || fieldType === 'radio') {
      if (/^(1|true|yes|on|checked)$/i.test(String(value))) {
        action = 'check';
        await locator.check();
      } else if (/^(0|false|no|off|unchecked)$/i.test(String(value))) {
        action = 'uncheck';
        await locator.uncheck();
      } else {
        playwrightLog('warning', 'human', 'Skipped unsupported checkbox input', page.url(), {
          action: 'inputSkipped',
          ...compactField(field),
          valueProvided: true,
          reason: 'Checkbox and radio fields require true/false style values.',
          durationMs: durationSince(actionStartedAt),
        });
        continue;
      }
    } else if (fieldType === 'select') {
      action = 'selectOption';
      await locator.selectOption(String(value));
    } else {
      await locator.fill(String(value));
    }
    filledCount += 1;
    playwrightLog('info', 'human', `Playwright ${action} input`, page.url(), {
      action,
      ...compactField(field),
      valueProvided: true,
      durationMs: durationSince(actionStartedAt),
      urlBefore: urlBeforeInput,
      urlAfter: page.url(),
    });
    lastFilledSelector = field.selector;
  }

  const resultWaits = () => {
    const beforeUrl = page.url();
    return [
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => null),
      page.waitForURL((nextUrl) => String(nextUrl) !== beforeUrl, { timeout: 15000 }).catch(() => null),
      page.waitForResponse((response) => {
        const resourceType = response.request().resourceType();
        return ['document', 'xhr', 'fetch'].includes(resourceType);
      }, { timeout: 15000 }).catch(() => null),
    ];
  };

  const submit = page.locator([
    'button[type="submit"]',
    'input[type="submit"]',
    'button:has-text("Sign in")',
    'button:has-text("Log in")',
    'button:has-text("Login")',
    'button:has-text("Submit")',
    'button:has-text("Search")',
    firstSubmitSelector,
  ].filter(Boolean).join(', ')).first();

  const waits = resultWaits();
  const submitStartedAt = nowMs();
  let submitAction = 'click';
  let submitSelector;
  if (await submit.count()) {
    submitSelector = [
      'button[type="submit"]',
      'input[type="submit"]',
      'button:has-text("Sign in")',
      'button:has-text("Log in")',
      'button:has-text("Login")',
      'button:has-text("Submit")',
      'button:has-text("Search")',
      firstSubmitSelector,
    ].filter(Boolean).join(', ');
    await submit.click({ timeout: 5000 });
  } else if (lastFilledSelector) {
    submitAction = 'press';
    submitSelector = lastFilledSelector;
    await page.locator(lastFilledSelector).press('Enter', { timeout: 5000 });
  } else {
    const formSubmit = page.locator('form button, form input[type="submit"]').first();
    if (await formSubmit.count()) {
      submitAction = 'click';
      submitSelector = 'form button, form input[type="submit"]';
      await formSubmit.click({ timeout: 5000 });
    } else {
      throw new Error('No matching form fields or submit controls were found for the provided human input.');
    }
  }
  playwrightLog('info', 'human', submitAction === 'press' ? 'Pressed Enter to submit input' : 'Clicked submit button', page.url(), {
    action: submitAction,
    selector: submitSelector,
    key: submitAction === 'press' ? 'Enter' : undefined,
    fieldsFilled: filledCount,
    urlBefore: urlBeforeInput,
    urlAfter: page.url(),
    durationMs: durationSince(submitStartedAt),
  });

  const settled = await Promise.allSettled(waits);
  const waitResults = settled.map((result, index) => ({
    wait: ['navigation', 'urlChange', 'response'][index],
    result: result.status === 'fulfilled' && result.value ? 'matched' : 'timedOut',
    status: result.status === 'fulfilled' && result.value && typeof result.value.status === 'function'
      ? result.value.status()
      : undefined,
    url: result.status === 'fulfilled' && result.value && typeof result.value.url === 'function'
      ? result.value.url()
      : undefined,
  }));
  const response = settled
    .map((result) => result.status === 'fulfilled' ? result.value : null)
    .find((value) => value && typeof value.status === 'function');

  await page.waitForLoadState('domcontentloaded', { timeout: 10000 }).catch(() => {});
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  playwrightLog('info', 'human', 'Completed Playwright input workflow', page.url(), {
    action: 'inputWorkflow',
    fieldsFilled: filledCount,
    submitAction,
    submitSelector,
    waitResults,
    status: response?.status(),
    urlBefore: urlBeforeInput,
    urlAfter: page.url(),
    durationMs: durationSince(workflowStartedAt),
  });

  return response || null;
}

export async function playwrightExtract(url, config, pageId, humanInput, runtime) {
  const ownsRuntime = !runtime;
  const activeRuntime = runtime || await createPlaywrightRuntime(config);

  try {
    const context = activeRuntime.context;
    const reusablePage = activeRuntime.page && !activeRuntime.page.isClosed();
    const page = reusablePage
      ? activeRuntime.page
      : await context.newPage();
    activeRuntime.page = page;
    playwrightLog('info', 'navigation', reusablePage ? 'Using existing browser page' : 'Created browser page', url, {
      action: 'newPage',
      reusedPage: Boolean(reusablePage),
      urlBefore: page.url(),
    });

    const gotoStartedAt = nowMs();
    playwrightLog('info', 'navigation', `Navigating to ${url}`, url, {
      action: 'goto',
      urlBefore: page.url(),
      urlAfter: url,
      waitUntil: 'networkidle',
      timeoutMs: config.timeoutMs || 30000,
    });
    let response = await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: config.timeoutMs || 30000,
    });
    playwrightLog('info', 'navigation', 'Navigation completed', page.url(), {
      action: 'goto',
      urlBefore: url,
      urlAfter: page.url(),
      waitUntil: 'networkidle',
      timeoutMs: config.timeoutMs || 30000,
      status: response?.status(),
      durationMs: durationSince(gotoStartedAt),
    });

    const settleMs = config.networkSettleMs || 2000;
    const settleStartedAt = nowMs();
    await page.waitForTimeout(settleMs);
    playwrightLog('info', 'navigation', 'Waited for network settle', page.url(), {
      action: 'wait',
      timeoutMs: settleMs,
      result: 'completed',
      durationMs: durationSince(settleStartedAt),
    });

    if (humanInput?.fields) {
      try {
        response = await fillHumanInput(page, humanInput.fields) || response;
      } catch (error) {
        playwrightLog('error', 'human', 'Playwright input workflow failed', page.url(), {
          action: 'inputWorkflow',
          urlBefore: url,
          urlAfter: page.url(),
          error: error.message,
        });
        throw error;
      }
      const inputSettleStartedAt = nowMs();
      await page.waitForTimeout(settleMs);
      playwrightLog('info', 'navigation', 'Waited after Playwright input', page.url(), {
        action: 'wait',
        timeoutMs: settleMs,
        result: 'completed',
        durationMs: durationSince(inputSettleStartedAt),
      });
    }

    await persistContextState(context);
    const extract = await extractPage(page, response, config, pageId);
    return {
      url,
      finalUrl: extract.finalUrl || url,
      ...extract,
    };
  } finally {
    if (ownsRuntime) {
      await closePlaywrightRuntime(activeRuntime);
    }
  }
}
