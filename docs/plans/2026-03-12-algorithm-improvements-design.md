# Algorithm Improvements: Adaptive Mutation Anchoring & Adaptive Top-K Decoding

## Problem

Two algorithmic weaknesses in the genetics system:

1. **Mutation drift** — `mutate()` in `genetics.ts` adds gaussian noise in random directions. Offspring embeddings drift into semantically meaningless regions of the 384-dim space, producing decoded concepts that don't form coherent ideas.

2. **Noisy decoding** — `decodeConcepts()` in `concept-vocabulary.ts` returns a fixed top-K (8) words by cosine similarity. Low-scoring irrelevant terms make it into the result, diluting the signal.

## Solution 1: Adaptive Semantic Anchoring for Mutation

### Approach

Replace pure gaussian noise mutation with a weighted blend of two components:

- **Semantic vector** — direction toward the nearest concept cluster in vocabulary space
- **Random vector** — standard gaussian noise (current behavior)

The blend ratio adapts to mutation strength:

```
anchorStrength = 1 - mutationStrength
```

- Weak mutation (0.05): anchorStrength ~0.95 — small, semantically meaningful steps
- Strong mutation (0.3): anchorStrength ~0.70 — more freedom for "wild" ideas

### Algorithm

```
anchor = mean(top-3 nearest concept embeddings to current embedding)
semanticDirection = normalize(anchor - embedding)
randomDirection = normalize(gaussian_noise_vector)
mutation = anchorStrength * semanticDirection + (1 - anchorStrength) * randomDirection
final = normalize(embedding + mutationStrength * normalize(mutation))
```

Top-3 averaging prevents "sticking" to a single concept.

### API Change

`mutate()` gets an optional `vocabulary` parameter:

```typescript
export function mutate(
  embedding: number[],
  strength: number,
  vocabulary?: ConceptEntry[],
): number[]
```

When `vocabulary` is not provided, behavior is identical to current (pure gaussian noise). This maintains backward compatibility.

### Helper Function

New `findSemanticAnchor()` function:

```typescript
function findSemanticAnchor(
  embedding: number[],
  vocabulary: ConceptEntry[],
  topK?: number,  // default 3
): number[]
```

Returns the mean embedding of the top-K nearest vocabulary entries. If vocabulary has fewer than `topK` entries, uses all available entries.

### Propagation

`generateOffspring()` also needs an optional `vocabulary` in its options, passed through to `mutate()`. The caller in `LabPage.tsx` passes the loaded vocabulary.

### Files

- **Modify:** `src/lib/genetics.ts` — update `mutate()`, `generateOffspring()`, add `findSemanticAnchor()`
- **Modify:** `src/components/react/LabPage.tsx` — pass vocabulary to `generateOffspring()`

## Solution 2: Adaptive Top-K Decoding with Score Gap Detection

### Approach

Instead of returning a fixed number of concepts, detect where relevance scores drop sharply and cut there.

### Algorithm

1. Compute cosine similarity for all vocabulary entries (unchanged)
2. Sort descending, take top `maxK` (default 12) as candidate pool
3. If pool has fewer than `minK` entries, return all
4. Compute gaps: `gap[i] = score[i] - score[i+1]`
5. Compute `meanGap` across all gaps in the pool
6. Scan from position `minK - 1` onward (minimum `minK` concepts always returned)
7. If `gap[i] > meanGap * gapMultiplier` (default 1.5), cut at position `i+1`
8. If no gap exceeds threshold, return all `maxK` candidates (scores are uniformly relevant)
9. Return concepts up to the cut point

### API Change

`decodeConcepts()` signature changes from fixed topK to adaptive parameters:

```typescript
export function decodeConcepts(
  embedding: number[],
  vocabulary: ConceptEntry[],
  options?: {
    maxK?: number;         // default 12 — candidate pool size
    minK?: number;         // default 3 — always return at least this many
    gapMultiplier?: number; // default 1.5 — sensitivity to score drops
  },
): string[]
```

The call site in `LabPage.tsx` currently calls `decodeConcepts(emb, vocab)` without a third argument, so it will pick up the new defaults automatically.

### Files

- **Modify:** `src/lib/concept-vocabulary.ts` — rewrite `decodeConcepts()`

## Scope

- No new dependencies
- No UI changes
- `mutate()` is backward-compatible (vocabulary is optional, defaults to pure noise)
- `decodeConcepts()` third parameter changes from `number` to `options object`; the only call site already omits it, so no breakage
- `generateOffspring()` gets optional `vocabulary` in options; callers without it behave as before
- Vocabulary (557 terms) is sufficient for anchoring; novelty search deferred until 3k+
