export const DEFAULT_BUDGET_MS = 5;
export const MAX_BUDGET_MS = 50;

export interface ChunkOptions {
  budgetMs?: number;
}

export interface NormalizedChunkOptions {
  budgetMs: number;
}

export function normalizeChunkOptions(
  options: ChunkOptions | undefined,
): NormalizedChunkOptions {
  if (
    options !== undefined &&
    (options === null || typeof options !== 'object')
  ) {
    throw new TypeError('Turnlet options must be an object.');
  }

  if (options !== undefined && 'signal' in options) {
    throw new TypeError('AbortSignal support is not implemented yet.');
  }

  const budgetMs = options?.budgetMs ?? DEFAULT_BUDGET_MS;

  if (
    typeof budgetMs !== 'number' ||
    !Number.isFinite(budgetMs) ||
    budgetMs <= 0 ||
    budgetMs > MAX_BUDGET_MS
  ) {
    throw new RangeError(
      `budgetMs must be a finite number greater than 0 and no greater than ${MAX_BUDGET_MS}.`,
    );
  }

  return { budgetMs };
}
