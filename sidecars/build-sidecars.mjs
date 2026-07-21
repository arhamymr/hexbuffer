#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const binariesDir = path.join(root, 'src-tauri', 'binaries');
const pkgCacheDir = path.join(root, 'src-tauri', '.pkg-cache');

function run(command, args, options = {}) {
  const isWin = process.platform === 'win32';
  const bin = isWin && command === 'pnpm' ? 'pnpm.cmd' : command;
  execFileSync(bin, args, {
    cwd: root,
    stdio: 'inherit',
    shell: isWin,
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
  const publicPackages = [
    'ai',
    'zod',
    '@ai-sdk/deepseek',
    '@ai-sdk/openai',
    'playwright',
    'playwright-core',
  ].join(',');
  const playwrightRoot = path.dirname(require.resolve('playwright/package.json'));
  const playwrightCoreRoot = path.join(path.dirname(playwrightRoot), 'playwright-core');
  const playwrightBrowsersJson = path.join(playwrightCoreRoot, 'browsers.json');
  const playwrightBrowsersJsonAsset = path.relative(root, playwrightBrowsersJson);
  const pkgConfigPath = path.join(root, `${name}.pkg.config.json`);
  fs.writeFileSync(
    pkgConfigPath,
    JSON.stringify(
      {
        assets: [
          playwrightBrowsersJsonAsset,
          'sidecars/knowledge/**/*'
        ],
      },
      null,
      2
    )
  );

  try {
    run('pnpm', [
      'exec',
      'pkg',
      '--config',
      pkgConfigPath,
      entry,
      '--targets',
      target,
      '--output',
      output,
      '--compress',
      'GZip',
      '--fallback-to-source',
      '--public-packages',
      publicPackages,
    ], {
      env: {
        PKG_CACHE_PATH: pkgCacheDir,
      },
    });
  } finally {
    fs.rmSync(pkgConfigPath, { force: true });
  }

  fs.chmodSync(output, 0o755);
}

function removeLegacySidecars(targetTriple) {
  const ext = process.platform === 'win32' ? '.exe' : '';
  fs.rmSync(path.join(binariesDir, `browser-sidecar-${targetTriple}${ext}`), {
    force: true,
  });
}

fs.mkdirSync(binariesDir, { recursive: true });
fs.mkdirSync(pkgCacheDir, { recursive: true });

const targetTriple = readTargetTriple();
const target = pkgTargetForTriple(targetTriple);

console.log(`[sidecars] Building sidecars for ${targetTriple} (${target})`);
removeLegacySidecars(targetTriple);

// ponytail: bundle ES modules into CommonJS before running pkg to avoid bytecode and module system mismatch errors
console.log('[sidecars] Bundling sidecar with esbuild...');
fs.mkdirSync(path.join(root, 'sidecars', 'dist'), { recursive: true });
run('pnpm', [
  'exec',
  'esbuild',
  'sidecars/index.mjs',
  '--bundle',
  '--platform=node',
  '--format=cjs',
  '--external:ai',
  '--external:zod',
  '--external:@ai-sdk/deepseek',
  '--external:@ai-sdk/openai',
  '--external:playwright',
  '--external:playwright-core',
  '--outfile=sidecars/dist/index.cjs',
  '--define:import.meta.url=undefined'
]);

buildSidecar({
  name: 'ai-engine',
  entry: 'sidecars/dist/index.cjs',
  target,
  targetTriple,
});

console.log('[sidecars] Done');
