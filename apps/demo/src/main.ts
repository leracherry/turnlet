import './styles.css';
import { createCatalogue, PRESETS } from './data/catalogue.js';
import { blockingSearch } from './search/search.js';
import { mountCatalogue, renderResults } from './ui/catalogue.js';

const app = document.querySelector<HTMLElement>('#app');
if (!app) throw new Error('Turnlet demo root was not found.');
const ui = mountCatalogue(app);
const products = createCatalogue(PRESETS.medium);

function search(): void {
  try {
    ui.results.setAttribute('aria-busy', 'true');
    const results = blockingSearch(products, ui.query.value);
    renderResults(ui.results, results);
    ui.empty.hidden = results.matches !== 0;
    ui.status.textContent = `${results.matches.toLocaleString()} matches · showing ${results.items.length}`;
  } catch {
    ui.status.textContent = 'Search failed. Please try again.';
  } finally {
    ui.results.setAttribute('aria-busy', 'false');
  }
}
ui.query.addEventListener('input', search);
search();
