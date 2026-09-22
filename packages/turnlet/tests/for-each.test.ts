import { describe, expect, it, vi } from 'vitest';

import { forEachInChunksWithScheduler } from '../src/for-each.js';
import { type ChunkScheduler } from '../src/scheduler.js';

function createTestScheduler(times: number[] = [0]): ChunkScheduler {
  let lastTime = times.at(-1) ?? 0;

  return {
    now: vi.fn(() => {
      lastTime = times.shift() ?? lastTime;
      return lastTime;
    }),
    yield: vi.fn(async () => {}),
  };
}

describe('forEachInChunks', () => {
  it('yields initially, then visits every item once in order with its index', async () => {
    const events: string[] = [];
    const scheduler: ChunkScheduler = {
      now: () => 0,
      yield: vi.fn(async () => {
        events.push('yield');
      }),
    };
    const input = Object.freeze(['a', 'b', 'c']);

    await forEachInChunksWithScheduler(
      input,
      (item, index) => {
        events.push(`${index}:${item}`);
      },
      undefined,
      scheduler,
    );

    expect(events).toEqual(['yield', '0:a', '1:b', '2:c']);
    expect(input).toEqual(['a', 'b', 'c']);
  });

  it('resolves empty input without scheduling', async () => {
    const scheduler = createTestScheduler();
    const callback = vi.fn();

    await forEachInChunksWithScheduler([], callback, undefined, scheduler);

    expect(callback).not.toHaveBeenCalled();
    expect(scheduler.yield).not.toHaveBeenCalled();
    expect(scheduler.now).not.toHaveBeenCalled();
  });

  it.each([0, -1, 50.1, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects invalid budget %s before scheduling',
    async (budgetMs) => {
      const scheduler = createTestScheduler();

      await expect(
        forEachInChunksWithScheduler([], () => {}, { budgetMs }, scheduler),
      ).rejects.toBeInstanceOf(RangeError);
      expect(scheduler.yield).not.toHaveBeenCalled();
    },
  );

  it('accepts both budget boundaries', async () => {
    await expect(
      forEachInChunksWithScheduler(
        [],
        () => {},
        { budgetMs: 0.001 },
        createTestScheduler(),
      ),
    ).resolves.toBeUndefined();
    await expect(
      forEachInChunksWithScheduler(
        [],
        () => {},
        { budgetMs: 50 },
        createTestScheduler(),
      ),
    ).resolves.toBeUndefined();
  });

  it('yields at the budget boundary and avoids a final yield', async () => {
    const scheduler = createTestScheduler([0, 5, 5, 9]);
    const callback = vi.fn();

    await forEachInChunksWithScheduler(
      [1, 2, 3],
      callback,
      { budgetMs: 5 },
      scheduler,
    );

    expect(callback).toHaveBeenCalledTimes(3);
    expect(scheduler.yield).toHaveBeenCalledTimes(2);
    expect(scheduler.now).toHaveBeenCalledTimes(4);
  });

  it('rejects a sparse array when the missing position is reached', async () => {
    const input = [1, 2, 3];
    delete input[1];
    const callback = vi.fn();

    await expect(
      forEachInChunksWithScheduler(
        input,
        callback,
        undefined,
        createTestScheduler(),
      ),
    ).rejects.toThrow('missing index 1');
    expect(callback).toHaveBeenCalledOnce();
    expect(callback).toHaveBeenCalledWith(1, 0);
  });

  it('propagates callback errors unchanged and stops processing', async () => {
    const failure = new Error('invalid item');
    const callback = vi.fn((item: number) => {
      if (item === 2) throw failure;
    });

    await expect(
      forEachInChunksWithScheduler(
        [1, 2, 3],
        callback,
        undefined,
        createTestScheduler(),
      ),
    ).rejects.toBe(failure);
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('rejects async callbacks without leaking their rejection', async () => {
    const callback = vi.fn(async () => {
      throw new Error('async failure');
    });

    await expect(
      forEachInChunksWithScheduler(
        [1, 2],
        callback,
        undefined,
        createTestScheduler(),
      ),
    ).rejects.toThrow(
      'callbacks must be synchronous and must not return a promise or thenable',
    );
    expect(callback).toHaveBeenCalledOnce();
  });

  it('validates the signal before scheduling', async () => {
    const options = { signal: {} as AbortSignal };
    const scheduler = createTestScheduler();

    await expect(
      forEachInChunksWithScheduler([], () => {}, options, scheduler),
    ).rejects.toThrow('signal must be an AbortSignal');
    expect(scheduler.yield).not.toHaveBeenCalled();
  });
});
