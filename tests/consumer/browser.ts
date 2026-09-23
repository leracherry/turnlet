import { mapInChunks } from 'turnlet';

const result = document.querySelector<HTMLOutputElement>('#result');

if (result === null) {
  throw new Error('Consumer result element was not found.');
}

async function renderResult(): Promise<void> {
  const mapped = await mapInChunks([1, 2, 3], (value) => value * 2);
  result.value = JSON.stringify(mapped);
}

void renderResult().catch((error: unknown) => {
  result.value = `error: ${String(error)}`;
});
