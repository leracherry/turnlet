import { queryTerms, type TopResults } from './search.js';

interface SearchView {
  pending: () => void;
  commit: (results: TopResults) => void;
  clear: () => void;
  error: (error: unknown) => void;
}
export function createSearchController(
  search: (
    query: string,
    signal: AbortSignal,
  ) => TopResults | Promise<TopResults>,
  view: SearchView,
) {
  let requestId = 0;
  let controller: AbortController | undefined;
  return {
    async update(query: string): Promise<void> {
      const id = ++requestId;
      controller?.abort();
      const current = new AbortController();
      controller = current;
      if (queryTerms(query).length === 0) {
        view.clear();
        return;
      }
      view.pending();
      try {
        const result = await search(query, current.signal);
        if (id === requestId && !current.signal.aborted) view.commit(result);
      } catch (error) {
        if (id === requestId && !current.signal.aborted) view.error(error);
      }
    },
    dispose(): void {
      requestId++;
      controller?.abort();
    },
  };
}
