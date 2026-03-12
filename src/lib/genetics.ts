/**
 * Genetic operations for idea breeding.
 * Weighted blend crossover, gaussian mutation, L2 normalization.
 * All operations work on 384-dim embedding vectors (6 blocks x 64 dims).
 */

import { cosineSimilarity } from './similarity';
import type { ConceptEntry } from './schemas';

const DIMS = 384;
const BLOCKS = 6;
const BLOCK_SIZE = 64; // DIMS / BLOCKS

/**
 * Normalize a vector to unit length (L2 norm = 1).
 */
export function l2Normalize(vec: number[]): number[] {
  let norm = 0;
  for (let i = 0; i < vec.length; i++) {
    norm += vec[i] * vec[i];
  }
  norm = Math.sqrt(norm);
  if (norm === 0) return vec.slice();
  return vec.map((v) => v / norm);
}

/**
 * Weighted blend crossover of two parent embeddings.
 * Each of the 6 blocks has its own weight: 0.0 = all from parentA, 1.0 = all from parentB.
 */
export function crossover(
  parentA: number[],
  parentB: number[],
  weights: number[],
): number[] {
  if (parentA.length !== DIMS || parentB.length !== DIMS) {
    throw new Error(`Parent embeddings must be ${DIMS}-dimensional`);
  }
  if (weights.length !== BLOCKS) {
    throw new Error(`Crossover weights must have ${BLOCKS} elements`);
  }

  const child = new Array(DIMS);
  for (let block = 0; block < BLOCKS; block++) {
    const w = weights[block];
    const start = block * BLOCK_SIZE;
    const end = start + BLOCK_SIZE;
    for (let i = start; i < end; i++) {
      child[i] = (1 - w) * parentA[i] + w * parentB[i];
    }
  }

  return l2Normalize(child);
}

/**
 * Apply gaussian mutation to an embedding vector.
 * strength controls the standard deviation of the noise (0.01 - 0.3 recommended).
 */
/**
 * Apply mutation to an embedding vector.
 * When vocabulary is provided, mutation is biased toward semantic anchors.
 * Anchor strength adapts: weak mutation = strong anchoring, strong mutation = more randomness.
 * Without vocabulary, falls back to pure gaussian noise (original behavior).
 */
export function mutate(
  embedding: number[],
  strength: number,
  vocabulary?: ConceptEntry[],
): number[] {
  if (!vocabulary || vocabulary.length === 0) {
    // Fallback: pure gaussian noise (original behavior)
    const mutated = new Array(embedding.length);
    for (let i = 0; i < embedding.length; i++) {
      mutated[i] = embedding[i] + gaussianRandom() * strength;
    }
    return l2Normalize(mutated);
  }

  // Adaptive anchoring: weaker mutation = stronger anchor pull
  const anchorStrength = 1 - strength;

  // Semantic direction: toward the mean of top-3 nearest concepts
  const anchor = findSemanticAnchor(embedding, vocabulary);
  const semanticDir = new Array(embedding.length);
  let semanticNorm = 0;
  for (let i = 0; i < embedding.length; i++) {
    semanticDir[i] = anchor[i] - embedding[i];
    semanticNorm += semanticDir[i] * semanticDir[i];
  }
  semanticNorm = Math.sqrt(semanticNorm) || 1;
  for (let i = 0; i < embedding.length; i++) {
    semanticDir[i] /= semanticNorm;
  }

  // Random direction: gaussian noise normalized
  const randomDir = new Array(embedding.length);
  let randomNorm = 0;
  for (let i = 0; i < embedding.length; i++) {
    randomDir[i] = gaussianRandom();
    randomNorm += randomDir[i] * randomDir[i];
  }
  randomNorm = Math.sqrt(randomNorm) || 1;
  for (let i = 0; i < embedding.length; i++) {
    randomDir[i] /= randomNorm;
  }

  // Blend semantic and random directions
  const blended = new Array(embedding.length);
  let blendedNorm = 0;
  for (let i = 0; i < embedding.length; i++) {
    blended[i] = anchorStrength * semanticDir[i] + (1 - anchorStrength) * randomDir[i];
    blendedNorm += blended[i] * blended[i];
  }
  blendedNorm = Math.sqrt(blendedNorm) || 1;
  for (let i = 0; i < embedding.length; i++) {
    blended[i] /= blendedNorm;
  }

  // Apply mutation
  const mutated = new Array(embedding.length);
  for (let i = 0; i < embedding.length; i++) {
    mutated[i] = embedding[i] + strength * blended[i];
  }

  return l2Normalize(mutated);
}

