import { ChainKeys } from '@sodax/sdk';
import { listSupportedTokens, findTokenBySymbol } from '@/lib/sodax/swap-tokens';
import type { RawBalance } from './types';

const HELIUS_KEY = process.env.HELIUS_API_KEY;
const SOLANA_RPC =
  process.env.SOLANA_RPC ??
  (HELIUS_KEY ? `https://mainnet.helius-rpc.com/?api-key=${HELIUS_KEY}` : 'https://api.mainnet-beta.solana.com');

const TOKEN_PROGRAM = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';

async function rpc(method: string, params: unknown[]): Promise<any> {
  const res = await fetch(SOLANA_RPC, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  if (!res.ok) throw new Error(`Solana RPC ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(json.error.message ?? 'Solana RPC error');
  return json.result;
}

/** Fetch SODAX-supported SPL + native SOL balances for a Solana wallet. */
export async function fetchSolanaBalances(address: string): Promise<RawBalance[]> {
  const supported = listSupportedTokens(ChainKeys.SOLANA_MAINNET);
  if (!supported.length) return [];
  const byMint = new Map(supported.map((t) => [t.address, t]));
  const out: RawBalance[] = [];

  // SPL token accounts (jsonParsed)
  const accounts = await rpc('getTokenAccountsByOwner', [
    address,
    { programId: TOKEN_PROGRAM },
    { encoding: 'jsonParsed' },
  ]);
  for (const acc of accounts?.value ?? []) {
    const info = acc?.account?.data?.parsed?.info;
    if (!info) continue;
    const tok = byMint.get(info.mint);
    if (!tok) continue;
    const raw = BigInt(info.tokenAmount?.amount ?? '0');
    if (raw <= 0n) continue;
    out.push({
      chainKey: ChainKeys.SOLANA_MAINNET,
      address: tok.address,
      symbol: tok.symbol,
      decimals: tok.decimals,
      rawAmount: raw.toString(),
    });
  }

  // Native SOL
  const sol = findTokenBySymbol(ChainKeys.SOLANA_MAINNET, 'SOL');
  if (sol) {
    const lamports = await rpc('getBalance', [address]);
    const raw = BigInt(lamports?.value ?? 0);
    if (raw > 0n) {
      out.push({
        chainKey: ChainKeys.SOLANA_MAINNET,
        address: sol.address,
        symbol: sol.symbol,
        decimals: sol.decimals,
        rawAmount: raw.toString(),
      });
    }
  }

  return out;
}
