/**
 * USD pricing for the (small, canonical) set of SODAX-swappable tokens.
 * Stables resolve to 1; the rest map to CoinGecko ids. Unknown symbols → undefined.
 * Cached in-memory with a short TTL to respect free-tier rate limits.
 */
const COINGECKO_KEY = process.env.COINGECKO_API_KEY;

const STABLES = new Set(['USDC', 'USDT', 'DAI', 'BNUSD', 'USDBC', 'USDS', 'USDC.E']);

const SYMBOL_TO_ID: Record<string, string> = {
  ETH: 'ethereum',
  WETH: 'weth',
  WEETH: 'wrapped-eeth',
  WSTETH: 'wrapped-steth',
  STETH: 'staked-ether',
  CBBTC: 'coinbase-wrapped-btc',
  WBTC: 'wrapped-bitcoin',
  TBTC: 'tbtc',
  SOL: 'solana',
  BNB: 'binancecoin',
  AVAX: 'avalanche-2',
  POL: 'matic-network',
  MATIC: 'matic-network',
};

interface CacheEntry {
  price: number;
  at: number;
}
const cache = new Map<string, CacheEntry>();
const TTL_MS = 60_000;

export async function priceUsdBySymbols(symbols: string[]): Promise<Map<string, number | undefined>> {
  const upper = [...new Set(symbols.map((s) => s.toUpperCase()))];
  const result = new Map<string, number | undefined>();
  const idsToFetch = new Set<string>();
  const now = Date.now();

  for (const sym of upper) {
    if (STABLES.has(sym)) {
      result.set(sym, 1);
      continue;
    }
    const id = SYMBOL_TO_ID[sym];
    if (!id) {
      result.set(sym, undefined);
      continue;
    }
    const hit = cache.get(id);
    if (hit && now - hit.at < TTL_MS) {
      result.set(sym, hit.price);
    } else {
      idsToFetch.add(id);
    }
  }

  if (idsToFetch.size) {
    try {
      const ids = [...idsToFetch].join(',');
      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`;
      const res = await fetch(url, {
        headers: COINGECKO_KEY ? { 'x-cg-demo-api-key': COINGECKO_KEY } : {},
      });
      if (res.ok) {
        const json = (await res.json()) as Record<string, { usd?: number }>;
        for (const sym of upper) {
          const id = SYMBOL_TO_ID[sym];
          if (id && json[id]?.usd != null) {
            const price = json[id].usd as number;
            cache.set(id, { price, at: now });
            result.set(sym, price);
          }
        }
      }
    } catch {
      // leave unresolved symbols undefined
    }
  }

  return result;
}
