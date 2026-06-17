import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

import { emit } from '../events.mjs';

/**
 * Page Structure Scraper
 * 
 * Navigates to a target URL using headless Playwright and extracts
 * structured DOM information suitable for AI prompt context.
 * 
 * Returns page title, URL, form fields, buttons, links, headings,
 * and trimmed visible text.
 */

// ── Chrome executable detection (mirrored from extractors.mjs) ──────────

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

function chromeLaunchArgs() {
  if (process.platform !== 'darwin') {
    return [];
  }
  return ['--use-mock-keychain'];
}

// ── DOM extraction via page.evaluate ────────────────────────────────────

function buildDomExtractionScript() {
  return () => {
    const result = {
      title: document.title,
      url: window.location.href,
      forms: [],
      buttons: [],
      links: [],
      headings: [],
      textContent: '',
    };

    // Extract form fields
    const formElements = document.querySelectorAll('input, select, textarea');
    formElements.forEach((el) => {
      result.forms.push({
        tagName: el.tagName.toLowerCase(),
        name: el.getAttribute('name') || '',
        id: el.id || '',
        type: el.getAttribute('type') || '',
        placeholder: el.getAttribute('placeholder') || '',
        ariaLabel: el.getAttribute('aria-label') || '',
        autocomplete: el.getAttribute('autocomplete') || '',
        required: el.hasAttribute('required'),
        disabled: el.hasAttribute('disabled'),
      });
    });

    // Extract buttons
    const buttonElements = document.querySelectorAll('button, input[type="submit"], input[type="button"], [role="button"]');
    buttonElements.forEach((el) => {
      const text = (el.textContent || el.value || '').trim().slice(0, 100);
      if (text) {
        result.buttons.push({
          text,
          id: el.id || '',
          className: (typeof el.className === 'string' ? el.className : el.getAttribute('class')) || '',
          tagName: el.tagName.toLowerCase(),
          type: el.getAttribute('type') || '',
        });
      }
    });

    // Extract links
    const linkElements = document.querySelectorAll('a[href]');
    linkElements.forEach((el) => {
      const href = el.getAttribute('href') || '';
      const text = (el.textContent || '').trim().slice(0, 150);
      // Skip empty, javascript:, and anchor links
      if (!href || href.startsWith('javascript:') || href === '#') return;
      result.links.push({
        text: text || href,
        href,
        id: el.id || '',
        className: (typeof el.className === 'string' ? el.className : el.getAttribute('class')) || '',
      });
    });

    // Limit links to prevent token overflow
    if (result.links.length > 50) {
      result.links = result.links.slice(0, 50);
    }

    // Extract headings
    for (let level = 1; level <= 6; level++) {
      const headings = document.querySelectorAll(`h${level}`);
      headings.forEach((h) => {
        const text = (h.textContent || '').trim();
        if (text) {
          result.headings.push(`H${level}: ${text}`);
        }
      });
    }

    // Extract visible text content (limited)
    const body = document.body;
    if (body) {
      const visibleText = (body.innerText || body.textContent || '').trim();
      result.textContent = visibleText.slice(0, 5000);
    }

    return result;
  };
}

// ── Main export ─────────────────────────────────────────────────────────

/**
 * Scrape a target URL and return structured page information
 * suitable for AI step generation context.
 * 
 * @param {string} targetUrl - The URL to scrape
 * @returns {Promise<object>} Structured page data
 */
export async function scrapePageStructure(targetUrl) {
  const executablePath = installedChromeExecutable();
  if (!executablePath) {
    throw new Error('Google Chrome or Chromium is required for page scraping. Install Chrome or Chromium and retry.');
  }

  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      executablePath,
      args: chromeLaunchArgs(),
    });

    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      ignoreHTTPSErrors: true,
    });

    const page = await context.newPage();

    // Navigate with timeout
    const response = await page.goto(targetUrl, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    // Extract DOM structure
    const pageStructure = await page.evaluate(buildDomExtractionScript());

    // Add navigation metadata
    pageStructure.statusCode = response?.status() || null;
    pageStructure.finalUrl = page.url();

    emit({
      type: 'scrape:completed',
      targetUrl,
      finalUrl: page.url(),
      title: pageStructure.title,
      formCount: pageStructure.forms.length,
      buttonCount: pageStructure.buttons.length,
      linkCount: pageStructure.links.length,
      headingCount: pageStructure.headings.length,
      textLength: pageStructure.textContent.length,
    });

    return pageStructure;
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}
