import { createMetricsModel, type MetricsState } from './model.js';
import { observeSessionINP, supportsINP } from './session.js';

export function mountMetrics(container: HTMLElement) {
  container.innerHTML = `
    <section class="metrics" aria-labelledby="metrics-title">
      <div class="metrics-heading"><h2 id="metrics-title">Two different clocks</h2><button type="button" id="reset-session">Reset session</button></div>
      <div class="metric-grid">
        <article aria-labelledby="inp-title"><h3 id="inp-title">Session INP candidate</h3>
          <p id="inp-value" class="metric-value" data-state="waiting">Waiting</p>
          <p id="inp-target" class="hint">Interact with the page to measure.</p>
          <dl id="inp-breakdown" hidden>
            <div><dt>Input delay</dt><dd id="input-delay">—</dd></div>
            <div><dt>Processing</dt><dd id="processing-duration">—</dd></div>
            <div><dt>Presentation</dt><dd id="presentation-delay">—</dd></div>
          </dl>
          <p class="hint">This page visit, including controls. May stay unchanged after a faster search.</p>
        </article>
        <article aria-labelledby="completion-title"><h3 id="completion-title">Latest search completion</h3>
          <p id="completion-value" class="metric-value" data-state="waiting">Waiting</p>
          <p class="hint">Input handler start → accepted results updated in the DOM.</p>
          <p class="hint">Excludes input delay and final visible paint. This is not INP.</p>
        </article>
      </div>
      <p class="hint">INP depends on browser support and reportable interactions. Values update after the browser reports them; no sample is shown as zero.</p>
    </section>`;
  const select = (id: string): HTMLElement =>
    container.querySelector<HTMLElement>('#' + id)!;
  const inp = select('inp-value');
  const target = select('inp-target');
  const breakdown = select('inp-breakdown');
  const completion = select('completion-value');
  const ms = (value: number): string => value.toFixed(1) + ' ms';
  const render = (state: MetricsState): void => {
    inp.dataset.state = state.inp.status;
    if (state.inp.status === 'measured') {
      const candidate = state.inp.candidate;
      inp.textContent = ms(candidate.value);
      target.textContent = candidate.interactionType + ' · ' + candidate.target;
      select('input-delay').textContent = ms(candidate.inputDelay);
      select('processing-duration').textContent = ms(
        candidate.processingDuration,
      );
      select('presentation-delay').textContent = ms(
        candidate.presentationDelay,
      );
      breakdown.hidden = false;
    } else {
      inp.textContent =
        state.inp.status === 'unavailable' ? 'Unavailable' : 'Waiting';
      target.textContent =
        state.inp.status === 'unavailable'
          ? 'This browser cannot report INP. Search timing is still available.'
          : 'Waiting for a reportable interaction. Try typing or clicking.';
      breakdown.hidden = true;
    }
    completion.dataset.state = state.completion.status;
    completion.textContent =
      state.completion.status === 'measured'
        ? ms(state.completion.duration)
        : { waiting: 'Waiting', pending: 'Searching…', error: 'Unavailable' }[
            state.completion.status
          ];
  };
  const model = createMetricsModel(supportsINP(), render);
  observeSessionINP(model.reportINP);
  return { ...model, reset: select('reset-session') };
}
