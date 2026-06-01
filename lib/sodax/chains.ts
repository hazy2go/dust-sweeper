import { ChainKeys } from '@sodax/sdk';
import type { SpokeChainKey } from '@sodax/sdk';

export type ChainFamily = 'EVM' | 'SOLANA';

export interface ChainMeta {
  key: SpokeChainKey;
  label: string;
  family: ChainFamily;
  /** EVM numeric chain id (for wallet/explorer); undefined for non-EVM. */
  evmChainId?: number;
  /** Alchemy network slug for the token-balances API (EVM only). */
  alchemyNetwork?: string;
  /** Rough gas + relay cost estimate in USD, used by the viability filter. */
  flatFeeUsd: number;
}

/** The native-asset sentinel address on EVM chains (gas token). */
export const EVM_NATIVE_SENTINEL = '0x0000000000000000000000000000000000000000';

/**
 * v1 launch set: 7 EVM chains + Solana.
 * Deferred (NOT here): Sui, Stellar, ICON, Injective, NEAR, Bitcoin, Hyper, LightLink, Redbelly, Kaia.
 */
export const V1_CHAINS: readonly ChainMeta[] = [
  { key: ChainKeys.ETHEREUM_MAINNET, label: 'Ethereum', family: 'EVM', evmChainId: 1, alchemyNetwork: 'eth-mainnet', flatFeeUsd: 1.5 },
  { key: ChainKeys.BASE_MAINNET, label: 'Base', family: 'EVM', evmChainId: 8453, alchemyNetwork: 'base-mainnet', flatFeeUsd: 0.2 },
  { key: ChainKeys.ARBITRUM_MAINNET, label: 'Arbitrum', family: 'EVM', evmChainId: 42161, alchemyNetwork: 'arb-mainnet', flatFeeUsd: 0.2 },
  { key: ChainKeys.OPTIMISM_MAINNET, label: 'Optimism', family: 'EVM', evmChainId: 10, alchemyNetwork: 'opt-mainnet', flatFeeUsd: 0.2 },
  { key: ChainKeys.POLYGON_MAINNET, label: 'Polygon', family: 'EVM', evmChainId: 137, alchemyNetwork: 'polygon-mainnet', flatFeeUsd: 0.1 },
  { key: ChainKeys.BSC_MAINNET, label: 'BNB Chain', family: 'EVM', evmChainId: 56, alchemyNetwork: 'bnb-mainnet', flatFeeUsd: 0.2 },
  { key: ChainKeys.AVALANCHE_MAINNET, label: 'Avalanche', family: 'EVM', evmChainId: 43114, alchemyNetwork: 'avax-mainnet', flatFeeUsd: 0.25 },
  { key: ChainKeys.SOLANA_MAINNET, label: 'Solana', family: 'SOLANA', flatFeeUsd: 0.05 },
];

export const V1_CHAIN_KEYS: readonly SpokeChainKey[] = V1_CHAINS.map((c) => c.key);

export const CHAIN_BY_KEY: Record<string, ChainMeta> = Object.fromEntries(
  V1_CHAINS.map((c) => [c.key, c]),
);

export const EVM_CHAINS = V1_CHAINS.filter((c) => c.family === 'EVM');

export function chainMeta(key: string): ChainMeta | undefined {
  return CHAIN_BY_KEY[key];
}

/** Sonic hub — needed for SDK config/relay even though users never connect a Sonic wallet. */
export const SONIC = ChainKeys.SONIC_MAINNET;
