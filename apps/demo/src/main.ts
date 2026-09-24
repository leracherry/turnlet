import './styles.css';
import { createCatalogue, PRESETS } from './data/catalogue.js';
import { configUrl, readConfig } from './config.js';
import { blockingSearch, type TopResults } from './search/search.js';
import { turnletSearch } from './search/strategies.js';
import { createSearchController } from './search/controller.js';
import { mountCatalogue, renderResults } from './ui/catalogue.js';
import { mountMetrics } from './metrics/panel.js';

const app = document.querySelector<HTMLElement>('#app');
if (!app) throw new Error('Turnlet demo root was not found.');
const config = readConfig(new URLSearchParams(location.search));
const ui = mountCatalogue(app);
const metrics = mountMetrics(ui.metrics);
metrics.reset.addEventListener('click', () =>
  location.assign(configUrl(config)),
);
window.addEventListener('pageshow', (event) => {
  if (event.persisted) location.reload();
});
ui.controls.innerHTML = `
  <form id="settings" class="settings">
    <div><label for="mode">Search mode</label><select id="mode" name="mode"><option value="turnlet">Turnlet</option><option value="blocking">Blocking</option></select></div>
    <div><label for="size">Workload</label><select id="size" name="size"><option value="small">Small · 500 products</option><option value="medium">Medium · 10,000 products</option><option value="large">Large · 50,000 products</option></select></div>
    <div><label for="seed">Catalogue seed</label><input id="seed" name="seed" type="number" min="0" max="4294967295" step="1" required></div>
    <button type="submit">Apply and restart</button>
  </form>
  <p class="hint" id="mode-help"></p>`;
const mode = ui.controls.querySelector<HTMLSelectElement>('#mode')!;
const size = ui.controls.querySelector<HTMLSelectElement>('#size')!;
const seed = ui.controls.querySelector<HTMLInputElement>('#seed')!;
mode.value = config.mode;
size.value = config.size;
seed.value = String(config.seed);
ui.controls.querySelector('#mode-help')!.textContent =
  config.mode === 'turnlet'
    ? 'Active: Turnlet · 5 ms chunks with cancellation. Previous results remain visible while searching.'
    : 'Active: Blocking · the complete search runs in the input handler.';
ui.query.disabled = true;

function commit(results: TopResults): void {
  renderResults(ui.results, results);
  ui.empty.hidden = results.matches !== 0;
  ui.status.textContent = `${results.matches.toLocaleString()} matches · showing ${results.items.length}`;
  ui.results.setAttribute('aria-busy', 'false');
}

// Give the browser a task boundary before preparing the catalogue.
setTimeout(() => {
  try {
    const products = createCatalogue(PRESETS[config.size], config.seed);
    const initial = blockingSearch(products.slice(0, 50), '');
    initial.matches = products.length;
    const controller = createSearchController(
      (query, signal) =>
        config.mode === 'blocking'
          ? blockingSearch(products, query)
          : turnletSearch(products, query, signal),
      {
        pending: () => {
          metrics.completion({ status: 'pending' });
          ui.status.textContent = 'Searching…';
          ui.results.setAttribute('aria-busy', 'true');
        },
        commit,
        clear: () => {
          commit(initial);
          metrics.completion({ status: 'waiting' });
        },
        completed: (duration) =>
          metrics.completion({ status: 'measured', duration }),
        error: () => {
          metrics.completion({ status: 'error' });
          ui.status.textContent = 'Search failed. Please try again.';
          ui.results.setAttribute('aria-busy', 'false');
        },
      },
    );
    ui.query.disabled = false;
    commit(initial);
    ui.query.addEventListener('input', () => {
      const startedAt = performance.now();
      void controller.update(ui.query.value, startedAt);
    });
    window.addEventListener('pagehide', () => controller.dispose(), {
      once: true,
    });
  } catch {
    ui.status.textContent =
      'Could not prepare the catalogue. Try a smaller workload.';
    ui.results.setAttribute('aria-busy', 'false');
  }
}, 0);

ui.controls.querySelector('form')!.addEventListener('submit', (event) => {
  event.preventDefault();
  const next = readConfig(
    new URLSearchParams({
      mode: mode.value,
      size: size.value,
      seed: seed.value,
    }),
  );
  location.assign(configUrl(next));
});
