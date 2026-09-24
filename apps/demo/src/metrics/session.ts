import { onINP, type INPMetricWithAttribution } from 'web-vitals/attribution';

let registered = false;

export function supportsINP(): boolean {
  return (
    typeof PerformanceObserver !== 'undefined' &&
    PerformanceObserver.supportedEntryTypes.includes('event') &&
    typeof PerformanceEventTiming !== 'undefined' &&
    'interactionId' in PerformanceEventTiming.prototype
  );
}

export function observeSessionINP(
  report: (metric: INPMetricWithAttribution) => void,
): void {
  if (registered || !supportsINP()) return;
  registered = true;
  onINP(report, { reportAllChanges: true, durationThreshold: 16 });
}
