# Project Context

## Why this project exists

The author generates many ideas but rarely finishes them. Living in the AI era, the best optimization is learning to filter ideas — cut the trivial ones, keep the important ones, then prototype.

This is NOT a task manager. It's a **personal research journal** — a scientist's lab notebook for ideas.

## Philosophy

- Not everything should be evaluated by money. Many important scientific discoveries wouldn't exist if judged by commercial value.
- Example idea from the author: recording ambient sounds from different districts/seasons/times, training a KAN network on them to extract mathematical formulas. Nobody would pay for this, but it's genuinely interesting and could lead to unexpected discoveries.
- The filter should be: **"Will I learn something new that I didn't know?"** — not "Who will pay for this?"

## Key insight about DNA fingerprint

The DNA is an embedding vector from the idea's title/description. It serves two purposes:
1. **Visual identity** — each idea gets a unique generative art piece, making the library visually interesting
2. **Similarity metric** — ideas with similar DNA are semantically related, enabling clustering and "find similar" features

## Author's preferences

- Astro + React for frontend
- JSON files for storage (data lives in the repo)
- Transformers.js for embeddings (runs in browser, no external API keys needed)
- Research lab aesthetic, not corporate
