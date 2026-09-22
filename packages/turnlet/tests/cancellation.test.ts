import { describe, expect, it, vi } from 'vitest';

import { forEachInChunksWithScheduler } from '../src/for-each.js';
import { createScheduler, type ChunkScheduler } from '../src/scheduler.js';

function createImmediateScheduler(): ChunkScheduler {
  return {
    now: () => 0,
    yield: vi.fn(async (signal?: AbortSignal) => {
      if (signal?.aborted === true) throw signal.reason;
    }),
  };
}

describe('cancellation', () => {
  it('preserves a pre-aborted signal reason, even for empty input', async () => {
    const reason = new Error('cancelled before start');
    const controller = new AbortController();
    controller.abort(reason);
    const scheduler = createImmediateScheduler();
    const callback = vi.fn();

    await expect(
      forEachInChunksWithScheduler(
        [],
        callback,
        { signal: controller.signal },
        scheduler,
      ),
    ).rejects.toBe(reason);
    expect(callback).not.toHaveBeenCalled();
    expect(scheduler.yield).not.toHaveBeenCalled();
  });

  it('uses the platform AbortError when no custom reason is supplied', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      forEachInChunksWithScheduler(
        [1],
        () => {},
        { signal: controller.signal },
        createImmediateScheduler(),
      ),
    ).rejects.toBe(controller.signal.reason);
    expect(controller.signal.reason).toMatchObject({ name: 'AbortError' });
  });

  it('stops between callbacks without rolling back prior side effects', async () => {
    const reason = new Error('cancel from callback');
    const controller = new AbortController();
    const visited: number[] = [];

    await expect(
      forEachInChunksWithScheduler(
        [1, 2, 3],
        (item) => {
          visited.push(item);
          if (item === 2) controller.abort(reason);
        },
        { signal: controller.signal },
        createImmediateScheduler(),
      ),
    ).rejects.toBe(reason);
    expect(visited).toEqual([1, 2]);
  });

  it('checks cancellation inside the final callback before resolving', async () => {
    const reason = new Error('cancel final callback');
    const controller = new AbortController();

    await expect(
      forEachInChunksWithScheduler(
        [1],
        () => controller.abort(reason),
        { signal: controller.signal },
        createImmediateScheduler(),
      ),
    ).rejects.toBe(reason);
  });

  it('does not resume callbacks when a native continuation arrives late', async () => {
    const reason = new Error('cancel initial yield');
    const controller = new AbortController();
    let continueNative: (() => void) | undefined;
    const nativeContinuation = new Promise<void>((resolve) => {
      continueNative = resolve;
    });
    const scheduler = createScheduler({
      getNativeYield: () => () => nativeContinuation,
    });
    const callback = vi.fn();

    const operation = forEachInChunksWithScheduler(
      [1, 2],
      callback,
      { signal: controller.signal },
      scheduler,
    );
    controller.abort(reason);

    await expect(operation).rejects.toBe(reason);
    continueNative?.();
    await Promise.resolve();
    expect(callback).not.toHaveBeenCalled();
  });

  it('keeps simultaneous operations independent', async () => {
    const firstController = new AbortController();
    const firstReason = new Error('cancel only first');
    const firstVisited: number[] = [];
    const secondVisited: number[] = [];

    const first = forEachInChunksWithScheduler(
      [1, 2],
      (item) => {
        firstVisited.push(item);
        firstController.abort(firstReason);
      },
      { signal: firstController.signal },
      createImmediateScheduler(),
    );
    const second = forEachInChunksWithScheduler(
      [3, 4],
      (item) => secondVisited.push(item),
      undefined,
      createImmediateScheduler(),
    );

    await expect(first).rejects.toBe(firstReason);
    await expect(second).resolves.toBeUndefined();
    expect(firstVisited).toEqual([1]);
    expect(secondVisited).toEqual([3, 4]);
  });
});
