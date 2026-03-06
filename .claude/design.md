# Design Document

## Project Structure

```
ResearchJournal/
├── astro.config.mjs
├── package.json
├── tsconfig.json
├── public/
│   └── favicon.svg
├── src/
│   ├── content.config.ts          # Astro content collections
│   ├── data/
│   │   ├── ideas.json             # Array of ideas with embeddings
│   │   └── connections.json       # Edges between ideas
│   ├── layouts/
│   │   └── BaseLayout.astro       # HTML shell + journal style
│   ├── pages/
│   │   ├── index.astro            # Idea library grid
│   │   ├── idea/[id].astro        # Idea detail page
│   │   ├── add.astro              # Add idea form
│   │   └── graph.astro            # Connection graph
│   ├── components/
│   │   ├── astro/
│   │   │   ├── Header.astro
│   │   │   ├── IdeaCard.astro
│   │   │   └── StatusBadge.astro
│   │   └── react/
│   │       ├── IdeaLibrary.tsx     # Grid with filtering/sorting
│   │       ├── DnaFingerprint.tsx  # Canvas generative visualization
│   │       ├── IdeaGraph.tsx       # Force-directed graph (d3-force)
│   │       ├── AddEditIdeaForm.tsx # Create/edit ideas
│   │       ├── SearchBar.tsx       # Semantic search
│   │       └── ConnectionManager.tsx
│   ├── lib/
│   │   ├── schemas.ts             # Zod schemas
│   │   ├── embeddings.ts          # Transformers.js wrapper
│   │   ├── dna-renderer.ts        # Embedding → visual params → Canvas
│   │   └── similarity.ts          # Cosine similarity
│   ├── stores/
│   │   ├── ideas.ts               # Nanostores: build-time + localStorage drafts
│   │   └── ui.ts                  # Filters, sort mode
│   └── styles/
│       ├── global.css
│       └── journal.css            # Paper texture, ink colors
└── scripts/
    └── generate-embeddings.ts     # Node script to precompute embeddings
```

## Data Schemas

### Idea

```json
{
  "id": "idea-2026-03-02-a1b2c3",
  "title": "Ambient Sound KAN Network",
  "description": "Record ambient sounds from different districts, seasons, times. Train KAN network to extract mathematical formulas from the data.",
  "status": "idea",
  "results": null,
  "repoLink": null,
  "tags": ["audio", "KAN", "research"],
  "createdAt": "2026-03-02T10:30:00Z",
  "updatedAt": "2026-03-02T10:30:00Z",
  "embedding": [0.023, -0.089, ...]
}
```

### Connection

```json
{
  "id": "conn-xxx",
  "sourceId": "idea-xxx",
  "targetId": "idea-yyy",
  "label": "builds-on",
  "createdAt": "2026-03-02T11:00:00Z"
}
```

Connection labels: `builds-on`, `alternative-to`, `inspired-by`, `component-of`, `related`

## DNA Fingerprint Algorithm

384-dim embedding vector split into 6 blocks of 64 dimensions:

| Dims    | Parameter   | Controls                                      |
|---------|-------------|-----------------------------------------------|
| 0-63    | Palette     | 5 HSL colors + background hue                 |
| 64-127  | Shapes      | Type (circles/polygons/curves), count, complexity |
| 128-191 | Pattern     | Rotational symmetry (1-8), noise, line weight  |
| 192-255 | Composition | Center bias, rotation, scale                   |
| 256-319 | Rhythm      | Layers, spacing, oscillation                   |
| 320-383 | Details     | Dots, ring, crosshatch                         |

Each block's values are normalized to [0,1] and mapped to specific visual parameter ranges. The result is rendered on HTML5 Canvas (200x200 for cards, 400x400 for detail pages).

Key property: similar embeddings → similar visuals. Related ideas visually cluster.

## Embedding Model

**Xenova/all-MiniLM-L6-v2** via @huggingface/transformers
- 384 dimensions
- ~23MB (q8 quantized ~12MB)
- Lazy-loaded: only when user adds new idea or uses semantic search
- Pre-computed at build time via Node script for existing ideas

## Architecture: Static + Drafts

### Tier 1: Build-time (source of truth)
`ideas.json` and `connections.json` in repo → Astro content collections → static HTML pages.

### Tier 2: Client-side drafts
New/edited ideas → localStorage → merged with build-time data in nanostores. Shown with "Draft" badge.

### Tier 3: Export/Import
"Export" button downloads merged JSON. User places files in `src/data/`, rebuilds, deploys.

## Implementation Phases

1. **Scaffold** — Astro + React init, schemas, content config, seed data, BaseLayout
2. **Library** — IdeaCard, StatusBadge, Header, index.astro grid, IdeaLibrary.tsx filtering
3. **DNA** — dna-renderer.ts, DnaFingerprint.tsx, embeddings.ts, generate-embeddings script
4. **Details** — idea/[id].astro, AddEditIdeaForm.tsx, stores/ideas.ts draft merge
5. **Graph** — ConnectionManager.tsx, IdeaGraph.tsx (d3-force), graph.astro
6. **Search** — similarity.ts, SearchBar.tsx, "Find Similar" sorting

## Dependencies

```
astro, @astrojs/react, react, react-dom,
nanostores, @nanostores/react,
@huggingface/transformers, d3-force
```
