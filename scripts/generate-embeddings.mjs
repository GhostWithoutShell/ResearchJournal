/**
 * Generate deterministic embeddings for all ideas in ideas.json.
 * Uses the same algorithm as src/lib/embeddings.ts fakeDeterministicEmbedding.
 *
 * Usage: node scripts/generate-embeddings.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ideasPath = join(__dirname, '..', 'src', 'data', 'ideas.json');

function fakeDeterministicEmbedding(text) {
  const embedding = new Array(384);
  let hash = 0;

  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) & 0x7fffffff;
  }

  for (let i = 0; i < 384; i++) {
    hash = (hash * 1103515245 + 12345) & 0x7fffffff;
    embedding[i] = ((hash / 0x7fffffff) * 2 - 1) * 0.5;
  }

  const norm = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
  if (norm > 0) {
    for (let i = 0; i < 384; i++) {
      embedding[i] = parseFloat((embedding[i] / norm).toFixed(6));
    }
  }

  return embedding;
}

const ideas = JSON.parse(readFileSync(ideasPath, 'utf-8'));
let updated = 0;

for (const idea of ideas) {
  if (!idea.embedding || idea.embedding.length === 0) {
    const text = `${idea.title} ${idea.description}`;
    idea.embedding = fakeDeterministicEmbedding(text);
    updated++;
    console.log(`Generated embedding for: ${idea.title}`);
  }
}

writeFileSync(ideasPath, JSON.stringify(ideas, null, 2) + '\n');
console.log(`Done. Updated ${updated}/${ideas.length} ideas.`);
