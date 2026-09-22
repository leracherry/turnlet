import { normalizeChunkOptions, type ChunkOptions } from './options.js';
import { runInChunks } from './runner.js';
import { createScheduler, type ChunkScheduler } from './scheduler.js';

export async function forEachInChunksWithScheduler<T>(
  input: readonly T[],
  callback: (item: T, index: number) => void,
  options: ChunkOptions | undefined,
  scheduler: ChunkScheduler,
): Promise<void> {
  const normalizedOptions = normalizeChunkOptions(options);

  await runInChunks(input, callback, undefined, normalizedOptions, scheduler);
}

export async function forEachInChunks<T>(
  input: readonly T[],
  callback: (item: T, index: number) => void,
  options?: ChunkOptions,
): Promise<void> {
  await forEachInChunksWithScheduler(
    input,
    callback,
    options,
    createScheduler(),
  );
}
