import { useState } from 'react';
import { addDraft } from '../../stores/ideas';
import { generateEmbedding } from '../../lib/embeddings';
import type { IdeaStatus } from '../../lib/schemas';

export default function AddEditIdeaForm() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<IdeaStatus>('idea');
  const [tagsInput, setTagsInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    setSubmitting(true);

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const now = new Date().toISOString();
    const id = `idea-${now.slice(0, 10)}-${Math.random().toString(36).slice(2, 8)}`;

    // Generate real embedding from title + description (loads model on first use)
    const embedding = await generateEmbedding(title + ' ' + description);

    addDraft({
      id,
      title: title.trim(),
      description: description.trim(),
      status,
      results: null,
      repoLink: null,
      tags,
      createdAt: now,
      updatedAt: now,
      embedding,
    });

    setSuccess(true);
    setSubmitting(false);

    // Redirect after short delay
    setTimeout(() => {
      window.location.href = '/';
    }, 800);
  };

  if (success) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--spacing-2xl)' }}>
        <p style={{ color: 'var(--color-accent)', fontSize: '1.25rem' }}>
          &gt; idea saved as draft_
        </p>
        <p style={{ color: 'var(--color-muted)', marginTop: 'var(--spacing-md)', fontSize: '0.8125rem' }}>
          Redirecting to library...
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: '640px' }}>
      <div className="form-group">
        <label className="form-label" htmlFor="title">
          title *
        </label>
        <input
          id="title"
          type="text"
          className="form-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What's the idea?"
          required
        />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="description">
          description *
        </label>
        <textarea
          id="description"
          className="form-textarea"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the idea in detail. What problem does it solve? What makes it interesting?"
          required
        />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="status">
          status
        </label>
        <select
          id="status"
          className="form-select"
          value={status}
          onChange={(e) => setStatus(e.target.value as IdeaStatus)}
        >
          <option value="idea">idea</option>
          <option value="in-progress">in-progress</option>
          <option value="done">done</option>
          <option value="killed">killed</option>
        </select>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="tags">
          tags
        </label>
        <input
          id="tags"
          type="text"
          className="form-input"
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          placeholder="audio, ML, research (comma separated)"
        />
        <p className="form-hint">Separate tags with commas</p>
      </div>

      <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-xl)' }}>
        <button type="submit" className="btn btn--primary" disabled={submitting}>
          {submitting ? 'saving...' : '> save draft'}
        </button>
        <a href="/" className="btn">
          cancel
        </a>
      </div>

      <p className="form-hint" style={{ marginTop: 'var(--spacing-md)' }}>
        Draft ideas are stored in your browser's localStorage. Export from the library to commit to the repo.
      </p>
    </form>
  );
}
