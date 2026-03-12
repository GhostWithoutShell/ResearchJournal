# Genetic Origin on Idea Detail Pages — Design

## Problem

When a lab offspring is promoted to the library via `promoteToLibrary()`, genetic metadata (crossoverWeights, parent references, mutation strength, generation) is lost. Only `child-of` connections survive in localStorage, but they don't carry the crossover weights needed for inheritance visualization.

The user expects to see parent lineage and inheritance animation on the idea detail page, not just in the lab.

## Solution

### 1. Save genetic metadata on promote

Add optional `geneticOrigin` field to `IdeaSchema` in `src/lib/schemas.ts`:

```typescript
geneticOrigin: z.object({
  parentA: z.string(),
  parentB: z.string(),
  crossoverWeights: z.array(z.number()).length(6),
  mutationStrength: z.number(),
  generation: z.number(),
}).optional()
```

Modify `promoteToLibrary()` in `src/stores/lab.ts` to populate this field from the offspring data when creating the Idea object.

### 2. Genetic Origin section on detail page

New section in `DraftIdeaDetail.tsx`, rendered only when `idea.geneticOrigin` exists:

- **Parent fingerprints** — two 48px `DnaFingerprint` canvases with parent titles, each linking to the parent's detail page
- **Crossover weight bars** — 6 bars (Palette, Shapes, Pattern, Composition, Rhythm, Details) showing parent A/B dominance, same visual as `LabOffspringCard`
- **Inheritance animation** — the main 400px `DnaFingerprint` receives `crossoverWeights`, `parentAEmbedding`, `parentBEmbedding` props so the existing hover animation works

### 3. Scope: drafts only

Promoted offspring are always drafts (stored in localStorage). Only `DraftIdeaDetail.tsx` needs changes. Static `[id].astro` pages render from `ideas.json` which won't contain genetic data unless the user exports and commits.

## Files

- **Modify:** `src/lib/schemas.ts` — add `geneticOrigin` optional field to `IdeaSchema`
- **Modify:** `src/stores/lab.ts` — populate `geneticOrigin` in `promoteToLibrary()`
- **Modify:** `src/components/react/DraftIdeaDetail.tsx` — add Genetic Origin section, pass inheritance props to `DnaFingerprint`

## Reused components

- `DnaFingerprint` — already supports `crossoverWeights`, `parentAEmbedding`, `parentBEmbedding` for hover animation
- Crossover weight bar layout — same markup as in `LabOffspringCard` (lines 82–103)
