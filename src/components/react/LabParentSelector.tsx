import { useState, useMemo } from 'react';
import type { Idea } from '../../lib/schemas';
import DnaFingerprint from './DnaFingerprint';

interface Props {
  ideas: Idea[];
  label: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function LabParentSelector({ ideas, label, selectedId, onSelect }: Props) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query.trim()) return ideas;
    const q = query.toLowerCase();
    return ideas.filter(
      (idea) =>
        idea.title.toLowerCase().includes(q) ||
        idea.description.toLowerCase().includes(q),
    );
  }, [ideas, query]);

  const selected = ideas.find((i) => i.id === selectedId);

  return (
    <div style={{ flex: 1, minWidth: '280px' }}>
      <div className="form-label" style={{ marginBottom: 'var(--spacing-sm)' }}>
        {label}
      </div>

      {selected ? (
        <div className="card" style={{ marginBottom: 'var(--spacing-sm)' }}>
          <div className="card-header">
            <div style={{ flex: 1 }}>
              <div className="card-title">{selected.title}</div>
              <p className="card-description" style={{ marginBottom: 0 }}>{selected.description}</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <DnaFingerprint embedding={selected.embedding} size={48} />
              <button
                className="btn btn--sm btn--ghost"
                onClick={() => {
                  onSelect('');
                  setQuery('');
                }}
                style={{ color: 'var(--color-muted)', fontSize: '0.6875rem', padding: '2px 6px' }}
              >
                × clear
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div style={{ position: 'relative', marginBottom: 'var(--spacing-sm)' }}>
            <input
              type="text"
              className="form-input"
              placeholder={`Filter ${ideas.length} ideas by title or description...`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ width: '100%', paddingRight: query ? '28px' : undefined }}
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                style={{
                  position: 'absolute',
                  right: '6px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-muted)',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  lineHeight: 1,
                  padding: '2px',
                }}
                title="Clear filter"
              >
                ×
              </button>
            )}
          </div>
          <div style={{
            maxHeight: '240px',
            overflowY: 'auto',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius)',
          }}>
            {filtered.length === 0 ? (
              <div style={{ padding: 'var(--spacing-md)', color: 'var(--color-muted)', fontSize: '0.8125rem' }}>
                No ideas found.
              </div>
            ) : (
              filtered.map((idea) => (
                <button
                  key={idea.id}
                  onClick={() => onSelect(idea.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-sm)',
                    width: '100%',
                    padding: 'var(--spacing-sm) var(--spacing-md)',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: '1px solid var(--color-dim)',
                    color: 'var(--color-text)',
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.8125rem',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--color-surface)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <DnaFingerprint embedding={idea.embedding} size={32} />
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {idea.title}
                  </span>
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
