import { useState, useEffect, useMemo } from 'react';
import { useStore } from '@nanostores/react';
import type { Idea, LabOffspring } from '../../lib/schemas';
import { $allIdeas, initializeStore } from '../../stores/ideas';
import { $labOffspring, loadLab, addOffspringBatch, clearLab, sortOffspringByFitness } from '../../stores/lab';
import { generateOffspring } from '../../lib/genetics';
import { loadVocabulary, decodeConcepts, generateOffspringText } from '../../lib/concept-vocabulary';
import type { ConceptEntry } from '../../lib/schemas';
import LabParentSelector from './LabParentSelector';
import LabOffspringCard from './LabOffspringCard';
import LabTournament from './LabTournament';

const BLOCK_LABELS = ['Palette', 'Shapes', 'Pattern', 'Composition', 'Rhythm', 'Details'];

interface Props {
  ideas: Idea[];
  vocabulary: ConceptEntry[];
}

export default function LabPage({ ideas, vocabulary }: Props) {
  const allIdeas = useStore($allIdeas);
  const offspring = useStore($labOffspring);

  const [parentAId, setParentAId] = useState<string | null>(null);
  const [parentBId, setParentBId] = useState<string | null>(null);
  const [weights, setWeights] = useState<number[]>([0.5, 0.5, 0.5, 0.5, 0.5, 0.5]);
  const [mutationStrength, setMutationStrength] = useState(0.05);
  const [count, setCount] = useState(4);
  const [breeding, setBreeding] = useState(false);
  const [sortMode, setSortMode] = useState<'newest' | 'fitness'>('newest');
  const [tournamentMode, setTournamentMode] = useState(false);

  useEffect(() => {
    initializeStore(ideas);
    loadLab();
  }, [ideas]);

  // Pre-select parents from URL params (e.g. navigating from graph breed mode)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const pA = params.get('parentA');
    const pB = params.get('parentB');
    if (pA) setParentAId(pA);
    if (pB) setParentBId(pB);
  }, []);

  const parentA = useMemo(() => allIdeas.find((i) => i.id === parentAId), [allIdeas, parentAId]);
  const parentB = useMemo(() => allIdeas.find((i) => i.id === parentBId), [allIdeas, parentBId]);

  // Build a lookup map for parent resolution in offspring cards
  const ideasMap = useMemo(() => {
    const map: Record<string, Idea> = {};
    for (const idea of allIdeas) {
      map[idea.id] = idea;
    }
    return map;
  }, [allIdeas]);

  const handleBreed = () => {
    if (!parentA || !parentB) return;
    setBreeding(true);

    // Use setTimeout to allow UI to update
    setTimeout(() => {
      const vocab = loadVocabulary(vocabulary);
      const results = generateOffspring(parentA.embedding, parentB.embedding, {
        count,
        baseWeights: weights,
        mutationStrength,
        vocabulary: vocab,
      });

      const now = new Date().toISOString();
      const batch: LabOffspring[] = results.map((r, i) => {
        const concepts = decodeConcepts(r.embedding, vocab);
        const text = generateOffspringText(concepts, parentA, parentB);
        return {
          id: `offspring-${Date.now()}-${Math.random().toString(36).slice(2, 6)}-${i}`,
          parentA: parentA.id,
          parentB: parentB.id,
          embedding: r.embedding,
          decodedConcepts: concepts,
          suggestedTitle: text.title,
          suggestedDescription: text.description,
          crossoverWeights: r.crossoverWeights,
          mutationStrength: r.mutationStrength,
          generation: 1,
          createdAt: now,
        };
      });

      addOffspringBatch(batch);
      setBreeding(false);
    }, 50);
  };

  const canBreed = parentA && parentB && parentAId !== parentBId;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Genetics Lab</h1>
        <p className="page-subtitle">
          Cross-breed ideas in embedding space. Select two parents, adjust crossover weights, and generate offspring.
        </p>
      </div>

      {/* Parent selection */}
      <div style={{
        display: 'flex',
        gap: 'var(--spacing-xl)',
        marginBottom: 'var(--spacing-xl)',
        flexWrap: 'wrap',
      }}>
        <LabParentSelector
          ideas={allIdeas}
          label="parent a"
          selectedId={parentAId}
          onSelect={(id) => setParentAId(id || null)}
        />
        <LabParentSelector
          ideas={allIdeas}
          label="parent b"
          selectedId={parentBId}
          onSelect={(id) => setParentBId(id || null)}
        />
      </div>

      {/* Crossover controls */}
      {canBreed && (
        <div style={{
          padding: 'var(--spacing-lg)',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius)',
          marginBottom: 'var(--spacing-xl)',
        }}>
          <div className="form-label" style={{ marginBottom: 'var(--spacing-md)' }}>
            crossover weights
          </div>
          <p className="form-hint" style={{ marginBottom: 'var(--spacing-md)' }}>
            Each slider controls which parent dominates a DNA block.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 'var(--spacing-md)' }}>
            {BLOCK_LABELS.map((label, i) => {
              const pctB = (weights[i] * 100).toFixed(0);
              const pctA = ((1 - weights[i]) * 100).toFixed(0);
              return (
                <div key={label}>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--color-muted)', marginBottom: '2px', textAlign: 'center' }}>
                    {label}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.625rem', color: 'var(--color-muted)', marginBottom: '1px' }}>
                    <span>A {pctA}%</span>
                    <span>{pctB}% B</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={weights[i]}
                    onChange={(e) => {
                      const next = [...weights];
                      next[i] = parseFloat(e.target.value);
                      setWeights(next);
                    }}
                    style={{ width: '100%', accentColor: 'var(--color-accent)' }}
                  />
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: 'var(--spacing-xl)', marginTop: 'var(--spacing-lg)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: 1, minWidth: '200px', maxWidth: '300px' }}>
              <div className="form-label" style={{ marginBottom: 'var(--spacing-xs)' }}>
                mutation strength — {(mutationStrength * 100).toFixed(0)}%
              </div>
              <input
                type="range"
                min="0.01"
                max="0.3"
                step="0.01"
                value={mutationStrength}
                onChange={(e) => setMutationStrength(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--color-accent)' }}
              />
            </div>

            <div style={{ minWidth: '120px' }}>
              <div className="form-label" style={{ marginBottom: 'var(--spacing-xs)' }}>
                offspring count
              </div>
              <input
                type="number"
                className="form-input"
                min="1"
                max="20"
                value={count}
                onChange={(e) => setCount(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                style={{ width: '80px', textAlign: 'center' }}
              />
            </div>
          </div>

          <div style={{ marginTop: 'var(--spacing-lg)' }}>
            <button
              className="btn btn--primary"
              onClick={handleBreed}
              disabled={breeding}
            >
              {breeding ? 'breeding...' : `> breed (${count} offspring)`}
            </button>
          </div>
        </div>
      )}

      {/* Offspring results */}
      {offspring.length > 0 && (
        <div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 'var(--spacing-md)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
              <h2 style={{ fontSize: '1rem', color: 'var(--color-ink)', margin: 0 }}>
                Offspring ({offspring.length})
              </h2>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  style={{
                    padding: '2px 8px',
                    fontSize: '0.6875rem',
                    fontFamily: 'inherit',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius)',
                    cursor: 'pointer',
                    background: sortMode === 'newest' ? 'var(--color-ink)' : 'transparent',
                    color: sortMode === 'newest' ? 'var(--color-bg)' : 'var(--color-muted)',
                  }}
                  onClick={() => setSortMode('newest')}
                >
                  newest
                </button>
                <button
                  style={{
                    padding: '2px 8px',
                    fontSize: '0.6875rem',
                    fontFamily: 'inherit',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius)',
                    cursor: 'pointer',
                    background: sortMode === 'fitness' ? 'var(--color-ink)' : 'transparent',
                    color: sortMode === 'fitness' ? 'var(--color-bg)' : 'var(--color-muted)',
                  }}
                  onClick={() => setSortMode('fitness')}
                >
                  fitness
                </button>
              </div>
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
            </div>
            <button
              className="btn btn--sm btn--ghost"
              onClick={() => {
                if (confirm('Clear all offspring from the lab?')) {
                  clearLab();
                }
              }}
              style={{ color: 'var(--color-muted)' }}
            >
              clear all
            </button>
          </div>

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
                  allOffspring={offspring}
                  ideasMap={ideasMap}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {offspring.length === 0 && !canBreed && (
        <div style={{ textAlign: 'center', padding: 'var(--spacing-2xl)', color: 'var(--color-muted)' }}>
          <p>Select two parent ideas above to start breeding.</p>
          <p style={{ fontSize: '0.8125rem', marginTop: 'var(--spacing-sm)' }}>
            Offspring will inherit traits from both parents based on crossover weights.
          </p>
        </div>
      )}
    </div>
  );
}
