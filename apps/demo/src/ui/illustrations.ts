const illustrations: Record<string, string> = {
  lighting: new URL('../assets/lighting.svg', import.meta.url).href,
  furniture: new URL('../assets/furniture.svg', import.meta.url).href,
  kitchen: new URL('../assets/kitchen.svg', import.meta.url).href,
  textiles: new URL('../assets/textiles.svg', import.meta.url).href,
  accessories: new URL('../assets/accessories.svg', import.meta.url).href,
  stationery: new URL('../assets/stationery.svg', import.meta.url).href,
};

export function productIllustration(category: string): HTMLImageElement {
  const image = document.createElement('img');
  image.src = illustrations[category.toLowerCase()]!;
  image.alt = '';
  image.width = 240;
  image.height = 170;
  image.loading = 'lazy';
  image.className = 'product-illustration';
  return image;
}