/**
 * Box-Muller transform for generating normally distributed random numbers.
 */
function gaussianRandom(): number {
  const u1 = Math.random();
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1 || 1e-10)) * Math.cos(2 * Math.PI * u2);
}

/**
 * Find the semantic anchor — mean embedding of the top-K nearest vocabulary entries.
 * Used to bias mutation toward meaningful regions of the embedding space.
 */
function findSemanticAnchor(
  embedding: number[],
  vocabulary: ConceptEntry[],
  topK: number = 3,
): number[] {
  const k = Math.min(topK, vocabulary.length);
  if (k === 0) return embedding.slice();

  const scored = vocabulary.map((entry) => ({
    embedding: entry.embedding,
    score: cosineSimilarity(embedding, entry.embedding),
  }));
  scored.sort((a, b) => b.score - a.score);
  const topEntries = scored.slice(0, k);

  // Mean of top-K embeddings
  const anchor = new Array(embedding.length).fill(0);
  for (const entry of topEntries) {
    for (let i = 0; i < embedding.length; i++) {
      anchor[i] += entry.embedding[i];
    }
  }
  for (let i = 0; i < embedding.length; i++) {
    anchor[i] /= k;
  }

  return anchor;
}

/**
 * Generate a batch of offspring from two parents.
 * Produces `count` children with varied crossover weights and mutation.
 */
export function generateOffspring(
  parentA: number[],
  parentB: number[],
  options: {
    count?: number;
    baseWeights?: number[];
    mutationStrength?: number;
    weightVariation?: number;
    vocabulary?: ConceptEntry[];
  } = {},
): { embedding: number[]; crossoverWeights: number[]; mutationStrength: number }[] {
  const {
    count = 4,
    baseWeights = [0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
    mutationStrength = 0.05,
    weightVariation = 0.15,
    vocabulary,
  } = options;

  const results = [];
  for (let i = 0; i < count; i++) {
    // Vary weights around the base for each offspring
    const weights = baseWeights.map((w) =>
      Math.max(0, Math.min(1, w + (Math.random() - 0.5) * 2 * weightVariation)),
    );

    const blended = crossover(parentA, parentB, weights);
    const mutated = mutate(blended, mutationStrength, vocabulary);

    results.push({
      embedding: mutated,
      crossoverWeights: weights,
      mutationStrength,
    });
  }

  return results;
}

/**
 * Score an offspring embedding on novelty, balance, and coverage.
 * Returns scores between 0 and 1, plus a weighted total.
 */
export function computeFitness(
  offspringEmbedding: number[],
  parentA: number[],
  parentB: number[],
  existingEmbeddings: number[][],
  decodedConcepts: string[],
): { novelty: number; balance: number; coverage: number; total: number } {
  // Novelty: average distance to all existing ideas (1 - cosine_similarity).
  // If no existing ideas, novelty is 1 (maximally novel).
  let novelty = 1;
  if (existingEmbeddings.length > 0) {
    let totalDist = 0;
    for (const existing of existingEmbeddings) {
      totalDist += 1 - cosineSimilarity(offspringEmbedding, existing);
    }
    novelty = totalDist / existingEmbeddings.length;
  }

  // Balance: how evenly the offspring inherits from both parents.
  const simA = cosineSimilarity(offspringEmbedding, parentA);
  const simB = cosineSimilarity(offspringEmbedding, parentB);
  const balance = 1 - Math.abs(simA - simB);

  // Coverage: diversity of decoded concepts. unique / total.
  let coverage = 0;
  if (decodedConcepts.length > 0) {
    const uniqueCount = new Set(decodedConcepts.map(c => c.toLowerCase())).size;
    coverage = uniqueCount / decodedConcepts.length;
  }

  const total = novelty * 0.4 + balance * 0.3 + coverage * 0.3;

  return { novelty, balance, coverage, total };
}
