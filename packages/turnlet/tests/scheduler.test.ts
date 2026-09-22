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

  it('rejects pre-aborted waits without scheduling', async () => {
    const reason = new Error('already cancelled');
    const controller = new AbortController();
    controller.abort(reason);
    const nativeYield = vi.fn(async () => {});
    const scheduleTask = vi.fn();
    const scheduler = createScheduler({
      getNativeYield: () => nativeYield,
      scheduleTask,
    });

    await expect(scheduler.yield(controller.signal)).rejects.toBe(reason);
    expect(nativeYield).not.toHaveBeenCalled();
    expect(scheduleTask).not.toHaveBeenCalled();
  });

  it('clears a fallback timer and listener when aborted while waiting', async () => {
    const reason = new Error('cancel pending timer');
    const controller = new AbortController();
    const addListener = vi.spyOn(controller.signal, 'addEventListener');
    const removeListener = vi.spyOn(controller.signal, 'removeEventListener');
    const handle = { type: 'timer' };
    const clearTask = vi.fn();
    let continueTask: (() => void) | undefined;
    const scheduler = createScheduler({
      clearTask,
      getNativeYield: () => undefined,
      scheduleTask: (continuation) => {
        continueTask = continuation;
        return handle;
      },
    });

    const waiting = scheduler.yield(controller.signal);
    controller.abort(reason);

    await expect(waiting).rejects.toBe(reason);
    expect(clearTask).toHaveBeenCalledWith(handle);
    expect(addListener).toHaveBeenCalledOnce();
    expect(removeListener).toHaveBeenCalledOnce();

    continueTask?.();
    await Promise.resolve();
  });

  it('handles a late native rejection after cancellation', async () => {
    const reason = new Error('cancel native wait');
    const lateFailure = new Error('late native failure');
    const controller = new AbortController();
    const removeListener = vi.spyOn(controller.signal, 'removeEventListener');
    let rejectNative: ((error: unknown) => void) | undefined;
    const nativeContinuation = new Promise<void>((_resolve, reject) => {
      rejectNative = reject;
    });
    const scheduler = createScheduler({
      getNativeYield: () => () => nativeContinuation,
    });

    const waiting = scheduler.yield(controller.signal);
    controller.abort(reason);
    await expect(waiting).rejects.toBe(reason);

    rejectNative?.(lateFailure);
    await Promise.resolve();
    expect(removeListener).toHaveBeenCalledOnce();
  });

  it('removes the temporary abort listener after a successful wait', async () => {
    const controller = new AbortController();
    const removeListener = vi.spyOn(controller.signal, 'removeEventListener');
    const scheduler = createScheduler({
      getNativeYield: () => () => Promise.resolve(),
    });

    await scheduler.yield(controller.signal);

    expect(removeListener).toHaveBeenCalledOnce();
  });

  it('provides an injectable monotonic clock without DOM access', () => {
    const now = vi.fn(() => 12.5);
    const scheduler = createScheduler({ now });

    expect('window' in globalThis).toBe(false);
    expect(scheduler.now()).toBe(12.5);
    expect(now).toHaveBeenCalledOnce();
  });
});
