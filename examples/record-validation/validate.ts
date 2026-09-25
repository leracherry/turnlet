import { mapInChunks } from 'turnlet';

export interface RecordInput {
  id: string;
  email: string;
}
export interface Validation {
  index: number;
  id: string;
  errors: string[];
}

// Intentionally simple local validation, not proof that an address exists.
export function validateRecord(record: RecordInput, index: number): Validation {
  const errors: string[] = [];
  if (!record.id.trim()) errors.push('ID is required');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(record.email))
    errors.push('Email format is invalid');
  return { index, id: record.id, errors };
}

export function createValidator(
  commit: (results: Validation[]) => void,
  reportError: (error: unknown) => void,
) {
  let active: AbortController | undefined;
  let request = 0;
  return {
    async update(records: readonly RecordInput[]): Promise<void> {
      const id = ++request;
      active?.abort();
      const controller = new AbortController();
      active = controller;
      // Own the values while processing; callers may edit their form afterward.
      const snapshot = records.map((record) => ({ ...record }));
      try {
        const results = await mapInChunks(snapshot, validateRecord, {
          budgetMs: 5,
          signal: controller.signal,
        });
        if (id === request && !controller.signal.aborted) commit(results);
      } catch (error) {
        if (id === request && !controller.signal.aborted) reportError(error);
      }
    },
    cancel() {
      ++request;
      active?.abort();
    },
  };
}
