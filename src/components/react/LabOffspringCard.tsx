import { useState } from 'react';
import type { LabOffspring, Idea } from '../../lib/schemas';
import { removeOffspring, promoteToLibrary } from '../../stores/lab';
import DnaFingerprint from './DnaFingerprint';
import LabLineageTree from './LabLineageTree';

const BLOCK_LABELS = ['Palette', 'Shapes', 'Pattern', 'Composition', 'Rhythm', 'Details'];

interface Props {
  offspring: LabOffspring;
  parentA?: Idea;
  parentB?: Idea;
  allOffspring: LabOffspring[];
  ideasMap: Record<string, Idea>;
}

export default function LabOffspringCard({ offspring, parentA, parentB, allOffspring, ideasMap }: Props) {
  const [promoting, setPromoting] = useState(false);
  const [title, setTitle] = useState(offspring.suggestedTitle || '');
  const [description, setDescription] = useState(offspring.suggestedDescription || '');
  const [nextAction, setNextAction] = useState('');
  const [showLineage, setShowLineage] = useState(false);

  const handlePromote = () => {
    if (!title.trim() || !nextAction.trim()) return;
    const baseDesc = description.trim() || offspring.decodedConcepts.join(', ');
    const desc = baseDesc + '\n\n**Next action:** ' + nextAction.trim();
    promoteToLibrary(offspring, title.trim(), desc, ['lab-offspring']);
    setPromoting(false);
  };

  return (
    <article className="card">
      <div className="card-header">
        <div style={{ flex: 1 }}>
          {offspring.suggestedTitle && (
            <h3 className="card-title" style={{ marginBottom: 'var(--spacing-xs)' }}>
              {offspring.suggestedTitle}
            </h3>
          )}
          {offspring.suggestedDescription && (
            <p className="card-description">{offspring.suggestedDescription}</p>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: 'var(--spacing-sm)' }}>
            {offspring.decodedConcepts.map((concept) => (
              <span key={concept} className="tag">{concept}</span>
            ))}
          </div>
          <div style={{ fontSize: '0.6875rem', color: 'var(--color-muted)' }}>
            gen {offspring.generation} / mutation {(offspring.mutationStrength * 100).toFixed(0)}%
          </div>
        </div>
        <div className="card-dna">
          <DnaFingerprint
            embedding={offspring.embedding}
            size={48}
            crossoverWeights={offspring.crossoverWeights}
            parentAEmbedding={parentA?.embedding}
            parentBEmbedding={parentB?.embedding}
          />
        </div>
      </div>

      {/* Genealogy: parent miniatures + crossover weights */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--spacing-md)',
        padding: 'var(--spacing-sm) 0',
        borderTop: '1px solid var(--color-dim)',
        marginTop: 'var(--spacing-sm)',
      }}>
        {parentA && (
          <div style={{ textAlign: 'center' }}>
            <DnaFingerprint embedding={parentA.embedding} size={32} />
            <div style={{ fontSize: '0.625rem', color: 'var(--color-muted)', marginTop: '2px', maxWidth: '60px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {parentA.title}
            </div>
          </div>
        )}

        <div style={{ flex: 1, fontSize: '0.625rem', color: 'var(--color-muted)' }}>
          {BLOCK_LABELS.map((label, i) => {
            const w = offspring.crossoverWeights[i];
            const pctA = ((1 - w) * 100).toFixed(0);
            return (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '1px' }}>
                <span style={{ width: '72px', textAlign: 'right' }}>{label}</span>
                <div style={{
                  flex: 1,
                  height: '4px',
                  background: 'var(--color-dim)',
                  borderRadius: '2px',
                  overflow: 'hidden',
                  display: 'flex',
                }}>
                  <div style={{ width: `${pctA}%`, background: 'var(--color-accent)', opacity: 0.6 }} />
                  <div style={{ flex: 1, background: '#33cc33', opacity: 0.6 }} />
                </div>
              </div>
            );
          })}
        </div>

        {parentB && (
          <div style={{ textAlign: 'center' }}>
            <DnaFingerprint embedding={parentB.embedding} size={32} />
            <div style={{ fontSize: '0.625rem', color: 'var(--color-muted)', marginTop: '2px', maxWidth: '60px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {parentB.title}
            </div>
          </div>
        )}
      </div>

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

      {offspring.fitness && (
        <div className="fitness-scores">
          <div className="fitness-label">Fitness</div>
          {(['novelty', 'balance', 'coverage'] as const).map((metric) => (
            <div className="fitness-row" key={metric}>
              <span className="fitness-name">{metric}</span>
              <div className="fitness-bar">
                <div className="fitness-fill" style={{ width: `${(offspring.fitness![metric]) * 100}%` }} />
              </div>
              <span className="fitness-value">{offspring.fitness![metric].toFixed(2)}</span>
            </div>
          ))}
          <div className="fitness-total">
            total: {offspring.fitness.total.toFixed(2)}
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-md)' }}>
        {!promoting ? (
          <>
            <button className="btn btn--sm btn--primary" onClick={() => setPromoting(true)}>
              promote
            </button>
            <button
              className="btn btn--sm btn--ghost"
              onClick={() => removeOffspring(offspring.id)}
              style={{ color: 'var(--color-muted)' }}
            >
              discard
            </button>
          </>
        ) : (
          <div style={{ width: '100%' }}>
            <input
              type="text"
              className="form-input"
              placeholder="Give this idea a title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{ marginBottom: 'var(--spacing-sm)', fontSize: '0.8125rem' }}
              autoFocus
            />
            <textarea
              className="form-textarea"
              placeholder="Description (optional, concepts will be used as default)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ minHeight: '60px', marginBottom: 'var(--spacing-sm)', fontSize: '0.8125rem' }}
            />
            <input
              type="text"
              className="form-input"
              placeholder="What can you do about this right now, in 1 hour?"
              value={nextAction}
              onChange={(e) => setNextAction(e.target.value)}
              style={{ marginBottom: 'var(--spacing-sm)', fontSize: '0.8125rem' }}
            />
            <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
              <button className="btn btn--sm btn--primary" onClick={handlePromote} disabled={!nextAction.trim()}>
                &gt; save to library
              </button>
              <button className="btn btn--sm btn--ghost" onClick={() => setPromoting(false)}>
                cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
