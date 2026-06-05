import type { Sodax, SpokeChainKey } from '@sodax/sdk';
import { SLIPPAGE_BPS } from '@/lib/config';
import { EVM_NATIVE_SENTINEL } from '@/lib/sodax/chains';
import type { TokenSweepState } from './state-machine';

export interface SweepRequest {
  id: string;
  symbol: string;
  inputToken: string;
  srcChainKey: SpokeChainKey;
  srcAddress: string;
  outputToken: string;
  dstChainKey: SpokeChainKey;
  dstAddress: string;
  rawAmount: bigint;
  /** EVM tokens need allowance/approval; Solana does not. */
  isEvm: boolean;
}

export type Patch = Partial<TokenSweepState>;

/** Signatures one sweep needs: EVM ERC-20 ≤ 2 (approve + swap), EVM native 1, Solana 1. */
export function signaturesFor(req: Pick<SweepRequest, 'isEvm' | 'inputToken'>): number {
  if (!req.isEvm) return 1;
  return req.inputToken.toLowerCase() === EVM_NATIVE_SENTINEL ? 1 : 2;
}

function msg(err: unknown): string {
  if (err && typeof err === 'object' && 'message' in err) return String((err as any).message);
  return String(err);
}

const DEADLINE_OFFSET_S = 600n; // 10 min

/**
 * Execute one token's sweep: quote → (EVM) approve → swap.
 * Returns the terminal patch ('done' | 'failed'); reports intermediate phases via onPhase.
 * walletProvider is the SDK provider for the source chain family (typed loosely to
 * avoid fighting the SDK's conditional generics at this single boundary).
 */
export async function executeOne(
  sodax: Sodax,
  walletProvider: any,
  req: SweepRequest,
  onPhase: (p: Patch) => void,
  nowSeconds: number,
): Promise<Patch> {
  // 1) Quote
  onPhase({ phase: 'quoting' });
  const quote = await sodax.swaps.getQuote({
    token_src: req.inputToken,
    token_src_blockchain_id: req.srcChainKey,
    token_dst: req.outputToken,
    token_dst_blockchain_id: req.dstChainKey,
    amount: req.rawAmount,
    quote_type: 'exact_input',
  });
  if (!quote.ok) {
    return { phase: 'failed', failedAt: 'quote', error: msg(quote.error), recoverable: false };
  }
  const quotedOut = quote.value.quoted_amount;
  const minOut = (quotedOut * (10_000n - SLIPPAGE_BPS)) / 10_000n;
  onPhase({ quotedOut: quotedOut.toString(), minOut: minOut.toString() });

  const params = {
    inputToken: req.inputToken,
    outputToken: req.outputToken,
    inputAmount: req.rawAmount,
    minOutputAmount: minOut,
    deadline: BigInt(nowSeconds) + DEADLINE_OFFSET_S,
    allowPartialFill: false,
    srcChainKey: req.srcChainKey,
    dstChainKey: req.dstChainKey,
    srcAddress: req.srcAddress,
    dstAddress: req.dstAddress,
    data: '0x' as `0x${string}`,
  };

  // 2) Approve (EVM ERC-20 only)
  if (req.isEvm) {
    const allow = await sodax.swaps.isAllowanceValid({ params, walletProvider });
    if (allow.ok && allow.value === false) {
      onPhase({ phase: 'approving' });
      const appr = await sodax.swaps.approve({ params, walletProvider });
      if (!appr.ok) {
        return { phase: 'failed', failedAt: 'approve', error: msg(appr.error), recoverable: false };
      }
    }
  }

  // 3) Swap (all-in-one: createIntent → relay → solver execute)
  onPhase({ phase: 'swapping' });
  const res = await sodax.swaps.swap({ params, walletProvider });
  if (!res.ok) {
    // Funds may have left the source before failure — flag for recovery.
    return { phase: 'failed', failedAt: 'swap', error: msg(res.error), recoverable: true };
  }

  return { phase: 'done', intentHash: res.value.solverExecutionResponse.intent_hash };
}
