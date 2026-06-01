import { formatUnits } from 'viem';
import { EVM_CHAINS, chainMeta } from '@/lib/sodax/chains';
import { fetchEvmBalances } from './evm';
import { fetchSolanaBalances } from './solana';
import { priceUsdBySymbols } from './prices';
import { classify } from './viability';
import type { DiscoveryResponse, EnrichedBalance, RawBalance } from './types';

export interface DiscoverInput {
  evmAddress?: string;
  solanaAddress?: string;
}

/**
 * Discover SODAX-swappable balances across the v1 chains, price them, and
 * classify each into sweepable / dust / unpriced. Per-chain failures are
 * collected (partial results) rather than aborting the whole scan.
 */
export async function discover(input: DiscoverInput): Promise<DiscoveryResponse> {
  const raw: RawBalance[] = [];
  const scannedChains: string[] = [];
  const errors: { chainKey: string; message: string }[] = [];

  const tasks: Promise<void>[] = [];

  if (input.evmAddress) {
    for (const c of EVM_CHAINS) {
      tasks.push(
        fetchEvmBalances(c.key, input.evmAddress)
          .then((b) => {
            scannedChains.push(c.key);
            raw.push(...b);
          })
          .catch((e) => {
            errors.push({ chainKey: c.key, message: e?.message ?? String(e) });
          }),
      );
    }
  }

  if (input.solanaAddress) {
    tasks.push(
      fetchSolanaBalances(input.solanaAddress)
        .then((b) => {
          scannedChains.push('solana');
          raw.push(...b);
        })
        .catch((e) => {
          errors.push({ chainKey: 'solana', message: e?.message ?? String(e) });
        }),
    );
  }

  await Promise.all(tasks);

  const prices = await priceUsdBySymbols(raw.map((r) => r.symbol));

  const balances: EnrichedBalance[] = raw.map((r) => {
    const amount = Number(formatUnits(BigInt(r.rawAmount), r.decimals));
    const price = prices.get(r.symbol.toUpperCase());
    const usdValue = price != null ? amount * price : null;
    const flat = chainMeta(r.chainKey)?.flatFeeUsd ?? 0.25;
    const cls = classify(true, usdValue, flat);
    return {
      ...r,
      id: `${r.chainKey}:${r.address.toLowerCase()}`,
      amount,
      usdValue,
      supported: true,
      sweepable: cls.sweepable,
      reason: cls.reason,
      feeUsd: cls.feeUsd,
    };
  });

  balances.sort((a, b) => (b.usdValue ?? 0) - (a.usdValue ?? 0));

  return { balances, scannedChains, errors };
}
