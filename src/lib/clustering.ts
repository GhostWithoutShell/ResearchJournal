/**
 * DBSCAN clustering on 2D points.
 * Returns cluster label per point (-1 = noise).
 */

interface Point2D {
  x: number;
  y: number;
}

export interface ClusterResult {
  labels: number[];       // cluster index per point, -1 = noise
  clusterCount: number;   // number of clusters found (excluding noise)
}

function euclideanDistance(a: Point2D, b: Point2D): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function regionQuery(points: Point2D[], pointIdx: number, eps: number): number[] {
  const neighbors: number[] = [];
  for (let i = 0; i < points.length; i++) {
    if (euclideanDistance(points[pointIdx], points[i]) <= eps) {
      neighbors.push(i);
    }
  }
  return neighbors;
}

export function dbscan(points: Point2D[], eps: number, minPts: number): ClusterResult {
  const n = points.length;
  const labels = new Array<number>(n).fill(-2); // -2 = unvisited
  let clusterId = 0;

  for (let i = 0; i < n; i++) {
    if (labels[i] !== -2) continue; // already processed

    const neighbors = regionQuery(points, i, eps);

    if (neighbors.length < minPts) {
      labels[i] = -1; // noise
      continue;
    }

    // Start new cluster
    labels[i] = clusterId;
    const seed = [...neighbors];
    seed.splice(seed.indexOf(i), 1);

    for (let j = 0; j < seed.length; j++) {
      const q = seed[j];

      if (labels[q] === -1) {
        labels[q] = clusterId; // border point
      }

      if (labels[q] !== -2) continue; // already processed

      labels[q] = clusterId;
      const qNeighbors = regionQuery(points, q, eps);

      if (qNeighbors.length >= minPts) {
        for (const nn of qNeighbors) {
          if (!seed.includes(nn)) {
            seed.push(nn);
          }
        }
      }
    }

    clusterId++;
  }

  return { labels, clusterCount: clusterId };
}

/**
 * Auto-estimate eps based on k-nearest neighbor distances.
 * Uses the "knee" of sorted k-NN distances.
 */
export function estimateEps(points: Point2D[], k: number = 4): number {
  const knnDistances: number[] = [];

  for (let i = 0; i < points.length; i++) {
    const distances: number[] = [];
    for (let j = 0; j < points.length; j++) {
      if (i !== j) distances.push(euclideanDistance(points[i], points[j]));
    }
    distances.sort((a, b) => a - b);
    knnDistances.push(distances[Math.min(k - 1, distances.length - 1)]);
  }

  knnDistances.sort((a, b) => a - b);

  // Simple heuristic: pick the distance at ~70th percentile
  const idx = Math.floor(knnDistances.length * 0.7);
  return knnDistances[idx] || 1;
}
