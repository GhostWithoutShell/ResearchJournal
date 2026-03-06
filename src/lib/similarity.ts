/**
 * Compute cosine similarity between two vectors.
 * Returns a value between -1 and 1, where 1 means identical direction.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector length mismatch: ${a.length} vs ${b.length}`);
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;

  return dotProduct / denominator;
}

/**
 * Find the top-K most similar ideas to a given embedding.
 */
export function findSimilar(
  targetEmbedding: number[],
  candidates: { id: string; embedding: number[] }[],
  topK: number = 5,
  excludeId?: string,
): { id: string; similarity: number }[] {
  return candidates
    .filter((c) => c.id !== excludeId)
    .map((c) => ({
      id: c.id,
      similarity: cosineSimilarity(targetEmbedding, c.embedding),
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
}
