# Latent Space — Design Document

## Summary

New page `/latent-space` — interactive 2D map of all ideas projected from their 384-dim embeddings via UMAP or t-SNE. Shows semantic clusters as colored "galaxies" and chronological trajectory of thought.

## Architecture

- **Runtime:** all computation in-browser (no build-time precomputation)
- **Stack:** Astro page + React component + d3 (SVG with zoom/pan)
- **New dependencies:** `umap-js`, `tsne-js`
- **Clustering:** DBSCAN on 2D projected coordinates (TODO: evaluate HDBSCAN later)

### Data Flow

```
ideas (384-dim embeddings from JSON + localStorage drafts)
  → UMAP or t-SNE → 2D [x, y] coordinates
  → DBSCAN → cluster labels
  → d3 SVG rendering (stars, galaxies, trajectory)
```

## File Structure

```
src/pages/latent-space.astro          — page
src/components/react/LatentSpace.tsx  — main React component
src/lib/dimensionality-reduction.ts   — UMAP/t-SNE wrappers
src/lib/clustering.ts                 — DBSCAN implementation
```

## UI

### Controls (top panel, lab-journal style)

1. **UMAP / t-SNE toggle** — switch projection algorithm, recompute
2. **Star Map / Status toggle** — display mode
3. **Trajectory toggle** — on/off animated chronological line
4. **Time Range slider** — filter ideas by `createdAt`
5. **Zoom/Pan** — d3 zoom behavior on SVG

### Star Map Mode

- Points rendered as white/light "stars" of varying size
- Clusters shown as semi-transparent colored areas (radial gradient or convex hull with blur)
- Each cluster gets a unique color
- Cluster label (derived from top tags) near centroid
- Noise points (outside clusters) — dim solitary stars

### Status Mode

- Points colored by status: idea / in-progress / done / killed (same palette as IdeaGraph)
- No galaxy overlays

### Trajectory

- Line connecting points in chronological order (`createdAt`)
- Animated "drawing" effect when toggled on
- Thin, semi-transparent, non-intrusive

### Interactions

- **Hover:** tooltip with idea title and date
- **Click:** navigate to `/idea/[id]`

## Edge Cases

- **< 3 ideas:** show message "Add more ideas to explore the latent space"
- **All ideas in one cluster:** single galaxy, valid result
- **Draft without embedding:** generate on the fly via `generateEmbedding()` before projection
- **Algorithm switch:** show loading indicator during recomputation

## Testing

- **Unit:** DBSCAN correctness, UMAP/t-SNE wrapper output dimensions
- **E2E (Playwright):** page loads, toggles work, points render

## Future Improvements

- Replace DBSCAN with HDBSCAN for better variable-density clustering
- Parameter sliders (perplexity for t-SNE, n_neighbors for UMAP)
