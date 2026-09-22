export const DEFAULT_BUDGET_MS = 5;
export const MAX_BUDGET_MS = 50;

export interface ChunkOptions {
  budgetMs?: number;
  signal?: AbortSignal;
}

export interface NormalizedChunkOptions {
  budgetMs: number;
  signal: AbortSignal | undefined;
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

  const signal = options?.signal;

  if (
    signal !== undefined &&
    (typeof signal !== 'object' ||
      typeof signal.aborted !== 'boolean' ||
      typeof signal.addEventListener !== 'function' ||
      typeof signal.removeEventListener !== 'function')
  ) {
    throw new TypeError('signal must be an AbortSignal.');
  }

  return { budgetMs, signal };
}
