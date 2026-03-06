import { atom } from 'nanostores';
import type { LabOffspring } from '../lib/schemas';
import { addDraft } from './ideas';
import type { Idea } from '../lib/schemas';

export const $labOffspring = atom<LabOffspring[]>([]);

const LAB_KEY = 'research-journal-lab';

/**
 * Load lab offspring from localStorage.
 */
export function loadLab(): void {
  if (typeof window === 'undefined') return;

  try {
    const stored = localStorage.getItem(LAB_KEY);
    if (stored) {
      $labOffspring.set(JSON.parse(stored) as LabOffspring[]);
    }
  } catch (e) {
    console.warn('Failed to load lab data from localStorage:', e);
  }
}

/**
 * Save lab offspring to localStorage.
 */
function saveLab(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(LAB_KEY, JSON.stringify($labOffspring.get()));
  } catch (e) {
    console.warn('Failed to save lab data to localStorage:', e);
  }
}

/**
 * Add a new offspring to the lab.
 */
export function addOffspring(offspring: LabOffspring): void {
  const current = $labOffspring.get();
  $labOffspring.set([...current, offspring]);
  saveLab();
}

/**
 * Add multiple offspring at once.
 */
export function addOffspringBatch(batch: LabOffspring[]): void {
  const current = $labOffspring.get();
  $labOffspring.set([...current, ...batch]);
  saveLab();
}

/**
 * Remove an offspring from the lab.
 */
export function removeOffspring(id: string): void {
  const current = $labOffspring.get();
  $labOffspring.set(current.filter((o) => o.id !== id));
  saveLab();
}

/**
 * Promote an offspring to the main idea library as a draft.
 * Creates an Idea from the offspring's embedding and decoded concepts.
 */
export function promoteToLibrary(
  offspring: LabOffspring,
  title: string,
  description: string,
  tags: string[],
): void {
  const now = new Date().toISOString();
  const randomHex = Math.random().toString(16).slice(2, 8);
  const datePrefix = now.slice(0, 10);

  const idea: Idea = {
    id: `idea-${datePrefix}-${randomHex}`,
    title,
    description,
    status: 'idea',
    results: null,
    repoLink: null,
    tags,
    createdAt: now,
    updatedAt: now,
    embedding: offspring.embedding,
  };

  addDraft(idea);
  removeOffspring(offspring.id);
}

/**
 * Clear all offspring from the lab.
 */
export function clearLab(): void {
  $labOffspring.set([]);
  saveLab();
}
