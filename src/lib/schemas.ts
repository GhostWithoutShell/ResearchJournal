import { z } from 'zod';

export const IdeaStatusSchema = z.enum(['idea', 'in-progress', 'done', 'killed']);
export type IdeaStatus = z.infer<typeof IdeaStatusSchema>;

export const IdeaSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  description: z.string().min(1),
  status: IdeaStatusSchema,
  results: z.string().nullable(),
  repoLink: z.string().url().nullable(),
  tags: z.array(z.string()),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  embedding: z.array(z.number()).length(384),
});

export type Idea = z.infer<typeof IdeaSchema>;

export const ConnectionLabelSchema = z.enum([
  'builds-on',
  'alternative-to',
  'inspired-by',
  'component-of',
  'related',
  'child-of',
]);
export type ConnectionLabel = z.infer<typeof ConnectionLabelSchema>;

export const ConnectionSchema = z.object({
  id: z.string(),
  sourceId: z.string(),
  targetId: z.string(),
  label: ConnectionLabelSchema,
  createdAt: z.string().datetime(),
});

export type Connection = z.infer<typeof ConnectionSchema>;

export const LabOffspringSchema = z.object({
  id: z.string(),
  parentA: z.string(),
  parentB: z.string(),
  embedding: z.array(z.number()).length(384),
  decodedConcepts: z.array(z.string()),
  suggestedTitle: z.string().optional(),
  suggestedDescription: z.string().optional(),
  crossoverWeights: z.array(z.number()).length(6),
  mutationStrength: z.number().min(0).max(1),
  generation: z.number().int().min(1),
  fitness: z.object({
    novelty: z.number(),
    balance: z.number(),
    coverage: z.number(),
    total: z.number(),
  }).optional(),
  tournamentWins: z.number().int().optional(),
  createdAt: z.string().datetime(),
});

export type LabOffspring = z.infer<typeof LabOffspringSchema>;

export const ConceptEntrySchema = z.object({
  term: z.string(),
  embedding: z.array(z.number()).length(384),
  source: z.enum(['ideas', 'dictionary', 'web']),
});

export type ConceptEntry = z.infer<typeof ConceptEntrySchema>;
