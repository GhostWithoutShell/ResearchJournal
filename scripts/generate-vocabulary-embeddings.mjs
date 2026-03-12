/**
 * Pre-compute embeddings for the concept vocabulary using paraphrase-multilingual-MiniLM-L12-v2.
 * Also extracts terms from existing ideas.
 *
 * Usage: node scripts/generate-vocabulary-embeddings.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { pipeline } from '@huggingface/transformers';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ideasPath = join(__dirname, '..', 'src', 'data', 'ideas.json');
const outputPath = join(__dirname, '..', 'src', 'data', 'vocabulary.json');

const DICTIONARY_TERMS = JSON.parse(readFileSync(join(__dirname, '..', 'src', 'data', 'dictionary-terms.json'), 'utf-8'));

/**
 * Extract unique terms from ideas (same logic as concept-vocabulary.ts).
 */
function extractTermsFromIdeas(ideas) {
  const termSet = new Set();

  for (const idea of ideas) {
    const text = `${idea.title} ${idea.description}`;
    const words = text
      .toLowerCase()
      .replace(/[^a-zA-Zа-яА-ЯёЁ0-9\s-]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 3);

    for (const word of words) {
      termSet.add(word);
    }

    const titleWords = idea.title
      .toLowerCase()
      .replace(/[^a-zA-Zа-яА-ЯёЁ0-9\s-]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 2);

    for (let i = 0; i < titleWords.length - 1; i++) {
      termSet.add(`${titleWords[i]} ${titleWords[i + 1]}`);
    }
  }

  return Array.from(termSet);
}

async function main() {
  console.log('Loading model (Xenova/paraphrase-multilingual-MiniLM-L12-v2)...');
  const extractor = await pipeline('feature-extraction', 'Xenova/paraphrase-multilingual-MiniLM-L12-v2');

  const ideas = JSON.parse(readFileSync(ideasPath, 'utf-8'));
  const ideaTerms = extractTermsFromIdeas(ideas);

  console.log(`Extracted ${ideaTerms.length} terms from ideas`);
  console.log(`Dictionary has ${DICTIONARY_TERMS.length} terms`);

  // Deduplicate across both sources
  const allTermsMap = new Map();
  for (const term of ideaTerms) {
    allTermsMap.set(term, 'ideas');
  }
  for (const term of DICTIONARY_TERMS) {
    if (!allTermsMap.has(term.toLowerCase())) {
      allTermsMap.set(term, 'dictionary');
    }
  }

  const allTerms = Array.from(allTermsMap.entries());
  console.log(`Total unique terms: ${allTerms.length}`);
  console.log('Computing embeddings...');

  const vocabulary = [];
  const batchSize = 32;

  for (let i = 0; i < allTerms.length; i += batchSize) {
    const batch = allTerms.slice(i, i + batchSize);
    const texts = batch.map(([term]) => term);

    const outputs = await extractor(texts, { pooling: 'mean', normalize: true });

    for (let j = 0; j < batch.length; j++) {
      const [term, source] = batch[j];
      // outputs is a Tensor — extract the j-th row
      const embedding = Array.from(outputs[j].data);
      // Round to 6 decimal places to reduce file size
      const rounded = embedding.map((v) => parseFloat(v.toFixed(6)));

      vocabulary.push({ term, embedding: rounded, source });
    }

    const done = Math.min(i + batchSize, allTerms.length);
    process.stdout.write(`\r  ${done}/${allTerms.length} terms processed`);
  }

  console.log('\nWriting vocabulary.json...');
  writeFileSync(outputPath, JSON.stringify(vocabulary, null, 2) + '\n');
  console.log(`Done. ${vocabulary.length} terms with embeddings saved to src/data/vocabulary.json`);
}

main().catch(console.error);
