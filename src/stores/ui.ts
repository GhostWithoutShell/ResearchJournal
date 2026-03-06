import { atom } from 'nanostores';
import type { IdeaStatus } from '../lib/schemas';

/**
 * Status filter — null means show all.
 */
export const $statusFilter = atom<IdeaStatus | null>(null);

/**
 * Tag filter — empty array means show all.
 */
export const $tagFilter = atom<string[]>([]);

/**
 * Sort mode for the idea library.
 */
export type SortMode = 'newest' | 'oldest' | 'alpha' | 'status';
export const $sortMode = atom<SortMode>('newest');

/**
 * Search query for filtering ideas by title/description.
 */
export const $searchQuery = atom<string>('');
