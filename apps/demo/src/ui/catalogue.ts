import type { TopResults } from '../search/search.js';
import { productIllustration } from './illustrations.js';

export function renderResults(
  container: HTMLElement,
  results: TopResults,
): void {
  const fragment = document.createDocumentFragment();
  for (const { product } of results.items) {
    const card = document.createElement('li');
    card.className = 'card';
    card.dataset.id = String(product.id);
    const category = document.createElement('p');
    category.className = 'category';
    category.textContent = product.category;
    const title = document.createElement('h3');
    title.textContent = product.name;
    const price = document.createElement('p');
    price.className = 'price';
    price.textContent = `$${product.price}.00`;
    card.append(productIllustration(product.category), category, title, price);
    fragment.append(card);
  }
  container.replaceChildren(fragment);
}

export function mountCatalogue(app: HTMLElement) {
  app.innerHTML = `
    <a class="skip-link" href="#query">Skip to search</a>
    <header><a class="brand" href="./">turnlet<span> / playground</span></a><a class="source-link" href="https://github.com/leracherry/turnlet">View source ↗</a></header>
    <section class="intro"><p class="eyebrow">A little room to breathe</p>
      <h1>Small turns.<br><em>Room to respond.</em></h1>
      <p>A tiny library for cooperative work. Compare one blocking loop with smaller turns that give the browser opportunities to handle input and paint.</p>
    </section>
    <section class="workspace" aria-label="Catalogue search">
      <div id="controls"></div>
      <label for="query">Find something good</label>
      <input id="query" type="search" maxlength="64" placeholder="Try ceramic, lamp, or forest…" autocomplete="off" aria-describedby="search-help">
      <p id="search-help" class="hint">Matches names and categories, including small typos. Up to 50 results are displayed.</p>
      <div id="metrics"></div>
      <div class="result-header"><h2>Catalogue</h2><p id="status" role="status" aria-live="polite">Preparing catalogue…</p></div>
      <p id="empty" hidden>No matches. Try a shorter or different search.</p>
      <ul id="results" class="grid" aria-label="Search results" aria-busy="true"></ul>
    </section>
    <section class="integration" aria-labelledby="integration-title">
      <div><p class="eyebrow">Bring it to your loop</p><h2 id="integration-title">Same work. Smaller turns.</h2>
        <p>Keep each callback synchronous and small. Turnlet preserves order and yields between chunks; it does not move work off the main thread.</p>
        <p>For search, abort the previous request and check request ownership before rendering. A running callback cannot be interrupted.</p>
        <a href="https://github.com/leracherry/turnlet/blob/main/docs/api-contract.md">Read the API contract ↗</a>
      </div>
      <pre tabindex="0" aria-label="Turnlet integration example"><code>import { forEachInChunks } from 'turnlet';

const controller = new AbortController();

await forEachInChunks(
  products,
  product =&gt; results.consider(score(product)),
  { budgetMs: 5, signal: controller.signal },
);

// Cancel stale work with controller.abort().
// Handle rejection before committing results.</code></pre>
    </section>
    <footer>Turnlet · Small turns. Responsive interfaces.<span>Synthetic products · Not a shop or a benchmark</span></footer>`;
  return {
    query: app.querySelector<HTMLInputElement>('#query')!,
    status: app.querySelector<HTMLElement>('#status')!,
    results: app.querySelector<HTMLElement>('#results')!,
    empty: app.querySelector<HTMLElement>('#empty')!,
    controls: app.querySelector<HTMLElement>('#controls')!,
    metrics: app.querySelector<HTMLElement>('#metrics')!,
  };
}
