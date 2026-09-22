import { describe, expect, it } from 'vitest';

describe('public package entry', () => {
  it('imports safely in a non-DOM environment', async () => {
    expect('window' in globalThis).toBe(false);

    const turnlet = await import('turnlet');

    expect(Object.keys(turnlet)).toEqual([]);
  });
});
