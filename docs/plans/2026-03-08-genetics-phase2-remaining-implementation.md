# Genetics Phase 2 Remaining Features — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement three remaining Phase 2 genetics features: tournament selection for offspring, extended genealogy tree with inheritance animation in DNA fingerprints, and a CLI script to enrich the concept vocabulary from external sources (arxiv, HN, Wikipedia).

**Architecture:** Tournament is a new React component embedded in LabPage with round-robin pairing logic. Genealogy tree is a recursive React component in LabOffspringCard. Inheritance animation adds overlay canvas logic to DnaFingerprint via optional props. Vocabulary enrichment is a standalone Node.js script that fetches, extracts terms, computes embeddings, and merges into vocabulary.json.

**Tech Stack:** Existing stack (React, nanostores, d3, Zod, Astro). New: `@huggingface/transformers` in enrichment script (already a dependency for existing vocabulary script). No new runtime dependencies.

---

### Task 1: Add tournament store functions

**Files:**
- Modify: `src/stores/lab.ts`

**Step 1: Add `incrementTournamentWins` and `resetTournament` functions**

Add these functions after `sortOffspringByFitness()` at the end of `src/stores/lab.ts`:

```typescript
/**
 * Increment tournament wins for an offspring by 1.
 */
export function incrementTournamentWins(id: string): void {
  const current = $labOffspring.get();
  $labOffspring.set(
    current.map((o) =>
      o.id === id ? { ...o, tournamentWins: (o.tournamentWins ?? 0) + 1 } : o
    )
  );
  saveLab();
}

/**
 * Reset all tournament wins to 0.
 */
export function resetTournament(): void {
  const current = $labOffspring.get();
  $labOffspring.set(current.map((o) => ({ ...o, tournamentWins: 0 })));
  saveLab();
}

/**
 * Return offspring sorted by tournament wins descending.
 */
export function sortOffspringByTournamentWins(): LabOffspring[] {
  const offspring = $labOffspring.get();
  return [...offspring].sort((a, b) => {
    return (b.tournamentWins ?? 0) - (a.tournamentWins ?? 0);
  });
}
```

**Step 2: Commit**

```bash
git add src/stores/lab.ts
git commit -m "feat(genetics): add tournament win tracking to lab store"
```

---

### Task 2: Create LabTournament component

**Files:**
- Create: `src/components/react/LabTournament.tsx`

**Step 1: Write the tournament component**

```tsx
import { useState, useMemo } from 'react';
import type { LabOffspring, Idea } from '../../lib/schemas';
import { incrementTournamentWins, resetTournament, sortOffspringByTournamentWins } from '../../stores/lab';
import DnaFingerprint from './DnaFingerprint';

interface Props {
  offspring: LabOffspring[];
  ideasMap: Record<string, Idea>;
  onExit: () => void;
}

interface Pair {
  left: LabOffspring;
  right: LabOffspring;
}

function generatePairs(offspring: LabOffspring[]): Pair[] {
  const pairs: Pair[] = [];
  for (let i = 0; i < offspring.length; i++) {
    for (let j = i + 1; j < offspring.length; j++) {
      pairs.push({ left: offspring[i], right: offspring[j] });
    }
  }
  // Shuffle
  for (let i = pairs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
  }
  // Cap at 15 rounds for large sets
  return pairs.slice(0, 15);
}

export default function LabTournament({ offspring, ideasMap, onExit }: Props) {
  const pairs = useMemo(() => generatePairs(offspring), [offspring]);
  const [currentRound, setCurrentRound] = useState(0);
  const [finished, setFinished] = useState(false);

  const handleChoice = (winnerId: string) => {
    incrementTournamentWins(winnerId);
    advance();
  };

  const handleSkip = () => {
    advance();
  };

  const advance = () => {
    if (currentRound + 1 >= pairs.length) {
      setFinished(true);
    } else {
      setCurrentRound((r) => r + 1);
    }
  };

  const handleRestart = () => {
    resetTournament();
    setCurrentRound(0);
    setFinished(false);
  };

  if (finished) {
    const ranked = sortOffspringByTournamentWins();
    return (
      <div className="tournament-container">
        <h3 className="tournament-title">Tournament Results</h3>
        <div className="tournament-results">
          {ranked.map((o, i) => (
            <div
              key={o.id}
              className={`tournament-result-row ${i === 0 ? 'tournament-winner' : ''}`}
            >
              <span className="tournament-rank">#{i + 1}</span>
              <DnaFingerprint embedding={o.embedding} size={32} />
              <span className="tournament-result-title">
                {o.suggestedTitle || o.decodedConcepts.slice(0, 3).join(', ')}
              </span>
              <span className="tournament-wins">{o.tournamentWins ?? 0} wins</span>
            </div>
          ))}
        </div>
        <div className="tournament-actions">
          <button className="btn btn--sm btn--primary" onClick={handleRestart}>
            restart tournament
          </button>
          <button className="btn btn--sm btn--ghost" onClick={onExit}>
            back to grid
          </button>
        </div>
      </div>
    );
  }

  const pair = pairs[currentRound];

  return (
    <div className="tournament-container">
      <div className="tournament-header">
        <h3 className="tournament-title">Tournament</h3>
        <div className="tournament-progress">
          Round {currentRound + 1} / {pairs.length}
        </div>
        <div className="tournament-progress-bar">
          <div
            className="tournament-progress-fill"
            style={{ width: `${((currentRound + 1) / pairs.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="tournament-matchup">
        <TournamentCard
          offspring={pair.left}
          parentA={ideasMap[pair.left.parentA]}
          parentB={ideasMap[pair.left.parentB]}
          onChoose={() => handleChoice(pair.left.id)}
          label="left"
        />

        <div className="tournament-vs">vs</div>

        <TournamentCard
          offspring={pair.right}
          parentA={ideasMap[pair.right.parentA]}
          parentB={ideasMap[pair.right.parentB]}
          onChoose={() => handleChoice(pair.right.id)}
          label="right"
        />
      </div>

      <div className="tournament-actions">
        <button className="btn btn--sm btn--ghost" onClick={handleSkip}>
          skip
        </button>
        <button className="btn btn--sm btn--ghost" onClick={onExit}>
          exit tournament
        </button>
      </div>
    </div>
  );
}

