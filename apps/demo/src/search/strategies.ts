import { forEachInChunks } from 'turnlet';
import type { Product } from '../data/catalogue.js';
import { queryTerms, scoreProduct, TopResults } from './search.js';

export async function turnletSearch(
  products: readonly Product[],
  query: string,
  signal: AbortSignal,
): Promise<TopResults> {
  const terms = queryTerms(query);
  const results = new TopResults();
  await forEachInChunks(
    products,
    (product) => results.consider(product, scoreProduct(product, terms)),
    { budgetMs: 5, signal },
  );
  return results;
}
