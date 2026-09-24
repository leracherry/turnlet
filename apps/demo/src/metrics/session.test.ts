import { afterEach, expect, it, vi } from 'vitest';

vi.mock('web-vitals/attribution', () => ({ onINP: vi.fn() }));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
  vi.clearAllMocks();
});

it('registers once with change reporting and a bounded event threshold', async () => {
  class EventTiming {
    interactionId = 1;
  }
  Object.defineProperty(EventTiming.prototype, 'interactionId', { value: 0 });
  vi.stubGlobal('PerformanceEventTiming', EventTiming);
  vi.stubGlobal('PerformanceObserver', { supportedEntryTypes: ['event'] });
  const { onINP } = await import('web-vitals/attribution');
  const { observeSessionINP } = await import('./session.js');
  const report = vi.fn();
  observeSessionINP(report);
  observeSessionINP(report);
  expect(onINP).toHaveBeenCalledExactlyOnceWith(report, {
    reportAllChanges: true,
    durationThreshold: 16,
  });
});

it('does not register when event timing is unavailable', async () => {
  vi.stubGlobal('PerformanceEventTiming', undefined);
  const { onINP } = await import('web-vitals/attribution');
  const { observeSessionINP, supportsINP } = await import('./session.js');
  expect(supportsINP()).toBe(false);
  observeSessionINP(vi.fn());
  expect(onINP).not.toHaveBeenCalled();
});
