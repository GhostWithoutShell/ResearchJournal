# Genetics Phase 2 — Remaining Features Design

## Overview

Three remaining features from the Phase 2 design: tournament selection, extended genealogy with inheritance animation, and vocabulary enrichment script.

## 1. Tournament Selection

Paired comparison of offspring — two shown side by side, user picks the better one. Winners accumulate `tournamentWins` (field already exists in schema).

### UI

New section on LabPage, appears when 2+ offspring exist. "Start Tournament" button switches from grid to tournament mode:
- Two offspring side by side (DNA fingerprint + concepts + fitness)
- Buttons: "Choose Left" / "Choose Right" / "Skip"
- Progress bar: "Round 1/N"
- After all pairs — results: ranked list by wins
- Tournament winner highlighted in grid after exiting tournament mode

### Algorithm

Round-robin — every pair (N offspring = N*(N-1)/2 pairs). For >10 offspring — random sample (max 15 rounds).

### Files
- New: `src/components/react/LabTournament.tsx`
- Modify: `src/components/react/LabPage.tsx` (toggle tournament mode)
- Modify: `src/stores/lab.ts` (incrementTournamentWins, resetTournament)

## 2. Extended Genealogy

### Lineage Tree

Expandable "Lineage" section in LabOffspringCard. On click — tree view:
- Each node: miniature DNA fingerprint (24px) + title/id
- Lines connect parents to offspring
- Line colors by block — which block is dominant from which parent (like crossover weight bars, but in tree form)
- If parent is also a lab offspring, branch expands recursively
- If parent is a regular library idea, shown as leaf node

Implementation: Pure React (recursive component), no d3 — tree is small, CSS grid/flexbox sufficient. Data already available: `parentA`/`parentB` + `generation` in each offspring, ideas from props.

### Inheritance Animation in DNA Fingerprint

On hover over offspring's DNA fingerprint — blocks highlight with parent's color showing "who gave what":
- 6 fingerprint blocks correspond to 6 crossover weights
- `weight[i] < 0.4` — block dominant from Parent A (highlight with A's color)
- `weight[i] > 0.6` — from Parent B (highlight with B's color)
- `0.4-0.6` — mixed (pulse between both colors)
- On hover: smooth ~2sec animation — blocks "flash" parent color in sequence (wave left to right)
- Parent colors: derived from their DNA fingerprint dominant palette hue

### Files
- New: `src/components/react/LabLineageTree.tsx`
- Modify: `src/components/react/LabOffspringCard.tsx` (add "Show lineage" toggle)
- Modify: `src/components/react/DnaFingerprint.tsx` (add inheritance animation)

## 3. Vocabulary Enrichment Script

CLI script `scripts/enrich-vocabulary.mjs` — takes a topic, parses external sources, extracts terms, computes embeddings, merges into `vocabulary.json` with deduplication.

### Sources
- **arxiv** — search via API (`export.arxiv.org/api/query`), extract terms from titles and abstracts (top 20 results)
- **Hacker News** — Algolia API (`hn.algolia.com/api/v1/search`), top post titles by topic
- **Wikipedia** — REST API (`en.wikipedia.org/api/rest_v1/page/summary`), key terms from summary

### Term Extraction

From fetched text — significant words and n-grams (1-3 words), stop-word filtering, minimum 3 characters. Limit: up to 50 new terms per run.

### CLI Interface

```bash
node scripts/enrich-vocabulary.mjs --topic "reinforcement learning"
node scripts/enrich-vocabulary.mjs --topic "FPGA design" --source arxiv
```

### Pipeline
1. Fetch data from selected sources (default: all three)
2. Extract terms + deduplicate against existing vocabulary.json
3. Compute embeddings via `@huggingface/transformers` (same as existing script)
4. Merge into vocabulary.json with `source: 'web'`
5. Print stats: how many new terms added

### Flags
- `--topic <string>` — search topic (required)
- `--source <arxiv|hn|wikipedia|all>` — source (default: all)
- `--max-terms <number>` — max new terms (default: 50)
- `--dry-run` — show found terms without writing

### Files
- New: `scripts/enrich-vocabulary.mjs`
- Existing `generate-vocabulary-embeddings.mjs` unchanged
