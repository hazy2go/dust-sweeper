import type { SpokeChainKey } from '@sodax/sdk';
import { chainMeta, EVM_NATIVE_SENTINEL } from '@/lib/sodax/chains';
import { listSupportedTokens } from '@/lib/sodax/swap-tokens';
import type { RawBalance } from './types';

const ALCHEMY_KEY = process.env.ALCHEMY_API_KEY;

interface RpcCall {
  id: number;
  method: string;
  params: unknown[];
}

async function rpcBatch(url: string, calls: RpcCall[]): Promise<Record<number, any>> {
  const body = calls.map((c) => ({ jsonrpc: '2.0', id: c.id, method: c.method, params: c.params }));
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`RPC ${res.status}`);
  const json = (await res.json()) as Array<{ id: number; result?: any; error?: any }>;
  const out: Record<number, any> = {};
  for (const r of json) out[r.id] = r.error ? null : r.result;
  return out;
}

function hexToBigInt(hex: unknown): bigint {
  if (typeof hex !== 'string' || !hex.startsWith('0x')) return 0n;
  try {
    return BigInt(hex);
  } catch {
    return 0n;
  }
}

/**
 * Fetch balances for the SODAX-supported tokens on one EVM chain.
 * Queries only known contracts (+ native) — no spam, no metadata calls.
 */
export async function fetchEvmBalances(chainKey: SpokeChainKey, address: string): Promise<RawBalance[]> {
  const meta = chainMeta(chainKey);
  if (!meta?.alchemyNetwork) return [];
  if (!ALCHEMY_KEY) throw new Error('ALCHEMY_API_KEY is not set');

  const url = `https://${meta.alchemyNetwork}.g.alchemy.com/v2/${ALCHEMY_KEY}`;
  const supported = listSupportedTokens(chainKey);
  const erc20 = supported.filter((t) => t.address.toLowerCase() !== EVM_NATIVE_SENTINEL);
  const nativeTok = supported.find((t) => t.address.toLowerCase() === EVM_NATIVE_SENTINEL);

  const calls: RpcCall[] = [];
  if (erc20.length) {
    calls.push({ id: 1, method: 'alchemy_getTokenBalances', params: [address, erc20.map((t) => t.address)] });
  }
  if (nativeTok) {
    calls.push({ id: 2, method: 'eth_getBalance', params: [address, 'latest'] });
  }
  if (!calls.length) return [];

  const results = await rpcBatch(url, calls);
  const out: RawBalance[] = [];

  const tokenBalances: Array<{ contractAddress: string; tokenBalance: string }> =
    results[1]?.tokenBalances ?? [];
  const byAddr = new Map(erc20.map((t) => [t.address.toLowerCase(), t]));
  for (const tb of tokenBalances) {
    const tok = byAddr.get(tb.contractAddress.toLowerCase());
    if (!tok) continue;
    const amount = hexToBigInt(tb.tokenBalance);
    if (amount <= 0n) continue;
    out.push({
      chainKey,
      address: tok.address,
      symbol: tok.symbol,
      decimals: tok.decimals,
      rawAmount: amount.toString(),
    });
  }

  if (nativeTok && results[2] != null) {
    const lamp = hexToBigInt(results[2]);
    if (lamp > 0n) {
      out.push({
        chainKey,
        address: nativeTok.address,
        symbol: nativeTok.symbol,
        decimals: nativeTok.decimals,
        rawAmount: lamp.toString(),
      });
    }
  }

  return out;
}
