/** Why a discovered token is or isn't offered for sweeping. */
export type SweepReason = 'ok' | 'dust' | 'not-supported' | 'unpriced';

/** A raw on-chain balance (JSON-safe: rawAmount is a decimal string of base units). */
export interface RawBalance {
  chainKey: string;
  /** Token contract (EVM) / mint (Solana). Native maps to the SDK's native token address. */
  address: string;
  symbol: string;
  decimals: number;
  rawAmount: string;
}

export interface FeeBreakdownUsd {
  solver: number;
  partner: number;
  flat: number;
  total: number;
}

/** A balance enriched with price, support status, and sweep classification. */
export interface EnrichedBalance extends RawBalance {
  amount: number; // human-readable float
  usdValue: number | null; // null when unpriced
  supported: boolean;
  sweepable: boolean;
  reason: SweepReason;
  feeUsd?: FeeBreakdownUsd;
}

export interface DiscoveryResponse {
  balances: EnrichedBalance[];
  scannedChains: string[];
  errors: { chainKey: string; message: string }[];
}
