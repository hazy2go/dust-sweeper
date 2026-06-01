import { create } from 'zustand';
import type { Sodax } from '@sodax/sdk';
import { executeOne, type SweepRequest, type Patch } from './execute-one';
import type { TokenSweepState } from './state-machine';
import { markInflight, clearInflight } from './persistence';

/** Resolves the SDK wallet provider for a given sweep (by source-chain family). */
export type ProviderResolver = (req: SweepRequest) => unknown;

interface QueueState {
  statuses: Record<string, TokenSweepState>;
  running: boolean;
  current?: string;
  /** Seed idle statuses for a planned batch. */
  init: (reqs: SweepRequest[]) => void;
  /** Run the batch sequentially (one wallet prompt at a time). */
  run: (sodax: Sodax, resolveProvider: ProviderResolver, reqs: SweepRequest[]) => Promise<void>;
  reset: () => void;
}

export const useSweepQueue = create<QueueState>((set, get) => {
  const patch = (id: string, p: Patch) =>
    set((s) => ({ statuses: { ...s.statuses, [id]: { ...s.statuses[id], ...p } } }));

  return {
    statuses: {},
    running: false,
    current: undefined,

    init: (reqs) =>
      set({
        statuses: Object.fromEntries(
          reqs.map((r) => [r.id, { id: r.id, chainKey: r.srcChainKey, symbol: r.symbol, phase: 'idle' as const }]),
        ),
      }),

    run: async (sodax, resolveProvider, reqs) => {
      if (get().running) return;
      set({ running: true });

      for (const req of reqs) {
        set({ current: req.id });
        const provider = resolveProvider(req);
        if (!provider) {
          patch(req.id, {
            phase: 'failed',
            failedAt: 'wallet',
            error: 'No connected wallet for this chain',
            recoverable: false,
          });
          continue; // one token's failure never aborts the batch
        }

        markInflight(req.srcAddress, {
          id: req.id,
          srcChainKey: req.srcChainKey,
          srcAddress: req.srcAddress,
          symbol: req.symbol,
          ts: Date.now(),
        });

        try {
          const final = await executeOne(
            sodax,
            provider,
            req,
            (pp) => patch(req.id, pp),
            Math.floor(Date.now() / 1000),
          );
          patch(req.id, final);
          if (final.phase === 'done') clearInflight(req.srcAddress, req.id);
        } catch (e: any) {
          patch(req.id, {
            phase: 'failed',
            failedAt: 'unexpected',
            error: e?.message ?? String(e),
            recoverable: true,
          });
        }
      }

      set({ running: false, current: undefined });
    },

    reset: () => set({ statuses: {}, running: false, current: undefined }),
  };
});
