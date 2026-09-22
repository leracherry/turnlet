import { describe, expect, it, vi } from 'vitest';

import { createScheduler } from '../src/scheduler.js';

describe('private scheduler adapter', () => {
  it('detects native yielding when each continuation is requested', async () => {
    const nativeYield = vi.fn(async () => {});
    let useNativeYield = false;
    const scheduleTask = vi.fn((continuation: () => void) => continuation());
    const scheduler = createScheduler({
      getNativeYield: () => (useNativeYield ? nativeYield : undefined),
      scheduleTask,
    });

    await scheduler.yield();
    useNativeYield = true;
    await scheduler.yield();

    expect(scheduleTask).toHaveBeenCalledOnce();
    expect(nativeYield).toHaveBeenCalledOnce();
  });

  it('uses a task rather than a microtask for the fallback', async () => {
    const turns = ['synchronous'];
    const scheduler = createScheduler({
      getNativeYield: () => undefined,
    });

    const continuation = scheduler.yield().then(() => {
      turns.push('task');
    });
    queueMicrotask(() => {
      turns.push('microtask');
    });

    await Promise.resolve();
    expect(turns).toEqual(['synchronous', 'microtask']);

    await continuation;
    expect(turns).toEqual(['synchronous', 'microtask', 'task']);
  });

  it('propagates a native scheduling rejection unchanged', async () => {
    const failure = new Error('scheduler unavailable');
    const scheduler = createScheduler({
      getNativeYield: () => () => Promise.reject(failure),
    });

    await expect(scheduler.yield()).rejects.toBe(failure);
  });

  it('provides an injectable monotonic clock without DOM access', () => {
    const now = vi.fn(() => 12.5);
    const scheduler = createScheduler({ now });

    expect('window' in globalThis).toBe(false);
    expect(scheduler.now()).toBe(12.5);
    expect(now).toHaveBeenCalledOnce();
  });
});
