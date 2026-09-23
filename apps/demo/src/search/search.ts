import { normalize, type Product } from '../data/catalogue.js';

export const MAX_QUERY_LENGTH = 64;
export const MAX_RESULTS = 50;
export interface SearchResult {
  product: Product;
  score: number;
}

// At most four terms, each at most 24 characters.
export function queryTerms(query: string): string[] {
  return normalize(query.slice(0, MAX_QUERY_LENGTH))
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 4)
    .map((term) => term.slice(0, 24));
}

function distance(left: string, right: string): number {
  if (Math.abs(left.length - right.length) > 2) return 3;
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i++) {
    const row = [i];
    for (let j = 1; j <= right.length; j++) {
      row[j] = Math.min(
        row[j - 1]! + 1,
        previous[j]! + 1,
        previous[j - 1]! + (left[i - 1] === right[j - 1] ? 0 : 1),
      );
    }
    previous = row;
  }
  return previous[right.length]!;
}

export function scoreProduct(
  product: Product,
  terms: readonly string[],
): number {
  let total = 0;
  for (const term of terms) {
    let best = 0;
    for (const word of product.words) {
      const score =
        word === term
          ? 100
          : word.startsWith(term)
            ? 80
            : word.includes(term)
              ? 60
              : term.length >= 4 && distance(term, word) <= 1
                ? 30
                : 0;
      best = Math.max(best, score);
    }
    if (best === 0) return 0;
    total += best;
  }
  return total || 1;
}

export class TopResults {
  readonly items: SearchResult[] = [];
  matches = 0;
  consider(product: Product, score: number): void {
    if (score === 0) return;
    this.matches++;
    const index = this.items.findIndex(
      (item) =>
        score > item.score ||
        (score === item.score && product.id < item.product.id),
    );
    if (index < 0) {
      if (this.items.length < MAX_RESULTS) this.items.push({ product, score });
    } else {
      this.items.splice(index, 0, { product, score });
      if (this.items.length > MAX_RESULTS) this.items.pop();
    }
  }
}

export function blockingSearch(
  products: readonly Product[],
  query: string,
): TopResults {
  const terms = queryTerms(query);
  const results = new TopResults();
  for (const product of products)
    results.consider(product, scoreProduct(product, terms));
  return results;
}
