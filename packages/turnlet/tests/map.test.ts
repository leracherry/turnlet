import { describe, expect, expectTypeOf, it, vi } from 'vitest';

import { mapInChunks } from '../src/index.js';
import { mapInChunksWithScheduler } from '../src/map.js';
import { type ChunkScheduler } from '../src/scheduler.js';

function createImmediateScheduler(): ChunkScheduler {
  return {
    now: () => 0,
    yield: vi.fn(async (signal?: AbortSignal) => {
      if (signal?.aborted === true) throw signal.reason;
    }),
  };
}

describe('mapInChunks', () => {
  it('preserves input order and passes each index', async () => {
    const input = Object.freeze([3, 1, 2] as const);
    const callback = vi.fn((item: number, index: number) => `${index}:${item}`);

    const result = await mapInChunksWithScheduler(
      input,
      callback,
      undefined,
      createImmediateScheduler(),
    );

    expect(result).toEqual(['0:3', '1:1', '2:2']);
    expect(callback).toHaveBeenCalledTimes(3);
    expect(input).toEqual([3, 1, 2]);
  });

  it('infers object result types from readonly input', () => {
    const input: readonly number[] = [1, 2];
    const result = mapInChunks(input, (value) => ({ value: String(value) }));

    expectTypeOf(result).toEqualTypeOf<Promise<Array<{ value: string }>>>();
  });

  it('preserves falsy and undefined results', async () => {
    const result = await mapInChunksWithScheduler(
      [0, 1, 2, 3],
      (value) => [false, 0, '', undefined][value],
      undefined,
      createImmediateScheduler(),
    );

    expect(result).toEqual([false, 0, '', undefined]);
  });

  it('returns an empty result without scheduling', async () => {
    const scheduler = createImmediateScheduler();

    await expect(
      mapInChunksWithScheduler([], (value) => value, undefined, scheduler),
    ).resolves.toEqual([]);
    expect(scheduler.yield).not.toHaveBeenCalled();
  });

  it('rejects with the original callback error and exposes no partial result', async () => {
    const failure = new Error('mapping failed');
    const callback = vi.fn((value: number) => {
      if (value === 2) throw failure;
      return value * 2;
    });

    await expect(
      mapInChunksWithScheduler(
        [1, 2, 3],
        callback,
        undefined,
        createImmediateScheduler(),
      ),
    ).rejects.toBe(failure);
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('rejects async mapping callbacks at runtime', async () => {
    const callback = vi.fn(async (value: number) => value * 2);

    await expect(
      mapInChunksWithScheduler(
        [1, 2],
        callback,
        undefined,
        createImmediateScheduler(),
      ),
    ).rejects.toThrow('callbacks must be synchronous');
    expect(callback).toHaveBeenCalledOnce();
  });

  it('rejects cancellation with the original reason and no partial success', async () => {
    const reason = new Error('stop mapping');
    const controller = new AbortController();
    const callback = vi.fn((value: number) => {
      if (value === 2) controller.abort(reason);
      return value * 2;
    });

    await expect(
      mapInChunksWithScheduler(
        [1, 2, 3],
        callback,
        { signal: controller.signal },
        createImmediateScheduler(),
      ),
    ).rejects.toBe(reason);
    expect(callback).toHaveBeenCalledTimes(2);
  });
});
