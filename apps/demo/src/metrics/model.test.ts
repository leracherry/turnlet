import { describe, expect, it, vi } from 'vitest';
import type { INPMetricWithAttribution } from 'web-vitals/attribution';
import { createMetricsModel, type MetricsState } from './model.js';

function metric(value: number): INPMetricWithAttribution {
  return {
    id: 'candidate',
    value,
    entries: [{}],
    attribution: {
      inputDelay: value / 4,
      processingDuration: value / 2,
      presentationDelay: value / 4,
      interactionTarget: '#query',
      interactionType: 'keyboard',
    },
  } as INPMetricWithAttribution;
}

describe('metric ownership', () => {
  it('starts waiting or unavailable without inventing samples', () => {
    const render = vi.fn();
    createMetricsModel(false, render, () => {});
    expect(render).toHaveBeenLastCalledWith({
      inp: { status: 'unavailable' },
      completion: { status: 'waiting' },
    });
    createMetricsModel(true, render, () => {});
    expect(render).toHaveBeenLastCalledWith({
      inp: { status: 'waiting' },
      completion: { status: 'waiting' },
    });
  });
  it('copies a complete candidate and batches updates without retaining a mutable metric', () => {
    const queued: (() => void)[] = [];
    const render = vi.fn();
    const model = createMetricsModel(true, render, (callback) => {
      queued.push(callback);
    });
    const report = metric(80);
    model.reportINP(report);
    report.value = 900;
    report.attribution.inputDelay = 700;
    model.completion({ status: 'measured', duration: 12 });
    expect(queued).toHaveLength(1);
    queued[0]!();
    const state = render.mock.lastCall![0] as MetricsState;
    expect(state.inp).toMatchObject({
      status: 'measured',
      candidate: {
        value: 80,
        inputDelay: 20,
        processingDuration: 40,
        presentationDelay: 20,
      },
    });
    expect(state.completion).toEqual({ status: 'measured', duration: 12 });
  });
  it('does not replace session INP when a later search completes faster', () => {
    const render = vi.fn();
    const model = createMetricsModel(true, render, (callback) => callback());
    model.reportINP(metric(120));
    model.completion({ status: 'measured', duration: 60 });
    model.completion({ status: 'measured', duration: 2 });
    expect(render.mock.lastCall![0].inp.candidate.value).toBe(120);
    model.reportINP(metric(96));
    expect(render.mock.lastCall![0].inp.candidate).toMatchObject({
      value: 96,
      inputDelay: 24,
      processingDuration: 48,
      presentationDelay: 24,
    });
  });
  it('waits for attribution instead of displaying a zero placeholder', () => {
    const render = vi.fn();
    const model = createMetricsModel(true, render, (callback) => callback());
    model.reportINP({ ...metric(0), entries: [] });
    expect(render).toHaveBeenCalledOnce();
  });
});
