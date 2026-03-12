# Idea Genetics Phase 2 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extend the Genetics Lab with fitness scoring, tournament selection, graph integration, and a "Promote" gate that requires a next-action step — making the lab not just creative but action-oriented.

**Architecture:** Add fitness computation to existing `genetics.ts`, tournament UI in `LabPage.tsx`, new connection type `child-of` in schemas, and a required "next action" field on promote. All client-side, localStorage-based.

**Tech Stack:** Existing stack (React, nanostores, d3). No new dependencies.

---

### Task 1: Add fitness function to genetics.ts

**Files:**
- Modify: `src/lib/genetics.ts`
- Modify: `src/lib/schemas.ts` (ensure fitness type exists)

**Step 1: Read current genetics.ts and schemas.ts to understand structure**

**Step 2: Add fitness computation functions to genetics.ts**

Add the following exports at the end of `genetics.ts`:

```typescript
import { cosineSimilarity } from './similarity';

/**
 * Compute fitness scores for an offspring.
 * - novelty: average distance to all existing ideas (higher = more novel)
 * - balance: how evenly it inherits from both parents (1.0 = perfect balance)
 * - coverage: diversity of decoded concepts (penalizes repetition)
 */
export function computeFitness(
  offspringEmbedding: number[],
  parentA: number[],
  parentB: number[],
  allIdeaEmbeddings: number[][],
  decodedConcepts: string[],
): { novelty: number; balance: number; coverage: number; total: number } {
  // Novelty: mean distance to all existing ideas
  let totalDist = 0;
  for (const emb of allIdeaEmbeddings) {
    totalDist += (1 - cosineSimilarity(offspringEmbedding, emb));
  }
  const novelty = allIdeaEmbeddings.length > 0 ? totalDist / allIdeaEmbeddings.length : 1;

  // Balance: closeness to midpoint between parents
  const simA = cosineSimilarity(offspringEmbedding, parentA);
  const simB = cosineSimilarity(offspringEmbedding, parentB);
  const balance = 1 - Math.abs(simA - simB); // 1.0 = equidistant

  // Coverage: unique concepts / total concepts
  const unique = new Set(decodedConcepts.map(c => c.toLowerCase()));
  const coverage = decodedConcepts.length > 0 ? unique.size / decodedConcepts.length : 0;

  // Total: weighted average
  const total = novelty * 0.4 + balance * 0.3 + coverage * 0.3;

  return { novelty, balance, coverage, total };
}
```

**Step 3: Commit**

```bash
git add src/lib/genetics.ts
git commit -m "feat(genetics): add fitness scoring function (novelty, balance, coverage)"
```

---

### Task 2: Integrate fitness scoring into Lab store

**Files:**
- Modify: `src/stores/lab.ts`

**Step 1: Read current lab.ts**

**Step 2: Update addOffspringBatch to compute fitness**

After offspring are generated, compute and store fitness scores. Modify `addOffspringBatch()` to accept `allIdeaEmbeddings` parameter and call `computeFitness()` for each offspring.

Also add a `sortOffspringByFitness()` function.

**Step 3: Commit**

```bash
git add src/stores/lab.ts
git commit -m "feat(genetics): integrate fitness scoring into lab store"
```

---

### Task 3: Display fitness scores in LabOffspringCard

**Files:**
- Modify: `src/components/react/LabOffspringCard.tsx`

**Step 1: Read current LabOffspringCard.tsx**

**Step 2: Add fitness display**

Add a fitness bar/section to the offspring card showing novelty, balance, coverage, and total score. Use small horizontal bars with the journal aesthetic.

```tsx
{offspring.fitness && (
  <div className="fitness-scores">
    <div className="fitness-label">Fitness</div>
    <div className="fitness-row">
      <span className="fitness-name">novelty</span>
      <div className="fitness-bar">
        <div className="fitness-fill" style={{ width: `${offspring.fitness.novelty * 100}%` }} />
      </div>
      <span className="fitness-value">{offspring.fitness.novelty.toFixed(2)}</span>
    </div>
    <div className="fitness-row">
      <span className="fitness-name">balance</span>
      <div className="fitness-bar">
        <div className="fitness-fill" style={{ width: `${offspring.fitness.balance * 100}%` }} />
      </div>
      <span className="fitness-value">{offspring.fitness.balance.toFixed(2)}</span>
    </div>
    <div className="fitness-row">
      <span className="fitness-name">coverage</span>
      <div className="fitness-bar">
        <div className="fitness-fill" style={{ width: `${offspring.fitness.coverage * 100}%` }} />
      </div>
      <span className="fitness-value">{offspring.fitness.coverage.toFixed(2)}</span>
    </div>
    <div className="fitness-total">
      total: {offspring.fitness.total.toFixed(2)}
    </div>
  </div>
)}
```

**Step 3: Add CSS for fitness bars**

```css
.fitness-scores {
  margin-top: var(--spacing-sm);
  border-top: 1px solid var(--color-border);
  padding-top: var(--spacing-sm);
}

.fitness-label {
  font-size: 0.6875rem;
  color: var(--color-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 4px;
}

.fitness-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 2px;
}

.fitness-name {
  font-size: 0.6875rem;
  color: var(--color-muted);
  width: 54px;
  flex-shrink: 0;
}

.fitness-bar {
  flex: 1;
  height: 4px;
  background: var(--color-dim);
  border-radius: 2px;
  overflow: hidden;
}

.fitness-fill {
  height: 100%;
  background: var(--color-accent);
  border-radius: 2px;
  transition: width 0.3s;
}

.fitness-value {
  font-size: 0.6875rem;
  color: var(--color-text);
  width: 32px;
  text-align: right;
}

.fitness-total {
  font-size: 0.75rem;
  color: var(--color-accent);
  text-align: right;
  margin-top: 4px;
}
```

