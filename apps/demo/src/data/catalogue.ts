export interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  words: readonly string[];
}

export const PRESETS = { small: 500, medium: 10000, large: 50000 } as const;
export const DEFAULT_SEED = 42;

export function normalize(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function createCatalogue(size: number, seed = DEFAULT_SEED): Product[] {
  let state = seed >>> 0;
  const random = (): number => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const materials = ['Linen', 'Oak', 'Ceramic', 'Wool', 'Steel', 'Cotton'];
  const colors = ['Ivory', 'Forest', 'Clay', 'Indigo', 'Amber', 'Charcoal'];
  const kinds = [
    ['Lamp', 'Lighting'],
    ['Chair', 'Furniture'],
    ['Mug', 'Kitchen'],
    ['Throw', 'Textiles'],
    ['Tray', 'Accessories'],
    ['Notebook', 'Stationery'],
  ] as const;
  return Array.from({ length: size }, (_, id) => {
    const [kind, category] = kinds[Math.floor(random() * kinds.length)]!;
    const name = `${colors[Math.floor(random() * colors.length)]} ${materials[Math.floor(random() * materials.length)]} ${kind}`;
    return {
      id,
      name,
      category,
      price: 10 + Math.floor(random() * 290),
      words: normalize(`${name} ${category}`).split(' '),
    };
  });
}
