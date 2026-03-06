import { atom, computed } from 'nanostores';
import type { Idea } from '../lib/schemas';

// Build-time ideas loaded from JSON
export const $buildTimeIdeas = atom<Idea[]>([]);

// Draft ideas stored in localStorage
export const $draftIdeas = atom<Idea[]>([]);

// Merged view: build-time + drafts
export const $allIdeas = computed(
  [$buildTimeIdeas, $draftIdeas],
  (buildTime, drafts) => [...buildTime, ...drafts],
);

const DRAFTS_KEY = 'research-journal-drafts';

/**
 * Initialize the store with build-time ideas and load drafts from localStorage.
 */
export function initializeStore(buildTimeIdeas: Idea[]): void {
  $buildTimeIdeas.set(buildTimeIdeas);
  loadDrafts();
}

/**
 * Load draft ideas from localStorage.
 */
export function loadDrafts(): void {
  if (typeof window === 'undefined') return;

  try {
    const stored = localStorage.getItem(DRAFTS_KEY);
    if (stored) {
      const drafts = JSON.parse(stored) as Idea[];
      $draftIdeas.set(drafts);
    }
  } catch (e) {
    console.warn('Failed to load drafts from localStorage:', e);
  }
}

/**
 * Save current drafts to localStorage.
 */
function saveDrafts(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(DRAFTS_KEY, JSON.stringify($draftIdeas.get()));
  } catch (e) {
    console.warn('Failed to save drafts to localStorage:', e);
  }
}

/**
 * Add a new draft idea.
 */
export function addDraft(idea: Idea): void {
  const current = $draftIdeas.get();
  $draftIdeas.set([...current, idea]);
  saveDrafts();
}

/**
 * Update an existing draft idea.
 */
export function updateDraft(id: string, updates: Partial<Idea>): void {
  const current = $draftIdeas.get();
  const updated = current.map((idea) =>
    idea.id === id ? { ...idea, ...updates, updatedAt: new Date().toISOString() } : idea,
  );
  $draftIdeas.set(updated);
  saveDrafts();
}

/**
 * Remove a draft idea.
 */
export function removeDraft(id: string): void {
  const current = $draftIdeas.get();
  $draftIdeas.set(current.filter((idea) => idea.id !== id));
  saveDrafts();
}

/**
 * Get all draft ideas.
 */
export function getDrafts(): Idea[] {
  return $draftIdeas.get();
}

/**
 * Export all ideas (build-time + drafts) as JSON.
 */
export function exportAll(): string {
  return JSON.stringify($allIdeas.get(), null, 2);
}

/**
 * Check if an idea is a draft.
 */
export function isDraft(id: string): boolean {
  return $draftIdeas.get().some((idea) => idea.id === id);
}
