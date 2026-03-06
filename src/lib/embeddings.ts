/**
 * Embedding generation wrapper.
 * Uses @huggingface/transformers when available, falls back to deterministic fake embeddings.
 */

let pipeline: any = null;
let loadingPromise: Promise<any> | null = null;

/**
 * Lazy-load the transformers.js pipeline.
 */
async function getEmbeddingPipeline() {
  if (pipeline) return pipeline;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    try {
      const { pipeline: createPipeline } = await import(
        // @ts-ignore - dynamic import for browser
        'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.0.0'
      );
      pipeline = await createPipeline(
        'feature-extraction',
        'Xenova/all-MiniLM-L6-v2',
      );
      return pipeline;
    } catch (e) {
      console.warn('Transformers.js not available, using fallback embeddings');
      return null;
    }
  })();

  return loadingPromise;
}

/**
 * Generate a deterministic fake embedding from text.
 * Uses a simple hash-based approach to produce consistent 384-dim vectors.
 */
export function fakeDeterministicEmbedding(text: string): number[] {
  const embedding = new Array(384);
  let hash = 0;

  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) & 0x7fffffff;
  }

  for (let i = 0; i < 384; i++) {
    hash = (hash * 1103515245 + 12345) & 0x7fffffff;
    embedding[i] = ((hash / 0x7fffffff) * 2 - 1) * 0.5;
  }

  // Normalize to unit vector
  const norm = Math.sqrt(embedding.reduce((sum: number, v: number) => sum + v * v, 0));
  if (norm > 0) {
    for (let i = 0; i < 384; i++) {
      embedding[i] = parseFloat((embedding[i] / norm).toFixed(6));
    }
  }

  return embedding;
}

/**
 * Generate embedding for text. Tries real model first, falls back to deterministic fake.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const pipe = await getEmbeddingPipeline();
    if (pipe) {
      const output = await pipe(text, {
        pooling: 'mean',
        normalize: true,
      });
      return Array.from(output.data);
    }
  } catch (e) {
    console.warn('Embedding generation failed, using fallback:', e);
  }

  return fakeDeterministicEmbedding(text);
}
