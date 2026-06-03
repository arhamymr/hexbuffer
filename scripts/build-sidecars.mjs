#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const binariesDir = path.join(root, 'src-tauri', 'binaries');
const resourceDir = path.join(root, 'src-tauri', 'resources');
const playwrightBrowsersDir = path.join(resourceDir, 'playwright-browsers');
const pkgCacheDir = path.join(root, 'src-tauri', '.pkg-cache');

function run(command, args, options = {}) {
  execFileSync(command, args, {
    cwd: root,
    stdio: 'inherit',
    env: {
      ...process.env,
      ...options.env,
    },
  });
}

function readTargetTriple() {
  try {
    return execFileSync('rustc', ['--print', 'host-tuple'], {
      cwd: root,
      encoding: 'utf8',
    }).trim();
  } catch {
    const rustInfo = execFileSync('rustc', ['-vV'], {
      cwd: root,
      encoding: 'utf8',
    });
    const match = /^host:\s+(\S+)$/m.exec(rustInfo);
    if (!match) {
      throw new Error('Failed to determine Rust host target triple');
    }
    return match[1];
  }
}

function pkgTargetForTriple(targetTriple) {
  const nodeTarget = process.env.SIDECAR_NODE_TARGET || 'node22';

  if (targetTriple.includes('apple-darwin')) {
    return targetTriple.startsWith('aarch64')
      ? `${nodeTarget}-macos-arm64`
      : `${nodeTarget}-macos-x64`;
  }
  if (targetTriple.includes('linux')) {
    return targetTriple.startsWith('aarch64')
      ? `${nodeTarget}-linux-arm64`
      : `${nodeTarget}-linux-x64`;
  }
  if (targetTriple.includes('windows')) {
    if (targetTriple.startsWith('aarch64')) {
      return `${nodeTarget}-win-arm64`;
    }
    if (targetTriple.startsWith('i686')) {
      return `${nodeTarget}-win-x86`;
    }
    return `${nodeTarget}-win-x64`;
  }

  throw new Error(`Unsupported sidecar target triple: ${targetTriple}`);
}

function buildSidecar({ name, entry, target, targetTriple }) {
  const ext = process.platform === 'win32' ? '.exe' : '';
  const output = path.join(binariesDir, `${name}-${targetTriple}${ext}`);

  run('pnpm', [
    'exec',
    'pkg',
    entry,
    '--targets',
    target,
    '--output',
    output,
    '--public-packages',
    '*',
  ], {
    env: {
      PKG_CACHE_PATH: pkgCacheDir,
    },
  });

  fs.chmodSync(output, 0o755);
}

function removeLegacySidecars(targetTriple) {
  const ext = process.platform === 'win32' ? '.exe' : '';
  fs.rmSync(path.join(binariesDir, `browser-sidecar-${targetTriple}${ext}`), {
    force: true,
  });
}

function hasBundledChromium() {
  return fs.existsSync(playwrightBrowsersDir)
    && fs.readdirSync(playwrightBrowsersDir).some((entry) => entry.startsWith('chromium-'));
}

function defaultPlaywrightCacheDir() {
  if (process.env.PLAYWRIGHT_BROWSERS_PATH && process.env.PLAYWRIGHT_BROWSERS_PATH !== '0') {
    return process.env.PLAYWRIGHT_BROWSERS_PATH;
  }
  if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Caches', 'ms-playwright');
  }
  if (process.platform === 'win32') {
    return path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'), 'ms-playwright');
  }
  return path.join(process.env.XDG_CACHE_HOME || path.join(os.homedir(), '.cache'), 'ms-playwright');
}

function copyCachedChromium() {
  const cacheDir = defaultPlaywrightCacheDir();
  if (!fs.existsSync(cacheDir)) {
    return false;
  }

  const chromiumEntries = fs
    .readdirSync(cacheDir)
    .filter((entry) => entry.startsWith('chromium-') || entry.startsWith('chromium_headless_shell-'));
  if (chromiumEntries.length === 0) {
    return false;
  }

  for (const entry of chromiumEntries) {
    fs.cpSync(path.join(cacheDir, entry), path.join(playwrightBrowsersDir, entry), {
      recursive: true,
      force: true,
    });
  }
  return true;
}

function ensureBundledChromium() {
  if (hasBundledChromium()) {
    console.log(`[sidecars] Reusing bundled Chromium in ${playwrightBrowsersDir}`);
    return;
  }

  if (copyCachedChromium()) {
    console.log(`[sidecars] Copied local Playwright Chromium cache into ${playwrightBrowsersDir}`);
    return;
  }

  console.log(`[sidecars] Installing bundled Chromium into ${playwrightBrowsersDir}`);
  run('pnpm', ['exec', 'playwright', 'install', 'chromium'], {
    env: {
      PLAYWRIGHT_BROWSERS_PATH: playwrightBrowsersDir,
    },
  });
}

fs.mkdirSync(binariesDir, { recursive: true });
fs.mkdirSync(pkgCacheDir, { recursive: true });
fs.mkdirSync(playwrightBrowsersDir, { recursive: true });

const targetTriple = readTargetTriple();
const target = pkgTargetForTriple(targetTriple);

ensureBundledChromium();
console.log(`[sidecars] Building sidecars for ${targetTriple} (${target})`);
removeLegacySidecars(targetTriple);
buildSidecar({
  name: 'ai-engine',
  entry: 'scripts/ai-engine/index.mjs',
  target,
  targetTriple,
});

console.log('[sidecars] Done');
