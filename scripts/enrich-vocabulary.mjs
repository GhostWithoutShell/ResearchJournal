/**
 * Enrich the concept vocabulary from external sources (arxiv, Hacker News, Wikipedia).
 *
 * Usage:
 *   node scripts/enrich-vocabulary.mjs --topic "machine learning"
 *   node scripts/enrich-vocabulary.mjs --topic "neural networks" --source arxiv --max-terms 30
 *   node scripts/enrich-vocabulary.mjs --topic "robotics" --dry-run
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { pipeline } from '@huggingface/transformers';

const __dirname = dirname(fileURLToPath(import.meta.url));
const vocabularyPath = join(__dirname, '..', 'src', 'data', 'vocabulary.json');

// --- CLI argument parsing ---

function parseArgs(argv) {
  const args = { topic: null, source: 'all', maxTerms: 50, dryRun: false };
  for (let i = 2; i < argv.length; i++) {
    switch (argv[i]) {
      case '--topic':
        args.topic = argv[++i];
        break;
      case '--source':
        args.source = argv[++i];
        break;
      case '--max-terms':
        args.maxTerms = parseInt(argv[++i], 10);
        break;
      case '--dry-run':
        args.dryRun = true;
        break;
    }
  }
  if (!args.topic) {
    console.error('Usage: node scripts/enrich-vocabulary.mjs --topic <topic> [--source arxiv|hn|wikipedia|all] [--max-terms 50] [--dry-run]');
    process.exit(1);
  }
  if (!['arxiv', 'hn', 'wikipedia', 'all'].includes(args.source)) {
    console.error(`Invalid source: ${args.source}. Must be one of: arxiv, hn, wikipedia, all`);
    process.exit(1);
  }
  return args;
}

// --- Stop words ---

const STOP_WORDS = new Set([
  // Common English
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
  'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been', 'be', 'have', 'has', 'had',
  'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'shall',
  'can', 'need', 'dare', 'ought', 'used', 'not', 'no', 'nor', 'so', 'yet', 'both',
  'each', 'few', 'more', 'most', 'other', 'some', 'such', 'than', 'too', 'very',
  'just', 'about', 'above', 'after', 'again', 'all', 'also', 'any', 'because',
  'before', 'below', 'between', 'down', 'during', 'even', 'every', 'first',
  'further', 'get', 'got', 'here', 'how', 'however', 'into', 'its', 'itself',
  'last', 'less', 'let', 'like', 'made', 'make', 'many', 'much', 'must', 'new',
  'now', 'off', 'old', 'once', 'one', 'only', 'our', 'out', 'over', 'own',
  'part', 'per', 'put', 'same', 'see', 'seem', 'she', 'show', 'side', 'since',
  'still', 'take', 'tell', 'that', 'their', 'them', 'then', 'there', 'these',
  'they', 'this', 'those', 'through', 'time', 'under', 'until', 'upon', 'use',
  'using', 'want', 'way', 'well', 'what', 'when', 'where', 'which', 'while',
  'who', 'whom', 'why', 'wide', 'work', 'year', 'you', 'your',
  // Common academic words
  'paper', 'results', 'approach', 'method', 'propose', 'proposed', 'based',
  'model', 'models', 'system', 'systems', 'data', 'study', 'analysis',
  'research', 'show', 'shows', 'shown', 'present', 'presents', 'presented',
  'provide', 'provides', 'introduce', 'introduces', 'describe', 'describes',
  'discuss', 'discusses', 'evaluate', 'evaluates', 'demonstrate', 'demonstrates',
  'consider', 'considers', 'investigate', 'investigates', 'examine', 'examines',
  'explore', 'explores', 'develop', 'develops', 'achieve', 'achieves',
  'perform', 'performs', 'report', 'reports', 'apply', 'applies', 'applied',
  'existing', 'previous', 'recent', 'novel', 'various', 'different', 'several',
  'important', 'significant', 'specific', 'particular', 'general', 'common',
  'large', 'small', 'high', 'higher', 'low', 'lower', 'best', 'better',
  'given', 'known', 'well-known', 'state-of-the-art', 'number', 'problem',
  'problems', 'task', 'tasks', 'case', 'cases', 'example', 'examples',
  'following', 'information', 'process', 'effect', 'performance',
]);

function isStopWord(word) {
  return STOP_WORDS.has(word.toLowerCase());
}

// --- Source fetchers ---

async function fetchArxiv(topic) {
  const url = `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(topic)}&start=0&max_results=20&sortBy=relevance`;
  console.log(`  Fetching arxiv: ${url}`);
  const resp = await fetch(url);
  if (!resp.ok) {
    console.warn(`  arxiv request failed: ${resp.status}`);
    return [];
  }
  const xml = await resp.text();

  const texts = [];
  // Extract titles
  const titleMatches = xml.matchAll(/<entry>[\s\S]*?<title>([\s\S]*?)<\/title>/g);
  for (const m of titleMatches) {
    texts.push(m[1].replace(/\s+/g, ' ').trim());
  }
  // Extract summaries
  const summaryMatches = xml.matchAll(/<summary>([\s\S]*?)<\/summary>/g);
  for (const m of summaryMatches) {
    texts.push(m[1].replace(/\s+/g, ' ').trim());
  }
  console.log(`  arxiv: got ${texts.length} text blocks`);
  return texts;
}

async function fetchHackerNews(topic) {
  const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(topic)}&tags=story&hitsPerPage=30`;
  console.log(`  Fetching Hacker News: ${url}`);
  const resp = await fetch(url);
  if (!resp.ok) {
    console.warn(`  HN request failed: ${resp.status}`);
    return [];
  }
  const data = await resp.json();
  const titles = (data.hits || []).map((h) => h.title).filter(Boolean);
  console.log(`  HN: got ${titles.length} titles`);
  return titles;
}

async function fetchWikipedia(topic) {
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topic)}`;
  console.log(`  Fetching Wikipedia: ${url}`);
  const resp = await fetch(url);
  if (resp.ok) {
    const data = await resp.json();
    if (data.extract) {
      console.log(`  Wikipedia: got summary (${data.extract.length} chars)`);
      return [data.extract];
    }
  }

  // Fallback to search API
  console.log('  Wikipedia summary not found, trying search...');
  const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(topic)}&format=json&srlimit=10`;
  const searchResp = await fetch(searchUrl);
  if (!searchResp.ok) {
    console.warn(`  Wikipedia search failed: ${searchResp.status}`);
    return [];
  }
  const searchData = await searchResp.json();
  const snippets = (searchData.query?.search || [])
    .map((r) => r.snippet.replace(/<[^>]+>/g, ''))
    .filter(Boolean);
  console.log(`  Wikipedia search: got ${snippets.length} snippets`);
  return snippets;
}

// --- Term extraction ---

function extractTerms(texts) {
  const termCounts = new Map();

  for (const text of texts) {
    const words = text
      .toLowerCase()
      .replace(/[^a-zа-яёa-z0-9\s-]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 2);

    // Unigrams (4+ chars)
    for (const word of words) {
      if (word.length >= 4 && !isStopWord(word)) {
        termCounts.set(word, (termCounts.get(word) || 0) + 1);
      }
    }

    // Bigrams (combined 7+ chars)
    for (let i = 0; i < words.length - 1; i++) {
      const bigram = `${words[i]} ${words[i + 1]}`;
      if (bigram.length >= 7 && !isStopWord(words[i]) && !isStopWord(words[i + 1])) {
        termCounts.set(bigram, (termCounts.get(bigram) || 0) + 1);
      }
    }

    // Trigrams (combined 10+ chars)
    for (let i = 0; i < words.length - 2; i++) {
      const trigram = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
      if (
        trigram.length >= 10 &&
        !isStopWord(words[i]) &&
        !isStopWord(words[i + 1]) &&
        !isStopWord(words[i + 2])
      ) {
        termCounts.set(trigram, (termCounts.get(trigram) || 0) + 1);
      }
    }
  }

  return termCounts;
}

// --- Main ---

async function main() {
  const args = parseArgs(process.argv);

  console.log(`Enriching vocabulary for topic: "${args.topic}"`);
  console.log(`Source: ${args.source}, Max terms: ${args.maxTerms}, Dry run: ${args.dryRun}`);

  // Fetch from sources
  const texts = [];
  const sources = args.source === 'all' ? ['arxiv', 'hn', 'wikipedia'] : [args.source];

  for (const source of sources) {
    try {
      switch (source) {
        case 'arxiv':
          texts.push(...await fetchArxiv(args.topic));
          break;
        case 'hn':
          texts.push(...await fetchHackerNews(args.topic));
          break;
        case 'wikipedia':
          texts.push(...await fetchWikipedia(args.topic));
          break;
      }
    } catch (err) {
      console.warn(`  Error fetching from ${source}: ${err.message}`);
    }
  }

  if (texts.length === 0) {
    console.log('No text fetched from any source. Exiting.');
    process.exit(0);
  }

  // Extract terms
  const termCounts = extractTerms(texts);
  console.log(`\nExtracted ${termCounts.size} candidate terms`);

  // Load existing vocabulary for deduplication
  let existingVocab = [];
  try {
    existingVocab = JSON.parse(readFileSync(vocabularyPath, 'utf-8'));
  } catch {
    console.log('No existing vocabulary.json found, starting fresh.');
  }

  const existingTerms = new Set(existingVocab.map((v) => v.term.toLowerCase()));

  // Deduplicate against existing vocabulary (case-insensitive)
  const newTerms = Array.from(termCounts.entries())
    .filter(([term]) => !existingTerms.has(term.toLowerCase()));

  console.log(`After deduplication: ${newTerms.length} new terms`);

  // Sort by word count (prefer multi-word), then by frequency
  const sorted = newTerms
    .sort((a, b) => {
      const wordCountA = a[0].split(' ').length;
      const wordCountB = b[0].split(' ').length;
      if (wordCountB !== wordCountA) return wordCountB - wordCountA;
      return b[1] - a[1]; // then by frequency
    })
    .slice(0, args.maxTerms);

  console.log(`Selected ${sorted.length} terms (capped at ${args.maxTerms}):`);
  for (const [term, count] of sorted) {
    console.log(`  ${term} (${count})`);
  }

  if (args.dryRun) {
    console.log('\nDry run — not writing anything.');
    return;
  }

  if (sorted.length === 0) {
    console.log('No new terms to add.');
    return;
  }

  // Compute embeddings
  console.log('\nLoading model (Xenova/paraphrase-multilingual-MiniLM-L12-v2)...');
  const extractor = await pipeline('feature-extraction', 'Xenova/paraphrase-multilingual-MiniLM-L12-v2');

  const newEntries = [];
  const batchSize = 32;
  const terms = sorted.map(([term]) => term);

  for (let i = 0; i < terms.length; i += batchSize) {
    const batch = terms.slice(i, i + batchSize);
    const outputs = await extractor(batch, { pooling: 'mean', normalize: true });

    for (let j = 0; j < batch.length; j++) {
      const embedding = Array.from(outputs[j].data);
      const rounded = embedding.map((v) => parseFloat(v.toFixed(6)));
      newEntries.push({ term: batch[j], embedding: rounded, source: 'web' });
    }

    const done = Math.min(i + batchSize, terms.length);
    process.stdout.write(`\r  ${done}/${terms.length} terms embedded`);
  }

  // Merge into existing vocabulary
  const merged = [...existingVocab, ...newEntries];
  writeFileSync(vocabularyPath, JSON.stringify(merged, null, 2) + '\n');
  console.log(`\nDone. Added ${newEntries.length} terms. Vocabulary now has ${merged.length} total entries.`);
}

main().catch(console.error);
