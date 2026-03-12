import { UMAP } from 'umap-js';

export interface ProjectionResult {
  coordinates: { x: number; y: number }[];
}

/**
 * Project high-dimensional embeddings to 2D using UMAP.
 * All computation runs in-browser.
 */
export function projectUMAP(
  embeddings: number[][],
  options?: { nNeighbors?: number; minDist?: number; spread?: number }
): ProjectionResult {
  const nNeighbors = options?.nNeighbors ?? Math.min(15, Math.max(2, embeddings.length - 1));
  const minDist = options?.minDist ?? 0.1;
  const spread = options?.spread ?? 1.0;

  const umap = new UMAP({
    nNeighbors,
    minDist,
    spread,
    nComponents: 2,
  });

  const result = umap.fit(embeddings);

  return {
    coordinates: result.map(([x, y]: number[]) => ({ x, y })),
  };
}
