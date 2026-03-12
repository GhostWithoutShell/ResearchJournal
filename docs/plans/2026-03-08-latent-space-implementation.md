# Latent Space Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a `/latent-space` page that projects all ideas from 384-dim embeddings to 2D via UMAP, clusters them with DBSCAN, and renders an interactive star map with d3.

**Architecture:** New Astro page + React component. UMAP projection and DBSCAN clustering run in-browser on page load. D3 renders SVG with zoom/pan, tooltips, and click navigation. Drafts without embeddings get them generated on the fly.

**Tech Stack:** `umap-js` for dimensionality reduction, custom DBSCAN (no dep needed — simple algorithm), `d3` for SVG rendering (already in project), nanostores for state.

---

### Task 1: Install umap-js dependency

**Files:**
- Modify: `package.json`

**Step 1: Install package**

Run: `npm install umap-js`

**Step 2: Verify installation**

Run: `npm ls umap-js`
Expected: `umap-js@x.x.x` in dependency tree

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat(latent-space): add umap-js dependency"
```

---

### Task 2: Implement DBSCAN clustering algorithm

**Files:**
- Create: `src/lib/clustering.ts`
- Create: `tests/e2e/latent-space.spec.ts` (placeholder — will add tests per task)

**Step 1: Write clustering.ts**

```typescript
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
```

**Step 2: Commit**

```bash
git add src/lib/clustering.ts
git commit -m "feat(latent-space): implement DBSCAN clustering algorithm"
```

---

### Task 3: Implement dimensionality reduction wrapper

**Files:**
- Create: `src/lib/dimensionality-reduction.ts`

**Step 1: Write dimensionality-reduction.ts**

```typescript
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
```

**Step 2: Commit**

```bash
git add src/lib/dimensionality-reduction.ts
git commit -m "feat(latent-space): add UMAP dimensionality reduction wrapper"
```

---

### Task 4: Create the Astro page

**Files:**
- Create: `src/pages/latent-space.astro`
- Modify: `src/components/astro/Header.astro` — add nav link

**Step 1: Write latent-space.astro**

Follow the pattern from `graph.astro`: load ideas at build time, strip heavy data selectively, pass to React component.

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import LatentSpace from '../components/react/LatentSpace';
import ideasData from '../data/ideas.json';

// Pass full embeddings — needed for projection
const ideas = ideasData.map((idea: any) => ({
  id: idea.id,
  title: idea.title,
  status: idea.status,
  tags: idea.tags,
  createdAt: idea.createdAt,
  embedding: idea.embedding,
}));
---
<BaseLayout title="Latent Space — Research Journal">
  <div class="page-header">
    <h1 class="page-title">Latent Space</h1>
    <p class="page-subtitle">2D projection of idea embeddings. Semantic clusters appear as galaxies.</p>
  </div>
  <LatentSpace
    client:only="react"
    ideas={ideas}
  />
</BaseLayout>
```

**Step 2: Add nav link to Header.astro**

Add `{ href: '/latent-space', label: 'latent space' }` to the `navLinks` array after `graph`.

**Step 3: Commit**

```bash
git add src/pages/latent-space.astro src/components/astro/Header.astro
git commit -m "feat(latent-space): add Astro page and nav link"
```

---

### Task 5: Create the main LatentSpace React component

**Files:**
- Create: `src/components/react/LatentSpace.tsx`

This is the core component. It:
1. Loads build-time ideas + drafts from store
2. Runs UMAP projection on all embeddings
3. Runs DBSCAN clustering on 2D coordinates
4. Renders SVG with d3 (zoom/pan, stars, clusters, tooltips)

**Step 1: Write LatentSpace.tsx**

