/**
 * Genetic operations for idea breeding.
 * Weighted blend crossover, gaussian mutation, L2 normalization.
 * All operations work on 384-dim embedding vectors (6 blocks x 64 dims).
 */

import { cosineSimilarity } from './similarity';

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
export function mutate(embedding: number[], strength: number): number[] {
  const mutated = new Array(embedding.length);
  for (let i = 0; i < embedding.length; i++) {
    mutated[i] = embedding[i] + gaussianRandom() * strength;
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
  } = {},
): { embedding: number[]; crossoverWeights: number[]; mutationStrength: number }[] {
  const {
    count = 4,
    baseWeights = [0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
    mutationStrength = 0.05,
    weightVariation = 0.15,
  } = options;

  const results = [];
  for (let i = 0; i < count; i++) {
    // Vary weights around the base for each offspring
    const weights = baseWeights.map((w) =>
      Math.max(0, Math.min(1, w + (Math.random() - 0.5) * 2 * weightVariation)),
    );

    const blended = crossover(parentA, parentB, weights);
    const mutated = mutate(blended, mutationStrength);

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
