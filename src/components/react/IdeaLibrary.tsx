import { useEffect, useMemo } from 'react';
import { useStore } from '@nanostores/react';
import {
  $buildTimeIdeas,
  $draftIdeas,
  $allIdeas,
  initializeStore,
  isDraft,
  exportAll,
} from '../../stores/ideas';
import {
  $statusFilter,
  $tagFilter,
  $sortMode,
  $searchQuery,
} from '../../stores/ui';
import type { Idea, IdeaStatus } from '../../lib/schemas';
import type { SortMode } from '../../stores/ui';
import DnaFingerprint from './DnaFingerprint';
import SearchBar from './SearchBar';

interface Props {
  ideas: IdeaLight[];
  embeddings: Record<string, number[]>;
}

interface IdeaLight {
  id: string;
  title: string;
  description: string;
  status: IdeaStatus;
  results: string | null;
  repoLink: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

const STATUS_ORDER: Record<string, number> = {
  'in-progress': 0,
  'idea': 1,
  'done': 2,
  'killed': 3,
};

function StatusBadge({ status, isDraftBadge }: { status: string; isDraftBadge?: boolean }) {
  const badgeClass = isDraftBadge ? 'badge badge--draft' : `badge badge--${status}`;
  const label = isDraftBadge
    ? 'draft'
    : status === 'in-progress'
      ? 'in progress'
      : status;
  return <span className={badgeClass}>{label}</span>;
}

export default function IdeaLibrary({ ideas, embeddings }: Props) {
  const allIdeas = useStore($allIdeas);
  const statusFilter = useStore($statusFilter);
  const tagFilter = useStore($tagFilter);
  const sortMode = useStore($sortMode);
  const searchQuery = useStore($searchQuery);
  const drafts = useStore($draftIdeas);

  useEffect(() => {
    // Reconstruct full ideas with embeddings for build-time ideas
    const fullIdeas: Idea[] = ideas.map((idea) => ({
      ...idea,
      embedding: embeddings[idea.id] || Array(384).fill(0),
    }));
    initializeStore(fullIdeas);
  }, [ideas, embeddings]);

  // Collect all tags
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    allIdeas.forEach((idea) => idea.tags.forEach((t) => tags.add(t)));
    return Array.from(tags).sort();
  }, [allIdeas]);

  // Filter and sort ideas
  const filteredIdeas = useMemo(() => {
    let result = [...allIdeas];

    if (statusFilter) {
      result = result.filter((idea) => idea.status === statusFilter);
    }

    if (tagFilter.length > 0) {
      result = result.filter((idea) =>
        tagFilter.some((tag) => idea.tags.includes(tag)),
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (idea) =>
          idea.title.toLowerCase().includes(q) ||
          idea.description.toLowerCase().includes(q),
      );
    }

    switch (sortMode) {
      case 'newest':
        result.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        break;
      case 'oldest':
        result.sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        );
        break;
      case 'alpha':
        result.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'status':
        result.sort(
          (a, b) =>
            (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9),
        );
        break;
    }

    return result;
  }, [allIdeas, statusFilter, tagFilter, sortMode, searchQuery]);

  const statuses: (IdeaStatus | null)[] = [null, 'idea', 'in-progress', 'done', 'killed'];
  const sortOptions: { value: SortMode; label: string }[] = [
    { value: 'newest', label: 'newest first' },
    { value: 'oldest', label: 'oldest first' },
    { value: 'alpha', label: 'alphabetical' },
    { value: 'status', label: 'by status' },
  ];

  const handleExport = () => {
    const json = exportAll();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ideas.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--spacing-md)' }}>
          <div>
            <h1 className="page-title">Idea Library</h1>
            <p className="page-subtitle">
              {allIdeas.length} ideas tracked / {drafts.length} drafts
            </p>
          </div>
          {drafts.length > 0 && (
            <button className="btn btn--primary" onClick={handleExport} style={{ fontSize: '0.75rem' }}>
              &gt; export json
            </button>
          )}
        </div>
      </div>

      <div className="filters-bar">
        <div className="filter-group">
          <span className="filter-label">status:</span>
          {statuses.map((s) => (
            <button
              key={s ?? 'all'}
              className={`btn btn--sm ${statusFilter === s ? 'btn--active' : 'btn--ghost'}`}
              onClick={() => $statusFilter.set(s)}
            >
              {s ?? 'all'}
            </button>
          ))}
        </div>

        <div className="filter-group">
          <span className="filter-label">sort:</span>
          <select
            className="form-select"
            aria-label="Sort mode"
            style={{ width: 'auto', padding: '2px 32px 2px 8px', fontSize: '0.75rem' }}
            value={sortMode}
            onChange={(e) => $sortMode.set(e.target.value as SortMode)}
          >
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <SearchBar />
      </div>

      {allTags.length > 0 && (
        <div style={{ marginBottom: 'var(--spacing-lg)', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          <span className="filter-label" style={{ marginRight: '8px', alignSelf: 'center' }}>tags:</span>
          {allTags.map((tag) => (
            <button
              key={tag}
              className={`btn btn--sm ${tagFilter.includes(tag) ? 'btn--active' : 'btn--ghost'}`}
              onClick={() => {
                const current = $tagFilter.get();
                if (current.includes(tag)) {
                  $tagFilter.set(current.filter((t) => t !== tag));
                } else {
                  $tagFilter.set([...current, tag]);
                }
              }}
            >
              #{tag}
            </button>
          ))}
          {tagFilter.length > 0 && (
            <button
              className="btn btn--sm btn--ghost"
              onClick={() => $tagFilter.set([])}
              style={{ color: 'var(--color-muted)' }}
            >
              clear
            </button>
          )}
        </div>
      )}

      {filteredIdeas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 'var(--spacing-2xl)', color: 'var(--color-muted)' }}>
          <p>No ideas match the current filters.</p>
          <p style={{ fontSize: '0.8125rem', marginTop: 'var(--spacing-sm)' }}>
            Try adjusting your search or filters.
          </p>
        </div>
      ) : (
        <div className="idea-grid">
          {filteredIdeas.map((idea) => {
            const draft = isDraft(idea.id);
            const href = draft
              ? `/draft?id=${encodeURIComponent(idea.id)}`
              : `/idea/${idea.id}`;

            return (
              <article key={idea.id} className="card">
                <div className="card-header">
                  <div>
                    <h3 className="card-title">
                      <a href={href}>{idea.title}</a>
                    </h3>
                  </div>
                  <div className="card-dna">
                    <DnaFingerprint embedding={idea.embedding} size={48} />
                  </div>
                </div>
                <p className="card-description">{idea.description}</p>
                <div className="card-footer">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                    <StatusBadge status={idea.status} />
                    {draft && <StatusBadge status="draft" isDraftBadge />}
                  </div>
                  <div className="tag-list">
                    {idea.tags.map((tag) => (
                      <span key={tag} className="tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
