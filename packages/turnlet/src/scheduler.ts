type NativeYield = () => PromiseLike<unknown>;
type ScheduleTask = (continuation: () => void) => void;

export interface SchedulerDependencies {
  getNativeYield: () => NativeYield | undefined;
  now: () => number;
  scheduleTask: ScheduleTask;
}

export interface ChunkScheduler {
  now: () => number;
  yield: () => Promise<void>;
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
  getNativeYield,
  now: () => globalThis.performance.now(),
  scheduleTask: (continuation) => {
    globalThis.setTimeout(continuation, 0);
  },
};

export function createScheduler(
  overrides: Partial<SchedulerDependencies> = {},
): ChunkScheduler {
  const dependencies = { ...defaultDependencies, ...overrides };

  return {
    now: dependencies.now,
    async yield(): Promise<void> {
      const nativeYield = dependencies.getNativeYield();

      if (nativeYield !== undefined) {
        await nativeYield();
        return;
      }

      await new Promise<void>((resolve) => {
        dependencies.scheduleTask(resolve);
      });
    },
  };
}