**Step 4: Commit**

```bash
git add src/components/react/LabOffspringCard.tsx src/styles/journal.css
git commit -m "feat(genetics): display fitness scores on offspring cards"
```

---

### Task 4: Add "Sort by Fitness" to LabPage

**Files:**
- Modify: `src/components/react/LabPage.tsx`

**Step 1: Read current LabPage.tsx**

**Step 2: Add sort toggle**

Add a button/toggle above the offspring grid: "Sort: Newest / Fitness". When "Fitness" is selected, offspring are sorted by `fitness.total` descending.

**Step 3: Commit**

```bash
git add src/components/react/LabPage.tsx
git commit -m "feat(genetics): add sort-by-fitness toggle in lab"
```

---

### Task 5: Add "Next Action" gate on Promote

**Files:**
- Modify: `src/components/react/LabOffspringCard.tsx`
- Modify: `src/stores/lab.ts`

This addresses the DangeComment.md feedback: don't let users promote without committing to a concrete next step.

**Step 1: Modify promote flow**

When user clicks "Promote", show an inline form requiring a "next action" field:

```
What can you do about this idea right now, in 1 hour?
[________________________________]
[Promote to Library]  [Cancel]
```

The next action gets saved into the idea's `description` field (appended as "**Next action:** ...").

**Step 2: Update LabOffspringCard**

Add state for `showPromoteForm` and `nextAction` input. Only call `promoteToLibrary()` when next action is non-empty.

**Step 3: Commit**

```bash
git add src/components/react/LabOffspringCard.tsx src/stores/lab.ts
git commit -m "feat(genetics): require next-action on promote (anti-procrastination gate)"
```

---

### Task 6: Add `child-of` connection type

**Files:**
- Modify: `src/lib/schemas.ts`
- Modify: `src/stores/lab.ts` (promoteToLibrary creates connections)

**Step 1: Verify schemas.ts already has `child-of` in ConnectionLabel**

If not, add it to the union type.

**Step 2: Modify promoteToLibrary in lab.ts**

When promoting offspring, automatically create two connections:
- `{ sourceId: offspringId, targetId: parentA, label: 'child-of' }`
- `{ sourceId: offspringId, targetId: parentB, label: 'child-of' }`

Store these connections in localStorage alongside the existing connections pattern.

**Step 3: Commit**

```bash
git add src/lib/schemas.ts src/stores/lab.ts
git commit -m "feat(genetics): auto-create child-of connections on promote"
```

---

### Task 7: Graph integration — "Breed in Lab" from IdeaGraph

**Files:**
- Modify: `src/components/react/IdeaGraph.tsx`

**Step 1: Read current IdeaGraph.tsx**

**Step 2: Add context action**

When two nodes are selected (clicked while holding Shift, or via some multi-select), show a "Breed in Lab" button that navigates to `/lab?parentA={id1}&parentB={id2}`.

Simpler approach: add a small "breed" icon/button on each node's tooltip. Clicking it selects that node as parent A, and a second click selects parent B, then redirects.

**Step 3: Modify LabPage to read URL params**

Read `parentA` and `parentB` from URL query parameters and pre-select them.

**Step 4: Commit**

```bash
git add src/components/react/IdeaGraph.tsx src/components/react/LabPage.tsx
git commit -m "feat(genetics): breed-in-lab action from idea graph"
```

---

### Task 8: Show `child-of` connections on IdeaGraph

**Files:**
- Modify: `src/components/react/IdeaGraph.tsx`

**Step 1: Add visual styling for child-of edges**

Use a dashed line with a distinct color (e.g., purple) and label "child-of" to distinguish genetic relationships from other connection types.

**Step 2: Commit**

```bash
git add src/components/react/IdeaGraph.tsx
git commit -m "feat(genetics): visualize child-of connections in graph"
```

---

### Task 9: Write E2E tests for Phase 2 features

**Files:**
- Modify: `tests/e2e/lab.spec.ts`

**Step 1: Add new tests**

```typescript
test('offspring cards show fitness scores after breeding', async ({ page }) => {
  // This test needs two ideas selected and bred
  // Test that fitness-scores section appears on offspring cards
  await page.goto('/lab');
  // ... select parents, breed, check for .fitness-scores
});

test('promote requires next action input', async ({ page }) => {
  await page.goto('/lab');
  // ... breed offspring, click promote, verify form appears
});

test('sort by fitness toggle exists', async ({ page }) => {
  await page.goto('/lab');
  await expect(page.getByText('Fitness', { exact: false })).toBeVisible({ timeout: 10000 });
});
```

**Step 2: Run tests**

Run: `npx playwright test tests/e2e/lab.spec.ts`

**Step 3: Commit**

```bash
git add tests/e2e/lab.spec.ts
git commit -m "test(genetics): add e2e tests for phase 2 lab features"
```

---

### Task 10: Run full E2E suite

**Step 1: Run all tests**

Run: `npx playwright test`
Expected: All tests pass

**Step 2: Fix any regressions and commit**

```bash
git commit -m "fix: resolve e2e regressions from genetics phase 2"
```
