import { DEFAULT_SEED, PRESETS } from './data/catalogue.js';
export interface DemoConfig {
  mode: 'blocking' | 'turnlet';
  size: keyof typeof PRESETS;
  seed: number;
}
export function readConfig(params: URLSearchParams): DemoConfig {
  const size = params.get('size');
  const rawSeed = params.get('seed');
  const seed =
    rawSeed === null || rawSeed.trim() === '' ? NaN : Number(rawSeed);
  return {
    mode: params.get('mode') === 'blocking' ? 'blocking' : 'turnlet',
    size: size === 'small' || size === 'large' ? size : 'medium',
    seed:
      Number.isInteger(seed) && seed >= 0 && seed <= 4294967295
        ? seed
        : DEFAULT_SEED,
  };
}
export function configUrl(config: DemoConfig): string {
  return (
    '?' +
    new URLSearchParams({
      mode: config.mode,
      size: config.size,
      seed: String(config.seed),
    })
  );
}
