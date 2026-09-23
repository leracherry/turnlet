import { forEachInChunks, mapInChunks, type ChunkOptions } from 'turnlet';

const values: readonly number[] = [1, 2, 3];
const options: ChunkOptions = { budgetMs: 5 };

const mapped: Promise<string[]> = mapInChunks(
  values,
  (value, index) => `${index}:${value}`,
  options,
);
const iterated: Promise<void> = forEachInChunks(values, () => {}, options);

void mapped;
void iterated;
