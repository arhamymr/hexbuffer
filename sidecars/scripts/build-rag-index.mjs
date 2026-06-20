#!/usr/bin/env node

/**
 * Build-time RAG index generator.
 * Reads knowledge/corpus.json, generates vector embeddings for each entry,
 * and writes the index to knowledge/vectors.json.
 *
 * Run: node scripts/build-rag-index.mjs
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CORPUS_PATH = join(__dirname, '..', 'knowledge', 'corpus.json');
const VECTORS_PATH = join(__dirname, '..', 'knowledge', 'vectors.json');

/**
 * Simple text-to-vector using character n-gram hashing.
 * Same algorithm as retrieve.mjs for consistency.
 */
function textToVector(text, dimensions = 256) {
  const vec = new Array(dimensions).fill(0);
  const normalized = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

  for (let i = 0; i < normalized.length - 2; i++) {
    const trigram = normalized.slice(i, i + 3);
    let hash = 0;
    for (let j = 0; j < trigram.length; j++) {
      hash = ((hash << 5) - hash + trigram.charCodeAt(j)) | 0;
    }
    const idx = Math.abs(hash) % dimensions;
    vec[idx] += 1;
  }

  const mag = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
  if (mag > 0) {
    for (let i = 0; i < vec.length; i++) {
      vec[i] /= mag;
    }
  }

  return vec;
}

async function main() {
  console.log('[build-rag-index] Reading corpus...');
  const raw = await readFile(CORPUS_PATH, 'utf-8');
  const corpus = JSON.parse(raw);
  console.log(`[build-rag-index] Processing ${corpus.length} entries...`);

  const vectors = [];
  const entries = [];
  const dimensions = 256;

  for (const entry of corpus) {
    const text = [
      entry.title,
      entry.description,
      entry.category,
      entry.id,
    ].join(' ');
    const vec = textToVector(text, dimensions);
    vectors.push(vec);
    entries.push({
      id: entry.id,
      title: entry.title,
      category: entry.category,
      description: entry.description.slice(0, 200),
    });
  }

  const index = {
    dimensions,
    entries,
    vectors,
    builtAt: new Date().toISOString(),
    entryCount: entries.length,
  };

  await writeFile(VECTORS_PATH, JSON.stringify(index), 'utf-8');
  console.log(`[build-rag-index] Written ${entries.length} vectors to ${VECTORS_PATH}`);
}

main().catch((err) => {
  console.error('[build-rag-index] Error:', err.message);
  process.exit(1);
});
