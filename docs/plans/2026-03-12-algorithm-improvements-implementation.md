# Algorithm Improvements Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve mutation and decoding algorithms in the genetics system — anchored mutation for meaningful evolution and adaptive top-K decoding to eliminate noise.

**Architecture:** Two independent changes to `src/lib/genetics.ts` and `src/lib/concept-vocabulary.ts`. Mutation gets a semantic anchor blended with random noise (ratio adapts to strength). Decoding gets score-gap detection to cut irrelevant tail. Both backward-compatible via optional parameters.

**Tech Stack:** TypeScript, existing `cosineSimilarity` from `src/lib/similarity.ts`, `ConceptEntry` type from `src/lib/schemas.ts`. No new dependencies.

---

### Task 1: Implement `findSemanticAnchor` helper

**Files:**
- Modify: `src/lib/genetics.ts`

- [ ] **Step 1: Add import for ConceptEntry and cosineSimilarity**

At the top of `src/lib/genetics.ts`, the existing import is:

```typescript
import { cosineSimilarity } from './similarity';
```

Add after it:

```typescript
import type { ConceptEntry } from './schemas';
```

- [ ] **Step 2: Add `findSemanticAnchor` function**

Add after `gaussianRandom()` (after line 74):

```typescript
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
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/genetics.ts
git commit -m "feat(genetics): add findSemanticAnchor helper"
```

---

### Task 2: Update `mutate()` with adaptive semantic anchoring

**Files:**
- Modify: `src/lib/genetics.ts`

- [ ] **Step 1: Replace the `mutate` function**

Replace the existing `mutate` function (lines 59-65):

```typescript
export function mutate(embedding: number[], strength: number): number[] {
  const mutated = new Array(embedding.length);
  for (let i = 0; i < embedding.length; i++) {
    mutated[i] = embedding[i] + gaussianRandom() * strength;
  }
  return l2Normalize(mutated);
}
```

With:

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/genetics.ts
git commit -m "feat(genetics): adaptive semantic anchoring in mutate()"
```

---

### Task 3: Propagate vocabulary through `generateOffspring`

**Files:**
- Modify: `src/lib/genetics.ts`
- Modify: `src/components/react/LabPage.tsx`

- [ ] **Step 1: Add `vocabulary` to `generateOffspring` options**

In `src/lib/genetics.ts`, update the `generateOffspring` function signature and body. The options interface (line ~83-88) currently is:

```typescript
  options: {
    count?: number;
    baseWeights?: number[];
    mutationStrength?: number;
    weightVariation?: number;
  } = {},
```

Replace with:

```typescript
  options: {
    count?: number;
    baseWeights?: number[];
    mutationStrength?: number;
    weightVariation?: number;
    vocabulary?: ConceptEntry[];
  } = {},
```

In the destructuring below, add `vocabulary`:

```typescript
  const {
    count = 4,
    baseWeights = [0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
    mutationStrength = 0.05,
    weightVariation = 0.15,
    vocabulary,
  } = options;
```

Update the `mutate` call (line ~105) from:

```typescript
    const mutated = mutate(blended, mutationStrength);
```

To:

```typescript
    const mutated = mutate(blended, mutationStrength, vocabulary);
```

- [ ] **Step 2: Pass vocabulary in LabPage.tsx**

In `src/components/react/LabPage.tsx`, the `generateOffspring` call (line ~67-71) is:

```typescript
      const results = generateOffspring(parentA.embedding, parentB.embedding, {
        count,
        baseWeights: weights,
        mutationStrength,
      });
```

Replace with:

```typescript
      const results = generateOffspring(parentA.embedding, parentB.embedding, {
        count,
        baseWeights: weights,
        mutationStrength,
        vocabulary: vocab,
      });
```

(`vocab` is already defined on line 66 as `const vocab = loadVocabulary(vocabulary);`)

- [ ] **Step 3: Build to verify**

Run: `npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/genetics.ts src/components/react/LabPage.tsx
git commit -m "feat(genetics): propagate vocabulary through generateOffspring to mutate"
```

---

### Task 4: Rewrite `decodeConcepts` with adaptive score-gap detection

**Files:**
- Modify: `src/lib/concept-vocabulary.ts`

- [ ] **Step 1: Replace the `decodeConcepts` function**

In `src/lib/concept-vocabulary.ts`, replace the existing function (lines 28-41):

```typescript
export function decodeConcepts(
  embedding: number[],
  vocabulary: ConceptEntry[],
  topK: number = 8,
): string[] {
  return vocabulary
    .map((entry) => ({
      term: entry.term,
      score: cosineSimilarity(embedding, entry.embedding),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((r) => r.term);
}
```

With:

```typescript
/**
 * Decode an embedding vector to the closest concepts from the vocabulary.
 * Uses adaptive score-gap detection: returns top concepts until a significant
 * drop in cosine similarity is detected, rather than a fixed count.
 */
export function decodeConcepts(
  embedding: number[],
  vocabulary: ConceptEntry[],
  options?: {
    maxK?: number;
    minK?: number;
    gapMultiplier?: number;
  },
): string[] {
  const maxK = options?.maxK ?? 12;
  const minK = options?.minK ?? 3;
  const gapMultiplier = options?.gapMultiplier ?? 1.5;

  const scored = vocabulary
    .map((entry) => ({
      term: entry.term,
      score: cosineSimilarity(embedding, entry.embedding),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, maxK);

  // If pool is smaller than minK, return all
  if (scored.length <= minK) {
    return scored.map((r) => r.term);
  }

  // Compute gaps between consecutive scores
  const gaps: number[] = [];
  for (let i = 0; i < scored.length - 1; i++) {
    gaps.push(scored[i].score - scored[i + 1].score);
  }

  // Mean gap as baseline
  const meanGap = gaps.reduce((sum, g) => sum + g, 0) / gaps.length;
  const threshold = meanGap * gapMultiplier;

  // Scan from minK onward — find first significant gap
  let cutAt = scored.length;
  for (let i = minK - 1; i < gaps.length; i++) {
    if (gaps[i] > threshold) {
      cutAt = i + 1;
      break;
    }
  }

  return scored.slice(0, cutAt).map((r) => r.term);
}
```

- [ ] **Step 2: Build to verify**

Run: `npm run build`
Expected: Build succeeds. The call site in `LabPage.tsx` (line 75) calls `decodeConcepts(r.embedding, vocab)` without a third argument, so it picks up defaults automatically.

- [ ] **Step 3: Commit**

```bash
git add src/lib/concept-vocabulary.ts
git commit -m "feat(genetics): adaptive top-K decoding with score-gap detection"
```

---

### Task 5: Run full E2E suite to verify no regressions

- [ ] **Step 1: Build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 2: Run all E2E tests**

Run: `npx playwright test`
Expected: All tests pass (53 tests).

- [ ] **Step 3: Fix any regressions and commit**

If any test fails, investigate and fix. Commit fixes separately.

- [ ] **Step 4: Push**

```bash
git push
```
