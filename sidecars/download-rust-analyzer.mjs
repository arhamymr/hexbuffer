#!/usr/bin/env node
/**
 * Downloads the correct rust-analyzer binary from the official GitHub releases
 * and places it in src-tauri/binaries/ following Tauri's sidecar naming convention.
 *
 * Usage: node sidecars/download-rust-analyzer.mjs
 *
 * The version to download can be overridden via the RA_VERSION environment variable.
 * By default it fetches the latest nightly release from rust-lang/rust-analyzer.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const binariesDir = path.join(root, 'src-tauri', 'binaries');

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
    if (!match) throw new Error('Failed to determine Rust host target triple');
    return match[1];
  }
}

/**
 * Maps a Rust target triple to the rust-analyzer GitHub release asset name.
 * See: https://github.com/rust-lang/rust-analyzer/releases
 */
function raAssetName(targetTriple) {
  if (targetTriple.includes('apple-darwin')) {
    return targetTriple.startsWith('aarch64')
      ? 'rust-analyzer-aarch64-apple-darwin.gz'
      : 'rust-analyzer-x86_64-apple-darwin.gz';
  }
  if (targetTriple.includes('linux')) {
    if (targetTriple.includes('musl')) {
      return targetTriple.startsWith('aarch64')
        ? 'rust-analyzer-aarch64-unknown-linux-musl.gz'
        : 'rust-analyzer-x86_64-unknown-linux-musl.gz';
    }
    return targetTriple.startsWith('aarch64')
      ? 'rust-analyzer-aarch64-unknown-linux-gnu.gz'
      : 'rust-analyzer-x86_64-unknown-linux-gnu.gz';
  }
  if (targetTriple.includes('windows')) {
    return 'rust-analyzer-x86_64-pc-windows-msvc.gz';
  }
  throw new Error(`Unsupported target triple for rust-analyzer: ${targetTriple}`);
}

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'hexbuffer-build-script' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return res.json();
}

async function downloadFile(url, destPath) {
  console.log(`  Downloading ${url} ...`);
  const res = await fetch(url, {
    headers: { 'User-Agent': 'hexbuffer-build-script' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} downloading ${url}`);
  const file = createWriteStream(destPath);
  await pipeline(res.body, file);
}

async function decompressGz(srcPath, destPath) {
  // Use Node.js built-in zlib via a one-liner child process to avoid extra deps
  const { createGunzip } = await import('node:zlib');
  const { createReadStream } = await import('node:fs');
  const src = createReadStream(srcPath);
  const dest = createWriteStream(destPath);
  await pipeline(src, createGunzip(), dest);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

(async () => {
  fs.mkdirSync(binariesDir, { recursive: true });

  const targetTriple = readTargetTriple();
  const isWindows = targetTriple.includes('windows');
  const ext = isWindows ? '.exe' : '';

  const outputName = `rust-analyzer-${targetTriple}${ext}`;
  const outputPath = path.join(binariesDir, outputName);

  // Skip if already downloaded
  if (fs.existsSync(outputPath)) {
    console.log(`[rust-analyzer] Already exists: ${outputName} — skipping download.`);
    console.log('[rust-analyzer] Delete the file and re-run to force a fresh download.');
    return;
  }

  // Resolve version — use RA_VERSION env var or fetch latest nightly
  let version = process.env.RA_VERSION;
  if (!version) {
    console.log('[rust-analyzer] Fetching latest release tag from GitHub...');
    const releases = await fetchJson(
      'https://api.github.com/repos/rust-lang/rust-analyzer/releases'
    );
    // Prefer the first stable tag (not "nightly"), fallback to nightly
    const stable = releases.find((r) => !r.prerelease && !r.tag_name.includes('nightly'));
    const nightly = releases.find((r) => r.tag_name === 'nightly');
    version = (stable ?? nightly)?.tag_name;
    if (!version) throw new Error('Could not determine rust-analyzer release version');
  }

  console.log(`[rust-analyzer] Using version: ${version}`);
  console.log(`[rust-analyzer] Target triple: ${targetTriple}`);

  const assetName = raAssetName(targetTriple);
  const downloadUrl = `https://github.com/rust-lang/rust-analyzer/releases/download/${version}/${assetName}`;

  const gzPath = outputPath + '.gz';

  try {
    // 1. Download the .gz file
    await downloadFile(downloadUrl, gzPath);

    // 2. Decompress .gz → binary
    console.log(`  Decompressing...`);
    await decompressGz(gzPath, outputPath);

    // 3. Make executable on Unix
    if (!isWindows) {
      fs.chmodSync(outputPath, 0o755);
    }

    console.log(`[rust-analyzer] ✓ Written to: ${outputPath}`);
  } finally {
    // Clean up the .gz file even on failure
    fs.rmSync(gzPath, { force: true });
  }
})();