function TournamentCard({
  offspring,
  parentA,
  parentB,
  onChoose,
  label,
}: {
  offspring: LabOffspring;
  parentA?: Idea;
  parentB?: Idea;
  onChoose: () => void;
  label: string;
}) {
  return (
    <div className="tournament-card">
      <div className="tournament-card-dna">
        <DnaFingerprint embedding={offspring.embedding} size={80} />
      </div>
      <div className="tournament-card-title">
        {offspring.suggestedTitle || offspring.decodedConcepts.slice(0, 3).join(', ')}
      </div>
      <div className="tournament-card-concepts">
        {offspring.decodedConcepts.map((c) => (
          <span key={c} className="tag">{c}</span>
        ))}
      </div>
      {offspring.fitness && (
        <div className="tournament-card-fitness">
          fitness: {offspring.fitness.total.toFixed(2)}
        </div>
      )}
      <div className="tournament-card-parents">
        {parentA && <span>{parentA.title}</span>}
        {parentA && parentB && <span> + </span>}
        {parentB && <span>{parentB.title}</span>}
      </div>
      <button className="btn btn--sm btn--primary tournament-choose-btn" onClick={onChoose}>
        choose {label}
      </button>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/react/LabTournament.tsx
git commit -m "feat(genetics): create LabTournament component with round-robin pairing"
```

---

### Task 3: Add tournament CSS styles

**Files:**
- Modify: `src/styles/journal.css`

**Step 1: Append tournament styles to end of journal.css**

```css
/* === Tournament === */
.tournament-container {
  padding: var(--spacing-lg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-surface);
}

.tournament-header {
  margin-bottom: var(--spacing-lg);
}

.tournament-title {
  font-size: 1rem;
  color: var(--color-ink);
  margin: 0 0 var(--spacing-sm) 0;
}

.tournament-progress {
  font-size: 0.75rem;
  color: var(--color-muted);
  margin-bottom: var(--spacing-xs);
}

.tournament-progress-bar {
  height: 4px;
  background: var(--color-dim);
  border-radius: 2px;
  overflow: hidden;
}

.tournament-progress-fill {
  height: 100%;
  background: var(--color-accent);
  border-radius: 2px;
  transition: width 0.3s;
}

.tournament-matchup {
  display: flex;
  align-items: stretch;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
}

.tournament-vs {
  display: flex;
  align-items: center;
  font-size: 0.875rem;
  color: var(--color-muted);
  font-style: italic;
  flex-shrink: 0;
}

.tournament-card {
  flex: 1;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: var(--spacing-md);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-sm);
  text-align: center;
  transition: border-color 0.2s;
}

.tournament-card:hover {
  border-color: var(--color-muted);
}

.tournament-card-dna {
  margin-bottom: var(--spacing-xs);
}

.tournament-card-title {
  font-size: 0.875rem;
  color: var(--color-ink);
  font-weight: 500;
}

.tournament-card-concepts {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  justify-content: center;
}

.tournament-card-fitness {
  font-size: 0.6875rem;
  color: var(--color-muted);
}

.tournament-card-parents {
  font-size: 0.625rem;
  color: var(--color-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

.tournament-choose-btn {
  margin-top: auto;
}

.tournament-actions {
  display: flex;
  gap: var(--spacing-sm);
  justify-content: center;
}

.tournament-results {
  margin-bottom: var(--spacing-lg);
}

.tournament-result-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) 0;
  border-bottom: 1px solid var(--color-dim);
}

.tournament-winner {
  background: rgba(51, 204, 51, 0.05);
  border-radius: var(--radius);
  padding: var(--spacing-sm);
}

.tournament-rank {
  font-size: 0.75rem;
  color: var(--color-muted);
  width: 28px;
  flex-shrink: 0;
}

.tournament-result-title {
  flex: 1;
  font-size: 0.8125rem;
  color: var(--color-ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tournament-wins {
  font-size: 0.6875rem;
  color: var(--color-accent);
  flex-shrink: 0;
}
```

**Step 2: Commit**

```bash
git add src/styles/journal.css
git commit -m "feat(genetics): add tournament CSS styles"
```

---

### Task 4: Integrate tournament into LabPage

**Files:**
- Modify: `src/components/react/LabPage.tsx`

**Step 1: Add tournament mode toggle**

Add import at top:

```typescript
import LabTournament from './LabTournament';
```

Add state after existing state declarations (after `sortMode` line ~29):

```typescript
const [tournamentMode, setTournamentMode] = useState(false);
```

**Step 2: Add tournament button next to sort toggles**

In the offspring header section (the div containing "Offspring (N)" heading and sort buttons), add a tournament button. Replace the existing offspring header `<div>` (lines ~221-275) — add the tournament button between the sort buttons div and the "clear all" button:

After the closing `</div>` of the sort buttons group (the `<div style={{ display: 'flex', gap: '4px' }}>` at line ~231), add:

```tsx
{offspring.length >= 2 && (
  <button
    style={{
      padding: '2px 8px',
      fontSize: '0.6875rem',
      fontFamily: 'inherit',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius)',
      cursor: 'pointer',
      background: tournamentMode ? 'var(--color-ink)' : 'transparent',
      color: tournamentMode ? 'var(--color-bg)' : 'var(--color-muted)',
    }}
    onClick={() => setTournamentMode(!tournamentMode)}
  >
    tournament
  </button>
)}
```

**Step 3: Conditionally render tournament or grid**

Replace the offspring grid rendering (the `<div className="idea-grid">...</div>` block at line ~277-286) with a conditional:

```tsx
{tournamentMode ? (
  <LabTournament
    offspring={offspring}
    ideasMap={ideasMap}
    onExit={() => setTournamentMode(false)}
  />
) : (
  <div className="idea-grid">
    {(sortMode === 'fitness' ? sortOffspringByFitness() : offspring.slice().reverse()).map((o) => (
      <LabOffspringCard
        key={o.id}
        offspring={o}
        parentA={ideasMap[o.parentA]}
        parentB={ideasMap[o.parentB]}
      />
    ))}
  </div>
)}
```

**Step 4: Commit**

```bash
git add src/components/react/LabPage.tsx
git commit -m "feat(genetics): integrate tournament mode into lab page"
```

---

### Task 5: Create LabLineageTree component

**Files:**
- Create: `src/components/react/LabLineageTree.tsx`

**Step 1: Write the recursive lineage tree**

```tsx
import type { LabOffspring, Idea } from '../../lib/schemas';
import DnaFingerprint from './DnaFingerprint';

const BLOCK_LABELS = ['Pal', 'Shp', 'Pat', 'Cmp', 'Rhy', 'Det'];

interface Props {
  offspring: LabOffspring;
  ideasMap: Record<string, Idea>;
  allOffspring: LabOffspring[];
  depth?: number;
}

/**
 * Recursive lineage tree. Each node shows a miniature DNA fingerprint and title.
 * If a parent is also a lab offspring, its branch expands recursively.
 * Otherwise, the parent is shown as a leaf (library idea).
 */
export default function LabLineageTree({ offspring, ideasMap, allOffspring, depth = 0 }: Props) {
  const parentAIdea = ideasMap[offspring.parentA];
  const parentBIdea = ideasMap[offspring.parentB];
  const parentAOffspring = allOffspring.find((o) => o.id === offspring.parentA);
  const parentBOffspring = allOffspring.find((o) => o.id === offspring.parentB);

  const maxDepth = 4; // prevent infinite recursion

  return (
    <div className="lineage-tree" style={{ marginLeft: depth > 0 ? 'var(--spacing-md)' : 0 }}>
      {/* Current node */}
      <div className="lineage-node lineage-node--child">
        <DnaFingerprint embedding={offspring.embedding} size={24} />
        <span className="lineage-node-title">
          {offspring.suggestedTitle || offspring.decodedConcepts.slice(0, 2).join(', ')}
        </span>
        <span className="lineage-node-gen">gen {offspring.generation}</span>
      </div>

      {/* Crossover weight indicator */}
      <div className="lineage-weights">
        {offspring.crossoverWeights.map((w, i) => (
          <div key={i} className="lineage-weight-block">
            <span className="lineage-weight-label">{BLOCK_LABELS[i]}</span>
            <div className="lineage-weight-bar">
              <div
                className="lineage-weight-fill-a"
                style={{ width: `${(1 - w) * 100}%` }}
              />
              <div
                className="lineage-weight-fill-b"
                style={{ width: `${w * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Parent branches */}
      <div className="lineage-parents">
        <div className="lineage-branch lineage-branch--a">
          <div className="lineage-branch-label">A</div>
          {parentAOffspring && depth < maxDepth ? (
            <LabLineageTree
              offspring={parentAOffspring}
              ideasMap={ideasMap}
              allOffspring={allOffspring}
              depth={depth + 1}
            />
          ) : parentAIdea ? (
            <div className="lineage-node lineage-node--leaf">
              <DnaFingerprint embedding={parentAIdea.embedding} size={24} />
              <span className="lineage-node-title">{parentAIdea.title}</span>
            </div>
          ) : (
            <div className="lineage-node lineage-node--unknown">
              <span className="lineage-node-title">{offspring.parentA}</span>
            </div>
          )}
        </div>

        <div className="lineage-branch lineage-branch--b">
          <div className="lineage-branch-label">B</div>
          {parentBOffspring && depth < maxDepth ? (
            <LabLineageTree
              offspring={parentBOffspring}
              ideasMap={ideasMap}
              allOffspring={allOffspring}
              depth={depth + 1}
            />
          ) : parentBIdea ? (
            <div className="lineage-node lineage-node--leaf">
              <DnaFingerprint embedding={parentBIdea.embedding} size={24} />
              <span className="lineage-node-title">{parentBIdea.title}</span>
            </div>
          ) : (
            <div className="lineage-node lineage-node--unknown">
              <span className="lineage-node-title">{offspring.parentB}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/react/LabLineageTree.tsx
git commit -m "feat(genetics): create recursive LabLineageTree component"
```

---

### Task 6: Add lineage tree CSS styles

**Files:**
- Modify: `src/styles/journal.css`

**Step 1: Append lineage styles to end of journal.css**

```css
/* === Lineage Tree === */
.lineage-tree {
  border-left: 1px solid var(--color-dim);
  padding-left: var(--spacing-sm);
}

.lineage-node {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: 2px 0;
}

.lineage-node-title {
  font-size: 0.6875rem;
  color: var(--color-ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 140px;
}

.lineage-node-gen {
  font-size: 0.5625rem;
  color: var(--color-muted);
  flex-shrink: 0;
}

.lineage-node--leaf .lineage-node-title {
  color: var(--color-muted);
  font-style: italic;
}

.lineage-node--unknown .lineage-node-title {
  color: var(--color-muted);
  font-size: 0.625rem;
  opacity: 0.5;
}

.lineage-weights {
  display: flex;
  gap: 2px;
  margin: 2px 0 4px var(--spacing-lg);
}

.lineage-weight-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
}

.lineage-weight-label {
  font-size: 0.5rem;
  color: var(--color-muted);
  text-transform: uppercase;
}

.lineage-weight-bar {
  display: flex;
  width: 20px;
  height: 3px;
  border-radius: 1px;
  overflow: hidden;
}

.lineage-weight-fill-a {
  height: 100%;
  background: var(--color-accent);
  opacity: 0.7;
}

.lineage-weight-fill-b {
  height: 100%;
  background: #33cc33;
  opacity: 0.7;
}

.lineage-parents {
  margin-left: var(--spacing-sm);
}

.lineage-branch {
  margin-bottom: var(--spacing-xs);
}

.lineage-branch-label {
  font-size: 0.5625rem;
  color: var(--color-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 1px;
}
```

**Step 2: Commit**

```bash
git add src/styles/journal.css
git commit -m "feat(genetics): add lineage tree CSS styles"
```

---

### Task 7: Integrate lineage tree into LabOffspringCard

**Files:**
- Modify: `src/components/react/LabOffspringCard.tsx`

**Step 1: Add imports and state**

Add import at top of file:

```typescript
import LabLineageTree from './LabLineageTree';
```

Add to Props interface — the card needs access to all offspring and ideas for recursive lookup:

```typescript
interface Props {
  offspring: LabOffspring;
  parentA?: Idea;
  parentB?: Idea;
  allOffspring: LabOffspring[];
  ideasMap: Record<string, Idea>;
}
```

Update the component signature and add state:

```typescript
export default function LabOffspringCard({ offspring, parentA, parentB, allOffspring, ideasMap }: Props) {
  const [promoting, setPromoting] = useState(false);
  const [showLineage, setShowLineage] = useState(false);
```

**Step 2: Add lineage toggle and tree**

After the existing genealogy section (after the closing `</div>` of the parent miniatures + crossover weights block at line ~103), add:

```tsx
{/* Lineage tree toggle */}
{offspring.generation > 1 && (
  <div style={{ marginTop: 'var(--spacing-xs)' }}>
    <button
      className="btn btn--sm btn--ghost"
      style={{ fontSize: '0.625rem', padding: '1px 6px' }}
      onClick={() => setShowLineage(!showLineage)}
    >
      {showLineage ? 'hide lineage' : 'show lineage'}
    </button>
    {showLineage && (
      <div style={{ marginTop: 'var(--spacing-sm)' }}>
        <LabLineageTree
          offspring={offspring}
          ideasMap={ideasMap}
          allOffspring={allOffspring}
        />
      </div>
    )}
  </div>
)}
```

**Step 3: Update LabPage to pass new props**

In `src/components/react/LabPage.tsx`, update the LabOffspringCard rendering to pass `allOffspring` and `ideasMap`:

```tsx
<LabOffspringCard
  key={o.id}
  offspring={o}
  parentA={ideasMap[o.parentA]}
  parentB={ideasMap[o.parentB]}
  allOffspring={offspring}
  ideasMap={ideasMap}
/>
```

This change applies to both the grid view and the tournament exit view (both places where LabOffspringCard is rendered).

**Step 4: Commit**

```bash
git add src/components/react/LabOffspringCard.tsx src/components/react/LabPage.tsx
git commit -m "feat(genetics): integrate lineage tree into offspring cards"
```

---

### Task 8: Add inheritance animation to DnaFingerprint

**Files:**
- Modify: `src/components/react/DnaFingerprint.tsx`
- Modify: `src/lib/dna-render-engine.ts`

**Step 1: Extend DnaFingerprint props**

Replace the entire `src/components/react/DnaFingerprint.tsx`:

```tsx
import { useRef, useEffect, useState, useCallback } from 'react';
import { renderDnaFingerprint, renderInheritanceOverlay } from '../../lib/dna-render-engine';

interface Props {
  embedding: number[];
  size: number;
  crossoverWeights?: number[];
  parentAEmbedding?: number[];
  parentBEmbedding?: number[];
}

export default function DnaFingerprint({
  embedding,
  size,
  crossoverWeights,
  parentAEmbedding,
  parentBEmbedding,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const [hovering, setHovering] = useState(false);

  const hasInheritance = crossoverWeights && parentAEmbedding && parentBEmbedding;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !embedding || embedding.length === 0) return;
    renderDnaFingerprint(canvas, embedding, size);
  }, [embedding, size]);

  // Inheritance animation on hover
  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay || !hasInheritance || !hovering) {
      if (overlayRef.current) {
        const ctx = overlayRef.current.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, size, size);
      }
      if (animRef.current) cancelAnimationFrame(animRef.current);
      return;
    }

    overlay.width = size;
    overlay.height = size;
    let startTime: number | null = null;
    const duration = 2000; // 2 seconds

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = ((timestamp - startTime) % duration) / duration;
      renderInheritanceOverlay(overlay, size, crossoverWeights!, progress);
      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [hovering, hasInheritance, size, crossoverWeights]);

  return (
    <div
      style={{ position: 'relative', width: size, height: size, display: 'inline-block' }}
      onMouseEnter={() => hasInheritance && setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        style={{
          width: size,
          height: size,
          display: 'block',
          borderRadius: '4px',
        }}
      />
      {hasInheritance && (
        <canvas
          ref={overlayRef}
          width={size}
          height={size}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: size,
            height: size,
            borderRadius: '4px',
            pointerEvents: 'none',
          }}
        />
      )}
    </div>
  );
}
```

**Step 2: Add renderInheritanceOverlay to dna-render-engine.ts**

Add this function at the end of `src/lib/dna-render-engine.ts`:

```typescript
/**
 * Render a colored overlay showing which parent contributed each DNA block.
 * Animates as a wave from left to right.
 *
 * @param canvas - overlay canvas (transparent)
 * @param size - canvas size
 * @param weights - 6 crossover weights (0 = all A, 1 = all B)
 * @param progress - animation progress 0..1 (wave position)
 */
export function renderInheritanceOverlay(
  canvas: HTMLCanvasElement,
  size: number,
  weights: number[],
  progress: number,
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(0, 0, size, size);

  const blocks = 6;
  const blockWidth = size / blocks;

  // Parent A color: warm amber, Parent B color: cool teal
  const colorA = { r: 255, g: 170, b: 0 };
  const colorB = { r: 0, g: 170, b: 255 };

  for (let i = 0; i < blocks; i++) {
    // Wave: each block lights up as the wave passes
    const blockCenter = (i + 0.5) / blocks;
    const wavePos = progress;
    const dist = Math.abs(blockCenter - wavePos);
    const intensity = Math.max(0, 1 - dist * 3); // sharp falloff

    if (intensity <= 0) continue;

    const w = weights[i];
    let color: { r: number; g: number; b: number };
    let alpha: number;

    if (w < 0.4) {
      // Dominant A
      color = colorA;
      alpha = intensity * 0.35;
    } else if (w > 0.6) {
      // Dominant B
      color = colorB;
      alpha = intensity * 0.35;
    } else {
      // Mixed — pulse between A and B
      const pulse = (Math.sin(progress * Math.PI * 4) + 1) / 2;
      color = {
        r: Math.round(colorA.r * (1 - pulse) + colorB.r * pulse),
        g: Math.round(colorA.g * (1 - pulse) + colorB.g * pulse),
        b: Math.round(colorA.b * (1 - pulse) + colorB.b * pulse),
      };
      alpha = intensity * 0.25;
    }

    ctx.fillStyle = `rgba(${color.r},${color.g},${color.b},${alpha})`;
    ctx.fillRect(i * blockWidth, 0, blockWidth, size);
  }
}
```

**Step 3: Commit**

```bash
git add src/components/react/DnaFingerprint.tsx src/lib/dna-render-engine.ts
git commit -m "feat(genetics): add inheritance animation overlay to DNA fingerprint"
```

---

### Task 9: Pass inheritance props in LabOffspringCard

**Files:**
- Modify: `src/components/react/LabOffspringCard.tsx`

**Step 1: Update the DnaFingerprint call for offspring**

In the card header section (line ~50), the offspring's DnaFingerprint currently is:

```tsx
<DnaFingerprint embedding={offspring.embedding} size={48} />
```

Replace with:

```tsx
<DnaFingerprint
  embedding={offspring.embedding}
  size={48}
  crossoverWeights={offspring.crossoverWeights}
  parentAEmbedding={parentA?.embedding}
  parentBEmbedding={parentB?.embedding}
/>
```

**Step 2: Commit**

```bash
git add src/components/react/LabOffspringCard.tsx
git commit -m "feat(genetics): pass inheritance props to offspring DNA fingerprint"
```

---

### Task 10: Update ConceptEntry schema for 'web' source

**Files:**
- Modify: `src/lib/schemas.ts`

**Step 1: Add 'web' to ConceptEntry source enum**

Change line 68 in `src/lib/schemas.ts` from:

```typescript
  source: z.enum(['ideas', 'dictionary']),
```

to:

```typescript
  source: z.enum(['ideas', 'dictionary', 'web']),
```

**Step 2: Commit**

```bash
git add src/lib/schemas.ts
git commit -m "feat(genetics): add 'web' source type to ConceptEntry schema"
```

---

### Task 11: Create vocabulary enrichment script

**Files:**
- Create: `scripts/enrich-vocabulary.mjs`

**Step 1: Write the enrichment script**

```javascript
/**
 * Enrich concept vocabulary from external sources (arxiv, HN, Wikipedia).
 *
 * Usage:
 *   node scripts/enrich-vocabulary.mjs --topic "reinforcement learning"
 *   node scripts/enrich-vocabulary.mjs --topic "FPGA design" --source arxiv
 *   node scripts/enrich-vocabulary.mjs --topic "neural networks" --dry-run
 *   node scripts/enrich-vocabulary.mjs --topic "robotics" --max-terms 30
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { pipeline } from '@huggingface/transformers';

const __dirname = dirname(fileURLToPath(import.meta.url));
const vocabPath = join(__dirname, '..', 'src', 'data', 'vocabulary.json');

// --- Argument parsing ---

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = { topic: '', source: 'all', maxTerms: 50, dryRun: false };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--topic' && args[i + 1]) {
      parsed.topic = args[++i];
    } else if (args[i] === '--source' && args[i + 1]) {
      parsed.source = args[++i];
    } else if (args[i] === '--max-terms' && args[i + 1]) {
      parsed.maxTerms = parseInt(args[++i], 10);
    } else if (args[i] === '--dry-run') {
      parsed.dryRun = true;
    }
  }

  if (!parsed.topic) {
    console.error('Usage: node scripts/enrich-vocabulary.mjs --topic "your topic"');
    console.error('Options:');
    console.error('  --source <arxiv|hn|wikipedia|all>  (default: all)');
    console.error('  --max-terms <number>               (default: 50)');
    console.error('  --dry-run                          (show terms without writing)');
    process.exit(1);
  }

  return parsed;
}

// --- Stop words ---

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be',
  'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
  'would', 'could', 'should', 'may', 'might', 'can', 'shall', 'this',
  'that', 'these', 'those', 'it', 'its', 'not', 'no', 'nor', 'so',
  'if', 'then', 'than', 'too', 'very', 'just', 'about', 'above', 'after',
  'again', 'all', 'also', 'am', 'any', 'because', 'before', 'between',
  'both', 'each', 'few', 'more', 'most', 'other', 'our', 'out', 'own',
  'same', 'some', 'such', 'there', 'they', 'we', 'what', 'when', 'where',
  'which', 'while', 'who', 'whom', 'why', 'how', 'new', 'one', 'two',
  'using', 'used', 'use', 'based', 'via', 'show', 'paper', 'results',
  'approach', 'method', 'methods', 'propose', 'proposed', 'present',
  'work', 'study', 'model', 'models', 'data', 'set', 'time', 'first',
  'well', 'also', 'into', 'over', 'only', 'even', 'such', 'many',
  'however', 'high', 'low', 'large', 'small', 'different', 'number',
]);

// --- Term extraction ---

function extractTerms(text) {
  const cleaned = text
    .toLowerCase()
    .replace(/<[^>]*>/g, ' ')          // strip HTML
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const words = cleaned.split(' ').filter((w) => w.length >= 3 && !STOP_WORDS.has(w));

  const terms = new Set();

  // Unigrams (4+ chars to be meaningful)
  for (const w of words) {
    if (w.length >= 4) terms.add(w);
  }

  // Bigrams
  for (let i = 0; i < words.length - 1; i++) {
    const bigram = `${words[i]} ${words[i + 1]}`;
    if (bigram.length >= 7) terms.add(bigram);
  }

  // Trigrams
  for (let i = 0; i < words.length - 2; i++) {
    const trigram = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
    if (trigram.length >= 10) terms.add(trigram);
  }

  return Array.from(terms);
}

// --- Source fetchers ---

async function fetchArxiv(topic) {
  const query = encodeURIComponent(topic);
  const url = `https://export.arxiv.org/api/query?search_query=all:${query}&start=0&max_results=20&sortBy=relevance`;

  console.log('  Fetching from arxiv...');
  const response = await fetch(url);
  const text = await response.text();

  // Parse XML — extract titles and summaries
  const titles = [...text.matchAll(/<title>([\s\S]*?)<\/title>/g)]
    .map((m) => m[1].trim())
    .filter((t) => t !== 'ArXiv Query:' && !t.startsWith('ArXiv'));

  const summaries = [...text.matchAll(/<summary>([\s\S]*?)<\/summary>/g)]
    .map((m) => m[1].trim());

  const allText = [...titles, ...summaries].join(' ');
  const terms = extractTerms(allText);
  console.log(`  arxiv: extracted ${terms.length} candidate terms from ${titles.length} papers`);
  return terms;
}

async function fetchHackerNews(topic) {
  const query = encodeURIComponent(topic);
  const url = `https://hn.algolia.com/api/v1/search?query=${query}&tags=story&hitsPerPage=30`;

  console.log('  Fetching from Hacker News...');
  const response = await fetch(url);
  const data = await response.json();

  const titles = (data.hits || []).map((h) => h.title || '');
  const allText = titles.join(' ');
  const terms = extractTerms(allText);
  console.log(`  HN: extracted ${terms.length} candidate terms from ${titles.length} posts`);
  return terms;
}

async function fetchWikipedia(topic) {
  const query = encodeURIComponent(topic);
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${query}`;

  console.log('  Fetching from Wikipedia...');
  try {
    const response = await fetch(url);
    if (!response.ok) {
      // Try search instead
      const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${query}&format=json&srlimit=10`;
      const searchResp = await fetch(searchUrl);
      const searchData = await searchResp.json();
      const snippets = (searchData.query?.search || []).map((r) => `${r.title} ${r.snippet}`);
      const allText = snippets.join(' ');
      const terms = extractTerms(allText);
      console.log(`  Wikipedia: extracted ${terms.length} candidate terms from ${snippets.length} search results`);
      return terms;
    }

    const data = await response.json();
    const allText = `${data.title || ''} ${data.description || ''} ${data.extract || ''}`;
    const terms = extractTerms(allText);
    console.log(`  Wikipedia: extracted ${terms.length} candidate terms`);
    return terms;
  } catch (e) {
    console.warn(`  Wikipedia fetch failed: ${e.message}`);
    return [];
  }
}

// --- Main ---

async function main() {
  const { topic, source, maxTerms, dryRun } = parseArgs();

  console.log(`\nEnriching vocabulary for topic: "${topic}"`);
  console.log(`Source: ${source}, Max terms: ${maxTerms}, Dry run: ${dryRun}\n`);

  // Load existing vocabulary
  let existingVocab = [];
  try {
    existingVocab = JSON.parse(readFileSync(vocabPath, 'utf-8'));
  } catch {
    console.warn('No existing vocabulary.json found, starting fresh.');
  }

  const existingTerms = new Set(existingVocab.map((v) => v.term.toLowerCase()));
  console.log(`Existing vocabulary: ${existingTerms.size} terms`);

  // Fetch terms from sources
  let allCandidates = [];

  if (source === 'all' || source === 'arxiv') {
    const terms = await fetchArxiv(topic);
    allCandidates.push(...terms);
  }

  if (source === 'all' || source === 'hn') {
    const terms = await fetchHackerNews(topic);
    allCandidates.push(...terms);
  }

  if (source === 'all' || source === 'wikipedia') {
    const terms = await fetchWikipedia(topic);
    allCandidates.push(...terms);
  }

  // Deduplicate and filter
  const seen = new Set();
  const newTerms = [];
  for (const term of allCandidates) {
    const lower = term.toLowerCase();
    if (!existingTerms.has(lower) && !seen.has(lower)) {
      seen.add(lower);
      newTerms.push(term);
    }
  }

  // Sort by length (prefer multi-word terms) and cap
  newTerms.sort((a, b) => b.split(' ').length - a.split(' ').length || b.length - a.length);
  const selected = newTerms.slice(0, maxTerms);

  console.log(`\nNew terms to add: ${selected.length}`);

  if (selected.length === 0) {
    console.log('No new terms found. Vocabulary already covers this topic well.');
    return;
  }

  if (dryRun) {
    console.log('\n--- DRY RUN: Terms that would be added ---');
    selected.forEach((t, i) => console.log(`  ${i + 1}. ${t}`));
    console.log('\nRun without --dry-run to add these terms.');
    return;
  }

  // Compute embeddings
  console.log('\nLoading model (Xenova/all-MiniLM-L6-v2)...');
  const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

  console.log('Computing embeddings...');
  const newEntries = [];
  const batchSize = 32;

  for (let i = 0; i < selected.length; i += batchSize) {
    const batch = selected.slice(i, i + batchSize);
    const outputs = await extractor(batch, { pooling: 'mean', normalize: true });

    for (let j = 0; j < batch.length; j++) {
      const embedding = Array.from(outputs[j].data);
      const rounded = embedding.map((v) => parseFloat(v.toFixed(6)));
      newEntries.push({ term: batch[j], embedding: rounded, source: 'web' });
    }

    const done = Math.min(i + batchSize, selected.length);
    process.stdout.write(`\r  ${done}/${selected.length} terms embedded`);
  }

  // Merge and write
  const merged = [...existingVocab, ...newEntries];
  console.log(`\n\nWriting vocabulary.json (${merged.length} total terms)...`);
  writeFileSync(vocabPath, JSON.stringify(merged, null, 2) + '\n');

  console.log(`Done! Added ${newEntries.length} new terms from "${topic}".`);
  console.log(`Total vocabulary: ${merged.length} terms.`);
}

main().catch(console.error);
```

**Step 2: Commit**

```bash
git add scripts/enrich-vocabulary.mjs
git commit -m "feat(genetics): add vocabulary enrichment script (arxiv, HN, Wikipedia)"
```

---

### Task 12: Add E2E tests for tournament and lineage

**Files:**
- Modify: `tests/e2e/lab.spec.ts`

**Step 1: Add new tests**

Append to `tests/e2e/lab.spec.ts`:

```typescript
test('Tournament button appears when offspring exist', async ({ page }) => {
  await page.goto('/lab?parentA=idea-2026-03-05-rec-audit&parentB=idea-2026-03-05-kan-ambient');
  // Breed offspring first
  const breedBtn = page.locator('button.btn--primary', { hasText: 'breed' });
  await breedBtn.waitFor({ timeout: 10000 });
  await breedBtn.click();
  // Wait for offspring to appear
  await expect(page.locator('.idea-grid .card').first()).toBeVisible({ timeout: 15000 });
  // Tournament button should appear
  await expect(page.getByText('tournament', { exact: true })).toBeVisible();
});

test('Tournament mode shows matchup view', async ({ page }) => {
  await page.goto('/lab?parentA=idea-2026-03-05-rec-audit&parentB=idea-2026-03-05-kan-ambient');
  const breedBtn = page.locator('button.btn--primary', { hasText: 'breed' });
  await breedBtn.waitFor({ timeout: 10000 });
  await breedBtn.click();
  await expect(page.locator('.idea-grid .card').first()).toBeVisible({ timeout: 15000 });
  // Enter tournament mode
  await page.getByText('tournament', { exact: true }).click();
  // Should see tournament UI
  await expect(page.locator('.tournament-container')).toBeVisible({ timeout: 5000 });
  await expect(page.locator('.tournament-vs')).toBeVisible();
});
```

**Step 2: Run tests**

Run: `npx playwright test tests/e2e/lab.spec.ts`

**Step 3: Fix any failures and commit**

```bash
git add tests/e2e/lab.spec.ts
git commit -m "test(genetics): add e2e tests for tournament and lineage features"
```

---

### Task 13: Run full E2E suite

**Step 1: Run all tests**

Run: `npx playwright test`
Expected: All tests pass

**Step 2: Fix any regressions and commit**

```bash
git commit -m "fix: resolve e2e regressions from genetics phase 2 remaining features"
```
