# ResearchJournal

## What is this?

Personal idea library — research journal website for tracking, visualizing, and connecting ideas.

The core problem: too many ideas generated, too few finished. This tool helps filter, track, and connect ideas instead of losing them.

## Tech Stack

- **Frontend:** Astro + React
- **Storage:** JSON files in the repo (no backend)
- **Embeddings:** Transformers.js (all-MiniLM-L6-v2, 384 dims) — runs in browser
- **Graph:** d3-force for idea connections visualization
- **State:** nanostores + @nanostores/react

## Key Concepts

### DNA Fingerprint
Each idea gets a unique visual fingerprint generated from its embedding vector (computed from title + description via Transformers.js). The 384-dim vector is split into 6 blocks of 64 dims, each controlling a visual parameter (palette, shapes, pattern, composition, rhythm, details). Similar ideas produce similar-looking fingerprints.

### Data Model
- `src/data/ideas.json` — array of ideas with embeddings
- `src/data/connections.json` — edges between ideas (builds-on, alternative-to, inspired-by, component-of, related)

### Static + Drafts Architecture
1. Build-time: JSON files → Astro content collections → static pages
2. Client-side drafts: new ideas via form → localStorage → shown with "Draft" badge
3. Export: button to download merged JSON for committing to repo

## Idea Statuses
- `idea` — just an idea
- `in-progress` — actively working on it
- `done` — completed
- `killed` — consciously abandoned

## Style
Research lab journal aesthetic — paper texture, serif fonts, ink colors. NOT a corporate task manager.

## Commands
- `npm run dev` — dev server
- `npm run build` — build static site
- `node scripts/generate-embeddings.ts` — precompute embeddings for all ideas
