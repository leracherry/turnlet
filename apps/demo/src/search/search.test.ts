import { describe, expect, it } from 'vitest';
import { createCatalogue, normalize } from '../data/catalogue.js';
import {
  blockingSearch,
  queryTerms,
  scoreProduct,
  TopResults,
} from './search.js';

describe('catalogue search', () => {
  it('is reproducible with unique IDs and normalized fields', () => {
    const products = createCatalogue(100);
    expect(products).toEqual(createCatalogue(100));
    expect(products).not.toEqual(createCatalogue(100, 7));
    expect(new Set(products.map((p) => p.id)).size).toBe(100);
    expect(products[0]!.words.join(' ')).toBe(
      normalize(products[0]!.name + ' ' + products[0]!.category),
    );
  });
  it('ranks exact matches above prefixes and typos', () => {
    const product = { ...createCatalogue(1)[0]!, words: ['ceramic', 'lamp'] };
    expect(scoreProduct(product, ['lamp'])).toBeGreaterThan(
      scoreProduct(product, ['lam']),
    );
    expect(scoreProduct(product, ['lamp'])).toBeGreaterThan(
      scoreProduct(product, ['lamq']),
    );
    expect(scoreProduct(product, ['lamp', 'missing'])).toBe(0);
  });
  it('bounds results, breaks ties by ID, and handles empty/no-match queries', () => {
    const products = createCatalogue(100);
    const results = blockingSearch([...products].reverse(), '');
    expect(results.matches).toBe(100);
    expect(results.items.map((r) => r.product.id)).toEqual(
      Array.from({ length: 50 }, (_, i) => i),
    );
    expect(blockingSearch(products, 'zzzzzzzzzz').items).toEqual([]);
    expect(blockingSearch([], '').items).toEqual([]);
  });
  it('matches a full-sort reference while keeping only 50 results', () => {
    const products = createCatalogue(500);
    const top = new TopResults();
    const scored = products.map((product) => ({
      product,
      score: (product.id * 17) % 31,
    }));
    for (const item of scored) {
      top.consider(item.product, item.score);
      expect(top.items.length).toBeLessThanOrEqual(50);
    }
    expect(top.items).toEqual(
      scored
        .filter((r) => r.score > 0)
        .sort((a, b) => b.score - a.score || a.product.id - b.product.id)
        .slice(0, 50),
    );
  });
  it('bounds and normalizes query work', () => {
    expect(queryTerms('  CÉRAMIC Lamp ')).toEqual(['ceramic', 'lamp']);
    expect(queryTerms('a b c d e')).toHaveLength(4);
    expect(queryTerms('x'.repeat(100))[0]).toHaveLength(24);
  });
});
