import type { TopResults } from '../search/search.js';

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
    card.append(category, title, price);
    fragment.append(card);
  }
  container.replaceChildren(fragment);
}

export function mountCatalogue(app: HTMLElement) {
  app.innerHTML = `
    <header><a class="brand" href="./">turnlet<span> / playground</span></a><span class="badge">Small turns. Responsive interfaces.</span></header>
    <section class="intro"><p class="eyebrow">A little room to breathe</p>
      <h1>Good things.<br><em>Small turns.</em></h1>
      <p>Explore a synthetic catalogue. Every search scores the same products, one item at a time.</p>
    </section>
    <section class="workspace" aria-label="Catalogue search">
      <div id="controls"></div>
      <div id="metrics"></div>
      <label for="query">Find something good</label>
      <input id="query" type="search" maxlength="64" placeholder="Try ceramic, lamp, or forest…" autocomplete="off" aria-describedby="search-help">
      <p id="search-help" class="hint">Matches names and categories, including small typos. Up to 50 results are displayed.</p>
      <div class="result-header"><h2>Catalogue</h2><p id="status" role="status" aria-live="polite">Preparing catalogue…</p></div>
      <p id="empty" hidden>No matches. Try a shorter or different search.</p>
      <ul id="results" class="grid" aria-label="Search results" aria-busy="true"></ul>
    </section>
    <footer>Built with Turnlet · Synchronous work, cooperative scheduling.</footer>`;
  return {
    query: app.querySelector<HTMLInputElement>('#query')!,
    status: app.querySelector<HTMLElement>('#status')!,
    results: app.querySelector<HTMLElement>('#results')!,
    empty: app.querySelector<HTMLElement>('#empty')!,
    controls: app.querySelector<HTMLElement>('#controls')!,
    metrics: app.querySelector<HTMLElement>('#metrics')!,
  };
}
