import { describe, expect, it, vi } from 'vitest';
import { createSearchController } from './controller.js';
import { TopResults, blockingSearch } from './search.js';
import { turnletSearch } from './strategies.js';
import { createCatalogue } from '../data/catalogue.js';
import { configUrl, readConfig } from '../config.js';

function deferred() {
  let resolve!: (value: TopResults) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<TopResults>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
function view() {
  return {
    pending: vi.fn(),
    commit: vi.fn(),
    clear: vi.fn(),
    error: vi.fn(),
    completed: vi.fn(),
  };
}

describe('search ownership', () => {
  it('measures through the accepted DOM commit', async () => {
    let time = 100;
    const ui = view();
    ui.commit.mockImplementation(() => {
      time += 7;
    });
    const controller = createSearchController(
      () => {
        time += 13;
        return new TopResults();
      },
      ui,
      () => time,
    );
    await controller.update('lamp', 98);
    expect(ui.completed).toHaveBeenCalledExactlyOnceWith(22);
  });
  it.each(['success', 'error'])(
    'ignores a stale %s after newer results',
    async (outcome) => {
      const old = deferred();
      const next = deferred();
      const ui = view();
      const signals: AbortSignal[] = [];
      const controller = createSearchController((query, signal) => {
        signals.push(signal);
        return query === 'old' ? old.promise : next.promise;
      }, ui);
      const first = controller.update('old');
      const second = controller.update('next');
      const result = new TopResults();
      next.resolve(result);
      await second;
      if (outcome === 'success') old.resolve(new TopResults());
      else old.reject(new Error('stale'));
      await first;
      expect(signals[0]!.aborted).toBe(true);
      expect(ui.commit).toHaveBeenCalledExactlyOnceWith(result);
      expect(ui.completed).toHaveBeenCalledOnce();
      expect(ui.error).not.toHaveBeenCalled();
    },
  );
  it('clearing invalidates pending work and preserves real errors', async () => {
    const pending = deferred();
    const ui = view();
    const controller = createSearchController(() => pending.promise, ui);
    const first = controller.update('lamp');
    await controller.update(' ');
    pending.resolve(new TopResults());
    await first;
    expect(ui.clear).toHaveBeenCalledOnce();
    expect(ui.commit).not.toHaveBeenCalled();
    expect(ui.completed).not.toHaveBeenCalled();
    const failure = new Error('failure');
    const broken = createSearchController(() => {
      throw failure;
    }, ui);
    await broken.update('lamp');
    expect(ui.error).toHaveBeenCalledWith(failure);
  });
  it('quietly cancels and discards work after disposal', async () => {
    const pending = deferred();
    const ui = view();
    const controller = createSearchController(() => pending.promise, ui);
    const first = controller.update('lamp');
    controller.dispose();
    pending.reject(new DOMException('Cancelled', 'AbortError'));
    await first;
    expect(ui.error).not.toHaveBeenCalled();
    expect(ui.commit).not.toHaveBeenCalled();
  });
  it.each(['lamp', 'ceramix', 'forest mug', 'zzzzz'])(
    'matches the blocking reference for %s',
    async (query) => {
      const products = createCatalogue(500);
      expect(
        await turnletSearch(products, query, new AbortController().signal),
      ).toEqual(blockingSearch(products, query));
    },
  );
  it('validates URL options and round trips accepted settings', () => {
    expect(
      readConfig(new URLSearchParams('mode=x&size=999999&seed=-1')),
    ).toEqual({ mode: 'turnlet', size: 'medium', seed: 42 });
    for (const seed of ['Infinity', '1.5', '4294967296', ''])
      expect(readConfig(new URLSearchParams({ seed })).seed).toBe(42);
    const config = { mode: 'blocking', size: 'large', seed: 0 } as const;
    expect(readConfig(new URLSearchParams(configUrl(config)))).toEqual(config);
  });
});
