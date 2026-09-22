import { throwIfAborted } from './abort.js';
import { type NormalizedChunkOptions } from './options.js';
import { createScheduler, type ChunkScheduler } from './scheduler.js';

const ASYNC_CALLBACK_ERROR =
  'Turnlet callbacks must be synchronous and must not return a promise or thenable.';

function observeThenable(result: unknown): boolean {
  if (
    result === null ||
    (typeof result !== 'object' && typeof result !== 'function')
  ) {
    return false;
  }

  const then = (result as { then?: unknown }).then;

  if (typeof then !== 'function') {
    return false;
  }

  void Promise.resolve(result).catch(() => {});
  return true;
}

export async function runInChunks<T, R>(
  input: readonly T[],
  callback: (item: T, index: number) => R,
  onResult: ((result: R, index: number) => void) | undefined,
  options: NormalizedChunkOptions,
  scheduler: ChunkScheduler = createScheduler(),
): Promise<void> {
  throwIfAborted(options.signal);
  const length = input.length;

  if (length === 0) {
    return;
  }

  await scheduler.yield(options.signal);
  throwIfAborted(options.signal);
  let chunkStartedAt = scheduler.now();

  for (let index = 0; index < length; index += 1) {
    throwIfAborted(options.signal);

    if (!Object.hasOwn(input, index)) {
      throw new TypeError(
        `Turnlet does not support sparse arrays (missing index ${index}).`,
      );
    }

    const result = callback(input[index] as T, index);
    const returnedThenable = observeThenable(result);
    throwIfAborted(options.signal);

    if (returnedThenable) {
      throw new TypeError(ASYNC_CALLBACK_ERROR);
    }

    onResult?.(result, index);

    const hasMoreItems = index + 1 < length;
    if (hasMoreItems && scheduler.now() - chunkStartedAt >= options.budgetMs) {
      await scheduler.yield(options.signal);
      throwIfAborted(options.signal);
      chunkStartedAt = scheduler.now();
    }
  }

  throwIfAborted(options.signal);
}
