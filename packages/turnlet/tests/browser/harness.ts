import { forEachInChunksWithScheduler } from '../../src/for-each.js';
import { forEachInChunks, mapInChunks } from '../../src/index.js';
import { createScheduler } from '../../src/scheduler.js';

export interface BrowserHarness {
  cancellation: () => Promise<{ reasonPreserved: boolean; visited: number[] }>;
  concurrentOperations: () => Promise<{ first: number[]; second: number[] }>;
  forcedFallback: () => Promise<{ fallbackCalls: number; visited: number[] }>;
  orderedMapping: () => Promise<string[]>;
  unrelatedTask: () => Promise<string[]>;
}

function burnCpu(milliseconds: number): void {
  const start = performance.now();

  while (performance.now() - start < milliseconds) {
    // The bounded work is intentional: browser tests need multiple chunks.
  }
}

const harness: BrowserHarness = {
  async unrelatedTask() {
    const events: string[] = [];
    const items = Array.from({ length: 80 }, (_, index) => index);
    const nativeScheduler = (
      globalThis as typeof globalThis & {
        scheduler?: {
          postTask?: (
            callback: () => void,
            options: { priority: 'user-blocking' },
          ) => Promise<void>;
        };
      }
    ).scheduler;
    const unrelatedTask =
      nativeScheduler?.postTask !== undefined
        ? nativeScheduler.postTask(
            () => {
              events.push('unrelated-task');
            },
            { priority: 'user-blocking' },
          )
        : new Promise<void>((resolve) => {
            setTimeout(() => {
              events.push('unrelated-task');
              resolve();
            }, 0);
          });

    await forEachInChunks(
      items,
      (item) => {
        burnCpu(0.4);
        if (item === items.at(-1)) events.push('final-callback');
      },
      { budgetMs: 2 },
    );
    events.push('complete');
    await unrelatedTask;

    return events;
  },

  async cancellation() {
    const reason = new Error('browser cancellation');
    const controller = new AbortController();
    const visited: number[] = [];
    let reasonPreserved = false;

    try {
      await forEachInChunks(
        [0, 1, 2, 3, 4, 5],
        (item) => {
          visited.push(item);
          if (item === 2) controller.abort(reason);
        },
        { signal: controller.signal },
      );
    } catch (error) {
      reasonPreserved = error === reason;
    }

    return { reasonPreserved, visited };
  },

  async orderedMapping() {
    return mapInChunks([3, 1, 2], (item, index) => `${index}:${item * 2}`);
  },

  async forcedFallback() {
    let fallbackCalls = 0;
    const visited: number[] = [];
    const scheduler = createScheduler({
      clearTask: (handle) => clearTimeout(handle as number),
      getNativeYield: () => undefined,
      scheduleTask: (continuation) => {
        fallbackCalls += 1;
        return setTimeout(continuation, 0);
      },
    });

    await forEachInChunksWithScheduler(
      [0, 1, 2],
      (item) => visited.push(item),
      { budgetMs: 1 },
      scheduler,
    );

    return { fallbackCalls, visited };
  },

  async concurrentOperations() {
    const first: number[] = [];
    const second: number[] = [];

    await Promise.all([
      forEachInChunks([1, 2, 3], (item) => first.push(item), { budgetMs: 1 }),
      forEachInChunks([4, 5, 6], (item) => second.push(item), { budgetMs: 1 }),
    ]);

    return { first, second };
  },
};

declare global {
  interface Window {
    turnletHarness: BrowserHarness;
  }
}

window.turnletHarness = harness;
