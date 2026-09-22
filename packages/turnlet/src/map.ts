import { throwIfAborted } from './abort.js';
import { normalizeChunkOptions, type ChunkOptions } from './options.js';
import { runInChunks } from './runner.js';
import { createScheduler, type ChunkScheduler } from './scheduler.js';

export async function mapInChunksWithScheduler<T, R>(
  input: readonly T[],
  callback: (item: T, index: number) => R,
  options: ChunkOptions | undefined,
  scheduler: ChunkScheduler,
): Promise<R[]> {
  const normalizedOptions = normalizeChunkOptions(options);
  throwIfAborted(normalizedOptions.signal);
  const results = new Array<R>(input.length);

  await runInChunks(
    input,
    callback,
    (result, index) => {
      results[index] = result;
    },
    normalizedOptions,
    scheduler,
  );

  return results;
}

export async function mapInChunks<T, R>(
  input: readonly T[],
  callback: (item: T, index: number) => R,
  options?: ChunkOptions,
): Promise<R[]> {
  return mapInChunksWithScheduler(input, callback, options, createScheduler());
}