```tsx
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useStore } from '@nanostores/react';
import * as d3 from 'd3';
import { $draftIdeas, $buildTimeIdeas, initializeStore } from '../../stores/ideas';
import { projectUMAP } from '../../lib/dimensionality-reduction';
import { dbscan, estimateEps } from '../../lib/clustering';
import { generateEmbedding } from '../../lib/embeddings';

interface IdeaInput {
  id: string;
  title: string;
  status: string;
  tags: string[];
  createdAt: string;
  embedding: number[];
}

interface Props {
  ideas: IdeaInput[];
}

interface ProjectedIdea {
  id: string;
  title: string;
  status: string;
  tags: string[];
  createdAt: string;
  x: number;
  y: number;
  cluster: number;
}

const STATUS_COLORS: Record<string, string> = {
  'idea': '#33cc33',
  'in-progress': '#ffaa00',
  'done': '#00ff88',
  'killed': '#cc3333',
};

const CLUSTER_COLORS = [
  'rgba(0, 255, 136, 0.08)',
  'rgba(51, 204, 51, 0.08)',
  'rgba(255, 170, 0, 0.08)',
  'rgba(0, 170, 255, 0.08)',
  'rgba(204, 51, 255, 0.08)',
  'rgba(255, 85, 85, 0.08)',
  'rgba(255, 255, 0, 0.08)',
  'rgba(0, 255, 255, 0.08)',
];

const STAR_CLUSTER_COLORS = [
  '#00ff88',
  '#33cc33',
  '#ffaa00',
  '#00aaff',
  '#cc33ff',
  '#ff5555',
  '#ffff00',
  '#00ffff',
];

export default function LatentSpace({ ideas: buildTimeIdeas }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [displayMode, setDisplayMode] = useState<'starmap' | 'status'>('starmap');
  const [showTrajectory, setShowTrajectory] = useState(false);
  const [projectedIdeas, setProjectedIdeas] = useState<ProjectedIdea[]>([]);

  const drafts = useStore($draftIdeas);

  // Initialize store
  useEffect(() => {
    initializeStore(buildTimeIdeas as any);
  }, [buildTimeIdeas]);

  // Merge build-time + drafts
  const allIdeas = useMemo(() => {
    const draftMapped = drafts.map(d => ({
      id: d.id,
      title: d.title,
      status: d.status,
      tags: d.tags,
      createdAt: d.createdAt,
      embedding: d.embedding,
    }));
    return [...buildTimeIdeas, ...draftMapped];
  }, [buildTimeIdeas, drafts]);

  // Run projection
  useEffect(() => {
    async function project() {
      if (allIdeas.length < 3) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Ensure all have embeddings
        const withEmbeddings = await Promise.all(
          allIdeas.map(async (idea) => {
            if (idea.embedding && idea.embedding.length === 384) return idea;
            const emb = await generateEmbedding(idea.title);
            return { ...idea, embedding: emb };
          })
        );

        const embeddings = withEmbeddings.map(i => i.embedding);
        const { coordinates } = projectUMAP(embeddings);

        // Cluster
        const eps = estimateEps(coordinates);
        const { labels } = dbscan(coordinates, eps, 2);

        const projected = withEmbeddings.map((idea, i) => ({
          id: idea.id,
          title: idea.title,
          status: idea.status,
          tags: idea.tags,
          createdAt: idea.createdAt,
          x: coordinates[i].x,
          y: coordinates[i].y,
          cluster: labels[i],
        }));

        setProjectedIdeas(projected);
      } catch (e) {
        setError('Failed to compute projection. Try refreshing.');
        console.error(e);
      } finally {
        setLoading(false);
      }
    }

    project();
  }, [allIdeas]);

  // Render with d3
  useEffect(() => {
    if (!svgRef.current || !containerRef.current || projectedIdeas.length === 0) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = Math.max(500, window.innerHeight - 300);

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    svg.attr('width', width).attr('height', height);

    // Scale coordinates to fit
    const xExtent = d3.extent(projectedIdeas, d => d.x) as [number, number];
    const yExtent = d3.extent(projectedIdeas, d => d.y) as [number, number];
    const padding = 60;

    const xScale = d3.scaleLinear().domain(xExtent).range([padding, width - padding]);
    const yScale = d3.scaleLinear().domain(yExtent).range([padding, height - padding]);

    // Main group for zoom
    const g = svg.append('g');

    // Zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 5])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Draw cluster backgrounds (star map mode)
    if (displayMode === 'starmap') {
      const clusters = new Map<number, ProjectedIdea[]>();
      projectedIdeas.forEach(idea => {
        if (idea.cluster >= 0) {
          if (!clusters.has(idea.cluster)) clusters.set(idea.cluster, []);
          clusters.get(idea.cluster)!.push(idea);
        }
      });

      clusters.forEach((ideas, clusterId) => {
        const cx = d3.mean(ideas, d => xScale(d.x))!;
        const cy = d3.mean(ideas, d => yScale(d.y))!;
        const maxDist = d3.max(ideas, d => {
          const dx = xScale(d.x) - cx;
          const dy = yScale(d.y) - cy;
          return Math.sqrt(dx * dx + dy * dy);
        })! + 40;

        const color = CLUSTER_COLORS[clusterId % CLUSTER_COLORS.length];

        // Radial gradient for galaxy effect
        const gradId = `cluster-grad-${clusterId}`;
        const defs = svg.select('defs').empty() ? svg.append('defs') : svg.select('defs');
        const grad = defs.append('radialGradient').attr('id', gradId);
        const baseColor = STAR_CLUSTER_COLORS[clusterId % STAR_CLUSTER_COLORS.length];
        grad.append('stop').attr('offset', '0%').attr('stop-color', baseColor).attr('stop-opacity', 0.12);
        grad.append('stop').attr('offset', '70%').attr('stop-color', baseColor).attr('stop-opacity', 0.04);
        grad.append('stop').attr('offset', '100%').attr('stop-color', baseColor).attr('stop-opacity', 0);

        g.append('circle')
          .attr('cx', cx)
          .attr('cy', cy)
          .attr('r', maxDist)
          .attr('fill', `url(#${gradId})`)
          .attr('class', 'cluster-bg');
      });
    }

    // Draw trajectory line
    if (showTrajectory) {
      const sorted = [...projectedIdeas].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      const line = d3.line<ProjectedIdea>()
        .x(d => xScale(d.x))
        .y(d => yScale(d.y))
        .curve(d3.curveCatmullRom);

      const path = g.append('path')
        .datum(sorted)
        .attr('d', line)
        .attr('fill', 'none')
        .attr('stroke', 'rgba(0, 255, 136, 0.2)')
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', function() {
          return this.getTotalLength();
        })
        .attr('stroke-dashoffset', function() {
          return this.getTotalLength();
        });

      path.transition()
        .duration(2000)
        .ease(d3.easeLinear)
        .attr('stroke-dashoffset', 0);
    }

    // Tooltip
    const tooltip = d3.select(container)
      .append('div')
      .attr('class', 'latent-tooltip')
      .style('position', 'absolute')
      .style('pointer-events', 'none')
      .style('opacity', 0);

    // Draw points (stars)
    const points = g.selectAll('.idea-point')
      .data(projectedIdeas)
      .enter()
      .append('circle')
      .attr('class', 'idea-point')
      .attr('cx', d => xScale(d.x))
      .attr('cy', d => yScale(d.y))
      .attr('r', d => d.cluster >= 0 ? 5 : 3)
      .attr('fill', d => {
        if (displayMode === 'status') {
          return STATUS_COLORS[d.status] || '#33cc33';
        }
        if (d.cluster >= 0) {
          return STAR_CLUSTER_COLORS[d.cluster % STAR_CLUSTER_COLORS.length];
        }
        return 'rgba(51, 204, 51, 0.4)';
      })
      .attr('stroke', 'none')
      .style('cursor', 'pointer')
      .on('mouseenter', (event, d) => {
        d3.select(event.currentTarget).attr('r', 8);
        tooltip
          .html(`<strong>${d.title}</strong><br/><span style="opacity:0.7">${d.createdAt.split('T')[0]}</span>`)
          .style('left', (event.offsetX + 12) + 'px')
          .style('top', (event.offsetY - 10) + 'px')
          .style('opacity', 1);
      })
      .on('mouseleave', (event, d) => {
        d3.select(event.currentTarget).attr('r', d.cluster >= 0 ? 5 : 3);
        tooltip.style('opacity', 0);
      })
      .on('click', (event, d) => {
        const isDraft = d.id.startsWith('draft-');
        window.location.href = isDraft ? `/draft?id=${d.id}` : `/idea/${d.id}`;
      });

    // Glow effect for stars
    if (displayMode === 'starmap') {
      points.attr('filter', 'url(#glow)');
      const defs = svg.select('defs').empty() ? svg.append('defs') : svg.select('defs');
      const filter = defs.append('filter').attr('id', 'glow');
      filter.append('feGaussianBlur').attr('stdDeviation', '2').attr('result', 'blur');
      const feMerge = filter.append('feMerge');
      feMerge.append('feMergeNode').attr('in', 'blur');
      feMerge.append('feMergeNode').attr('in', 'SourceGraphic');
    }

    // Cleanup
    return () => {
      tooltip.remove();
    };
  }, [projectedIdeas, displayMode, showTrajectory]);

  if (allIdeas.length < 3) {
    return (
      <div className="latent-empty">
        <p>Add more ideas to explore the latent space.</p>
        <p className="latent-empty-hint">At least 3 ideas with embeddings are needed for projection.</p>
      </div>
    );
  }

  return (
    <div className="latent-space-container">
      <div className="latent-controls">
        <div className="control-group">
          <label className="control-label">Display</label>
          <div className="toggle-group">
            <button
              className={`toggle-btn ${displayMode === 'starmap' ? 'active' : ''}`}
              onClick={() => setDisplayMode('starmap')}
            >
              Star Map
            </button>
            <button
              className={`toggle-btn ${displayMode === 'status' ? 'active' : ''}`}
              onClick={() => setDisplayMode('status')}
            >
              Status
            </button>
          </div>
        </div>

        <div className="control-group">
          <label className="control-label">Trajectory</label>
          <button
            className={`toggle-btn ${showTrajectory ? 'active' : ''}`}
            onClick={() => setShowTrajectory(!showTrajectory)}
          >
            {showTrajectory ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {loading && (
        <div className="latent-loading">
          <span className="loading-text">Computing projection...</span>
        </div>
      )}

      {error && (
        <div className="latent-error">{error}</div>
      )}

      <div className="latent-map" ref={containerRef}>
        <svg ref={svgRef} className="latent-svg" />
      </div>

      {displayMode === 'status' && (
        <div className="latent-legend">
          {Object.entries(STATUS_COLORS).map(([status, color]) => (
            <span key={status} className="legend-item">
              <span className="legend-dot" style={{ background: color }} />
              {status}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/react/LatentSpace.tsx
git commit -m "feat(latent-space): create main LatentSpace React component"
```

---

### Task 6: Add CSS styles for Latent Space

**Files:**
- Modify: `src/styles/journal.css`

**Step 1: Add latent space styles**

Append to end of `journal.css`:

```css
/* === Latent Space === */
.latent-space-container {
  margin-top: var(--spacing-lg);
}

.latent-controls {
  display: flex;
  gap: var(--spacing-lg);
  align-items: center;
  flex-wrap: wrap;
  padding: var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: var(--color-surface);
  margin-bottom: var(--spacing-md);
}

.control-group {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.control-label {
  font-size: 0.75rem;
  color: var(--color-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.toggle-group {
  display: flex;
  gap: 2px;
}

.toggle-btn {
  background: var(--color-dim);
  border: 1px solid var(--color-border);
  color: var(--color-muted);
  padding: 4px 12px;
  font-family: var(--font-body);
  font-size: 0.8125rem;
  cursor: pointer;
  transition: all 0.2s;
}

.toggle-btn:hover {
  color: var(--color-text);
}

.toggle-btn.active {
  background: var(--color-muted);
  color: var(--color-bg);
  border-color: var(--color-muted);
}

.latent-map {
  position: relative;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: var(--color-bg);
  overflow: hidden;
}

.latent-svg {
  display: block;
  width: 100%;
}

.latent-loading {
  text-align: center;
  padding: var(--spacing-xl);
  color: var(--color-muted);
}

.loading-text {
  animation: blink 1s step-end infinite;
}

.latent-error {
  color: #cc3333;
  padding: var(--spacing-md);
  border: 1px solid #cc3333;
  border-radius: 4px;
  margin-bottom: var(--spacing-md);
}

.latent-empty {
  text-align: center;
  padding: var(--spacing-2xl);
  color: var(--color-muted);
}

.latent-empty-hint {
  font-size: 0.8125rem;
  margin-top: var(--spacing-sm);
  opacity: 0.6;
}

.latent-tooltip {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  padding: 6px 10px;
  font-size: 0.8125rem;
  color: var(--color-text);
  border-radius: 4px;
  z-index: 100;
  max-width: 200px;
  pointer-events: none;
}

.latent-legend {
  display: flex;
  gap: var(--spacing-md);
  justify-content: center;
  padding: var(--spacing-md);
  margin-top: var(--spacing-sm);
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.75rem;
  color: var(--color-muted);
}

.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}
```

**Step 2: Commit**

```bash
git add src/styles/journal.css
git commit -m "feat(latent-space): add CSS styles for latent space page"
```

---

### Task 7: Write E2E tests

**Files:**
- Create: `tests/e2e/latent-space.spec.ts`

**Step 1: Write tests**

```typescript
import { test, expect } from '@playwright/test';

test('latent space page loads with title', async ({ page }) => {
  await page.goto('/latent-space');
  await expect(page.locator('h1.page-title')).toHaveText('Latent Space');
});

test('latent space shows subtitle', async ({ page }) => {
  await page.goto('/latent-space');
  await expect(page.locator('.page-subtitle')).toBeVisible();
});

test('latent space shows controls panel', async ({ page }) => {
  await page.goto('/latent-space');
  await expect(page.locator('.latent-controls')).toBeVisible({ timeout: 10000 });
});

test('star map / status toggle buttons exist', async ({ page }) => {
  await page.goto('/latent-space');
  await expect(page.getByText('Star Map')).toBeVisible({ timeout: 10000 });
  await expect(page.getByText('Status')).toBeVisible();
});

test('trajectory toggle exists', async ({ page }) => {
  await page.goto('/latent-space');
  await expect(page.getByText('Trajectory')).toBeVisible({ timeout: 10000 });
});

test('navigation includes latent space link', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.header-nav').getByText('[latent space]')).toBeVisible();
});

test('SVG renders inside latent map container', async ({ page }) => {
  await page.goto('/latent-space');
  const svg = page.locator('.latent-svg');
  await expect(svg).toBeVisible({ timeout: 15000 });
});
```

**Step 2: Run tests**

Run: `npx playwright test tests/e2e/latent-space.spec.ts`

**Step 3: Fix any failures and re-run**

**Step 4: Commit**

```bash
git add tests/e2e/latent-space.spec.ts
git commit -m "test(latent-space): add e2e tests for latent space page"
```

---

### Task 8: Run full E2E suite to ensure no regressions

**Step 1: Run all tests**

Run: `npx playwright test`
Expected: All tests pass (existing + new latent-space tests)

**Step 2: Fix any regressions**

The most likely regression: `home.spec.ts` "navigation links" test may need updating since we added a new nav link.

**Step 3: Commit fixes if any**

```bash
git commit -m "fix: update e2e tests for new navigation link"
```
