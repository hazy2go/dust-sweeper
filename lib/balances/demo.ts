import { ChainKeys } from '@sodax/sdk';
import { classify } from './viability';
import { chainMeta } from '@/lib/sodax/chains';
import type { EnrichedBalance } from './types';

/** Sample balances for Demo mode — lets the full review/execute UI be experienced without keys or a wallet. */
function mk(
  chainKey: string,
  address: string,
  symbol: string,
  decimals: number,
  amount: number,
  usdValue: number,
): EnrichedBalance {
  const flat = chainMeta(chainKey)?.flatFeeUsd ?? 0.25;
  const cls = classify(true, usdValue, flat);
  return {
    id: `${chainKey}:${address.toLowerCase()}`,
    chainKey,
    address,
    symbol,
    decimals,
    rawAmount: BigInt(Math.round(amount * 10 ** decimals)).toString(),
    amount,
    usdValue,
    supported: true,
    sweepable: cls.sweepable,
    reason: cls.reason,
    feeUsd: cls.feeUsd,
  };
}

export const DEMO_BALANCES: EnrichedBalance[] = [
  mk(ChainKeys.ARBITRUM_MAINNET, '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', 'USDC', 6, 12.41, 12.41),
  mk(ChainKeys.OPTIMISM_MAINNET, '0x0000000000000000000000000000000000000000', 'ETH', 18, 0.0026, 9.1),
  mk(ChainKeys.SOLANA_MAINNET, 'So11111111111111111111111111111111111111112', 'SOL', 9, 0.041, 6.2),
  mk(ChainKeys.BASE_MAINNET, '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf', 'cbBTC', 8, 0.00006, 4.1),
  mk(ChainKeys.POLYGON_MAINNET, '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', 'USDC', 6, 0.32, 0.32),
  mk(ChainKeys.BASE_MAINNET, '0x4200000000000000000000000000000000000006', 'WETH', 18, 0.00009, 0.31),
].sort((a, b) => (b.usdValue ?? 0) - (a.usdValue ?? 0));

export const DEMO_EVM_ADDRESS = '0xDEMO000000000000000000000000000000000000';
export const DEMO_SOL_ADDRESS = 'DemoWa11etSo1ana1111111111111111111111111';
