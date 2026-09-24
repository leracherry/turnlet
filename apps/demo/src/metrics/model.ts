import type { INPMetricWithAttribution } from 'web-vitals/attribution';

export interface INPCandidate {
  id: string;
  value: number;
  inputDelay: number;
  processingDuration: number;
  presentationDelay: number;
  target: string;
  interactionType: string;
}
export type INPState =
  | { status: 'waiting' | 'unavailable' }
  | { status: 'measured'; candidate: INPCandidate };
export type CompletionState =
  | { status: 'waiting' | 'pending' | 'error' }
  | { status: 'measured'; duration: number };
export interface MetricsState {
  inp: INPState;
  completion: CompletionState;
}

// Copy the scalar data: web-vitals reuses and mutates its metric objects.
export function snapshotINP(
  metric: INPMetricWithAttribution,
): INPCandidate | undefined {
  const attribution = metric.attribution;
  if (
    metric.entries.length === 0 ||
    !Number.isFinite(metric.value) ||
    metric.value < 0
  )
    return;
  return {
    id: metric.id,
    value: metric.value,
    inputDelay: attribution.inputDelay,
    processingDuration: attribution.processingDuration,
    presentationDelay: attribution.presentationDelay,
    target: attribution.interactionTarget || 'Unknown target',
    interactionType: attribution.interactionType || 'Interaction',
  };
}

export function createMetricsModel(
  supported: boolean,
  render: (state: MetricsState) => void,
  schedule: (callback: () => void) => void = requestAnimationFrame,
) {
  let state: MetricsState = {
    inp: { status: supported ? 'waiting' : 'unavailable' },
    completion: { status: 'waiting' },
  };
  let scheduled = false;
  function publish(): void {
    if (scheduled) return;
    scheduled = true;
    schedule(() => {
      scheduled = false;
      render(state);
    });
  }
  render(state);
  return {
    reportINP(metric: INPMetricWithAttribution): void {
      const candidate = snapshotINP(metric);
      if (!candidate || !supported) return;
      state = { ...state, inp: { status: 'measured', candidate } };
      publish();
    },
    completion(completion: CompletionState): void {
      state = { ...state, completion };
      publish();
    },
  };
}
