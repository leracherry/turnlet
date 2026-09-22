import { type NormalizedChunkOptions } from './options.js';
import { createScheduler, type ChunkScheduler } from './scheduler.js';

const ASYNC_CALLBACK_ERROR =
  'Turnlet callbacks must be synchronous and must not return a promise or thenable.';

function rejectThenable(result: unknown): void {
  if (
    result === null ||
    (typeof result !== 'object' && typeof result !== 'function')
  ) {
    return;
  }

  const then = (result as { then?: unknown }).then;

  if (typeof then !== 'function') {
    return;
  }

  void Promise.resolve(result).catch(() => {});
  throw new TypeError(ASYNC_CALLBACK_ERROR);
}

export async function runInChunks<T, R>(
  input: readonly T[],
  callback: (item: T, index: number) => R,
  onResult: ((result: R, index: number) => void) | undefined,
  options: NormalizedChunkOptions,
  scheduler: ChunkScheduler = createScheduler(),
): Promise<void> {
  const length = input.length;

  if (length === 0) {
    return;
  }

  await scheduler.yield();
  let chunkStartedAt = scheduler.now();

  for (let index = 0; index < length; index += 1) {
    if (!Object.hasOwn(input, index)) {
      throw new TypeError(
        `Turnlet does not support sparse arrays (missing index ${index}).`,
      );
    }

    const result = callback(input[index] as T, index);
    rejectThenable(result);
    onResult?.(result, index);

    const hasMoreItems = index + 1 < length;
    if (hasMoreItems && scheduler.now() - chunkStartedAt >= options.budgetMs) {
      await scheduler.yield();
      chunkStartedAt = scheduler.now();
    }
  }
}
