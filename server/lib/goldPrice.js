// Live gold spot price, cached for 5 minutes to avoid hammering the free API.
let cache = { price: null, fetchedAt: 0 };
const CACHE_MS = 5 * 60 * 1000;

export async function getGoldPricePerOz() {
  const now = Date.now();
  if (cache.price && (now - cache.fetchedAt) < CACHE_MS) {
    return cache.price;
  }
  try {
    const res = await fetch('https://api.gold-api.com/price/XAU');
    const data = await res.json();
    const price = data.price;
    if (typeof price === 'number') {
      cache = { price, fetchedAt: now };
      return price;
    }
    throw new Error('Unexpected response shape');
  } catch (e) {
    console.error('Gold price fetch failed:', e.message);
    // Fall back to last known price if we have one, otherwise a rough default.
    return cache.price || 2000;
  }
}

// Approximate purity by karat, used to convert spot (24k) price to karat-adjusted price.
export const KARAT_PURITY = {
  24: 1.0,
  22: 0.9167,
  18: 0.75,
  14: 0.5833,
  10: 0.4167,
};

const GRAMS_PER_OZ = 31.1035;

export function pricePerGramForKarat(spotPricePerOz, karat) {
  const purity = KARAT_PURITY[karat] || 0.75;
  return (spotPricePerOz / GRAMS_PER_OZ) * purity;
}
