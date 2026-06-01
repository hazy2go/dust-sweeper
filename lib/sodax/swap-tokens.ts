import type { SpokeChainKey, XToken } from '@sodax/sdk';
import { getServerSodax } from './client';
import { V1_CHAIN_KEYS } from './chains';

const norm = (addr: string) => addr.toLowerCase();

/** Canonical match key: chainKey + lowercased token address. */
export const tokenKey = (chainKey: string, address: string) => `${chainKey}:${norm(address)}`;

interface TokenIndex {
  byKey: Map<string, XToken>;
  byChainSymbol: Map<string, XToken>;
}

let _index: TokenIndex | null = null;

function buildIndex(): TokenIndex {
  const sodax = getServerSodax();
  const byKey = new Map<string, XToken>();
  const byChainSymbol = new Map<string, XToken>();
  for (const chainKey of V1_CHAIN_KEYS) {
    let tokens: readonly XToken[] = [];
    try {
      tokens = sodax.config.getSupportedSwapTokensByChainId(chainKey);
    } catch {
      tokens = [];
    }
    for (const t of tokens) {
      byKey.set(tokenKey(chainKey, t.address), t);
      byChainSymbol.set(`${chainKey}:${t.symbol.toUpperCase()}`, t);
    }
  }
  return { byKey, byChainSymbol };
}

function index(): TokenIndex {
  if (!_index) _index = buildIndex();
  return _index;
}

/** True if a discovered token (chainKey + address) is swappable via SODAX. */
export function isSweepableToken(chainKey: string, address: string): boolean {
  return index().byKey.has(tokenKey(chainKey, address));
}

/** The SODAX XToken for a discovered token, if supported. */
export function getSupportedToken(chainKey: string, address: string): XToken | undefined {
  return index().byKey.get(tokenKey(chainKey, address));
}

/** Look up a supported token on a chain by symbol (e.g. native 'SOL', 'USDC'). */
export function findTokenBySymbol(chainKey: string, symbol: string): XToken | undefined {
  return index().byChainSymbol.get(`${chainKey}:${symbol.toUpperCase()}`);
}

/** All SODAX-swappable tokens on a chain (for the output-token selector). */
export function listSupportedTokens(chainKey: SpokeChainKey): readonly XToken[] {
  try {
    return getServerSodax().config.getSupportedSwapTokensByChainId(chainKey);
  } catch {
    return [];
  }
}
