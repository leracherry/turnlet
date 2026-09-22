import { throwIfAborted, waitForContinuation } from './abort.js';

type NativeYield = () => PromiseLike<unknown>;
type TaskHandle = unknown;
type ScheduleTask = (continuation: () => void) => TaskHandle;

export interface SchedulerDependencies {
  clearTask: (handle: TaskHandle) => void;
  getNativeYield: () => NativeYield | undefined;
  now: () => number;
  scheduleTask: ScheduleTask;
}

export interface ChunkScheduler {
  now: () => number;
  yield: (signal?: AbortSignal) => Promise<void>;
}

function getNativeYield(): NativeYield | undefined {
  const scheduler = (
    globalThis as typeof globalThis & {
      scheduler?: { yield?: NativeYield };
    }
  ).scheduler;

  if (typeof scheduler?.yield !== 'function') {
    return undefined;
  }

  return scheduler.yield.bind(scheduler);
}

const defaultDependencies: SchedulerDependencies = {
  clearTask: (handle) => {
    globalThis.clearTimeout(handle as ReturnType<typeof globalThis.setTimeout>);
  },
  getNativeYield,
  now: () => globalThis.performance.now(),
  scheduleTask: (continuation) => globalThis.setTimeout(continuation, 0),
};

export function createScheduler(
  overrides: Partial<SchedulerDependencies> = {},
): ChunkScheduler {
  const dependencies = { ...defaultDependencies, ...overrides };

  return {
    now: dependencies.now,
    async yield(signal?: AbortSignal): Promise<void> {
      throwIfAborted(signal);
      const nativeYield = dependencies.getNativeYield();

      if (nativeYield !== undefined) {
        await waitForContinuation(nativeYield(), signal);
        return;
      }

      let handle: TaskHandle;
      const continuation = new Promise<void>((resolve) => {
        handle = dependencies.scheduleTask(resolve);
      });
      await waitForContinuation(continuation, signal, () => {
        dependencies.clearTask(handle);
      });
    },
  };
}
