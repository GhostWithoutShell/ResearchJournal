import { useEffect, useState } from 'react';
import { useStore } from '@nanostores/react';
import { $allIdeas, initializeStore, isDraft, removeDraft } from '../../stores/ideas';
import type { Idea } from '../../lib/schemas';
import DnaFingerprint from './DnaFingerprint';

interface Props {
  ideaId?: string;
  buildTimeIdeas: Idea[];
}

export default function DraftIdeaDetail({ ideaId: propId, buildTimeIdeas }: Props) {
  const allIdeas = useStore($allIdeas);
  const [initialized, setInitialized] = useState(false);

  // Read idea ID from URL query param (?id=xxx) or prop
  const ideaId = propId || (typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('id') || ''
    : '');

  useEffect(() => {
    initializeStore(buildTimeIdeas);
    setInitialized(true);
  }, [buildTimeIdeas]);

  if (!initialized) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--spacing-2xl)', color: 'var(--color-muted)' }}>
        Loading...
      </div>
    );
  }

  const idea = allIdeas.find((i) => i.id === ideaId);

  if (!idea) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--spacing-2xl)', color: 'var(--color-muted)' }}>
        <p>Idea not found.</p>
        <a href="/" className="btn btn--ghost" style={{ marginTop: 'var(--spacing-md)', display: 'inline-block' }}>
          &lt; back to library
        </a>
      </div>
    );
  }

  const draft = isDraft(idea.id);

  const handleDelete = () => {
    if (confirm('Delete this draft?')) {
      removeDraft(idea.id);
      window.location.href = '/';
    }
  };

  return (
    <div className="idea-detail">
      <div style={{ marginBottom: 'var(--spacing-lg)' }}>
        <a href="/" className="btn btn--ghost" style={{ fontSize: '0.75rem' }}>
          &lt; back to library
        </a>
      </div>

      <div className="idea-detail-header">
        <div className="idea-detail-dna">
          <DnaFingerprint embedding={idea.embedding} size={400} />
        </div>
        <div className="idea-detail-info">
          <h1 className="idea-detail-title">{idea.title}</h1>
          <div className="idea-detail-meta">
            <span className={`badge badge--${idea.status}`}>
              {idea.status === 'in-progress' ? 'in progress' : idea.status}
            </span>
            {draft && <span className="badge badge--draft">draft</span>}
            <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
              created {new Date(idea.createdAt).toLocaleDateString()}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
              updated {new Date(idea.updatedAt).toLocaleDateString()}
            </span>
          </div>
          <div className="tag-list" style={{ marginBottom: 'var(--spacing-md)' }}>
            {idea.tags.map((tag) => (
              <span key={tag} className="tag">{tag}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="idea-detail-section">
        <h3>Description</h3>
        <p className="idea-detail-description">{idea.description}</p>
      </div>

      {idea.results && (
        <div className="idea-detail-section">
          <h3>Results</h3>
          <p style={{ fontSize: '0.875rem', lineHeight: 1.7, color: 'var(--color-accent)' }}>{idea.results}</p>
        </div>
      )}

      {idea.repoLink && (
        <div className="idea-detail-section">
          <h3>Repository</h3>
          <a href={idea.repoLink} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.875rem' }}>
            {idea.repoLink}
          </a>
        </div>
      )}

      {draft && (
        <div style={{ marginTop: 'var(--spacing-xl)', paddingTop: 'var(--spacing-lg)', borderTop: '1px solid var(--color-border)' }}>
          <button className="btn btn--sm btn--ghost" onClick={handleDelete} style={{ color: 'var(--color-muted)' }}>
            delete draft
          </button>
        </div>
      )}

      <div style={{ marginTop: 'var(--spacing-xl)', paddingTop: 'var(--spacing-lg)', borderTop: '1px solid var(--color-border)' }}>
        <a href="/" className="btn btn--ghost" style={{ fontSize: '0.8125rem' }}>
          &lt; back to library
        </a>
      </div>
    </div>
  );
}
