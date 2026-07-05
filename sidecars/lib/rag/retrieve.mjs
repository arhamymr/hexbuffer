/**
 * Lightweight RAG (Retrieval-Augmented Generation) retrieval layer.
 *
 * Matches a security finding against a pre-built vector index of CWE/OWASP
 * knowledge entries and returns the most relevant context to inject into
 * the AI agent's prompt.
 */

import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const currentDir = typeof __dirname !== 'undefined' ? __dirname : import.meta.dirname;

/**
 * Cosine similarity between two vectors.
 */
function cosineSimilarity(a, b) {
  if (a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Simple text-to-vector using character n-gram hashing.
 * This provides a lightweight embedding without requiring an API call.
 * For production, replace with actual embedding API (e.g., openai.embedding()).
 */
function textToVector(text, dimensions = 256) {
  const vec = new Array(dimensions).fill(0);

  // Character trigram hashing
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

  // Normalize
  const mag = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
  if (mag > 0) {
    for (let i = 0; i < vec.length; i++) {
      vec[i] /= mag;
    }
  }

  return vec;
}

/**
 * Load the pre-built vector index.
 */
async function loadIndex() {
  try {
    let indexPath = join(currentDir, '..', 'knowledge', 'vectors.json');
    if (!existsSync(indexPath)) {
      indexPath = join(currentDir, '..', '..', 'knowledge', 'vectors.json');
    }
    const raw = await readFile(indexPath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    // Fall back to corpus directly for keyword matching
    return null;
  }
}

/**
 * Build a search text from a finding.
 */
function findingToSearchText(finding) {
  return [
    finding.title || '',
    finding.category || '',
    finding.rule_id || '',
    finding.match_text || '',
  ].filter(Boolean).join(' ');
}

/**
 * Retrieve relevant knowledge entries for a finding.
 * @param {Object} finding - The security finding
 * @param {number} topK - Number of results to return
 * @returns {Promise<Array>} Top matching knowledge entries
 */
export async function retrieveContext(finding, topK = 3) {
  const searchText = findingToSearchText(finding);
  if (!searchText.trim()) return [];

  const index = await loadIndex();

  // If we have a pre-built index, use it
  if (index && index.vectors && index.entries) {
    const queryVec = textToVector(searchText, index.dimensions || 256);
    const scored = index.entries.map((entry, i) => ({
      ...entry,
      score: cosineSimilarity(queryVec, index.vectors[i]),
    }));

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .filter((e) => e.score > 0.1);
  }

  // Fallback: keyword matching against corpus
  try {
    let corpusPath = join(currentDir, '..', 'knowledge', 'corpus.json');
    if (!existsSync(corpusPath)) {
      corpusPath = join(currentDir, '..', '..', 'knowledge', 'corpus.json');
    }
    const raw = await readFile(corpusPath, 'utf-8');
    const corpus = JSON.parse(raw);

    const searchLower = searchText.toLowerCase();
    const scored = corpus.map((entry) => {
      const entryText = [
        entry.title,
        entry.description,
        entry.category,
        entry.id,
      ].join(' ').toLowerCase();

      // Simple keyword intersection score
      const searchWords = new Set(searchLower.split(/\s+/));
      const entryWords = new Set(entryText.split(/\s+/));
      let intersection = 0;
      for (const word of searchWords) {
        if (entryWords.has(word)) intersection++;
      }
      const score = intersection / Math.max(searchWords.size, 1);

      return { ...entry, score };
    });

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .filter((e) => e.score > 0.05);
  } catch {
    return [];
  }
}

/**
 * Check if finding category has known knowledge entries.
 */
export function hasKnowledgeForCategory(category) {
  const categories = ['hardcoded_secret', 'vulnerable_dependency', 'injection', 'authentication', 'cryptographic_failure'];
  return categories.includes(category);
}
