import { create } from 'zustand';
import type { Sodax } from '@sodax/sdk';
import { executeOne, type SweepRequest, type Patch } from './execute-one';
import type { TokenSweepState } from './state-machine';
import { markInflight, clearInflight } from './persistence';

/**
 * Resolves the SDK wallet provider for a given sweep (by source-chain family).
 * Async: after a page reload the SDK restores the connected *address* before it
 * finishes rebuilding the signing client, so the resolver may need to wait for
 * the provider to appear instead of failing the whole batch instantly.
 */
export type ProviderResolver = (req: SweepRequest) => Promise<unknown> | unknown;

/**
 * Ensures the wallet is on the request's source network before executing.
 * Calls `onSwitching` only when an actual switch is prompted; throws if the
 * user declines. No-op for Solana (single network).
 */
export type ChainEnsurer = (req: SweepRequest, onSwitching: () => void) => Promise<void>;

interface QueueState {
  statuses: Record<string, TokenSweepState>;
  running: boolean;
  current?: string;
  /** Seed idle statuses for a planned batch. */
  init: (reqs: SweepRequest[]) => void;
  /** Run the batch sequentially (one wallet prompt at a time). */
  run: (sodax: Sodax, resolveProvider: ProviderResolver, ensureChain: ChainEnsurer, reqs: SweepRequest[]) => Promise<void>;
  /** Simulated run for Demo mode — no real transactions. */
  runDemo: (reqs: SweepRequest[]) => Promise<void>;
  reset: () => void;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

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

    run: async (sodax, resolveProvider, ensureChain, reqs) => {
      if (get().running) return;
      set({ running: true });

      for (const req of reqs) {
        set({ current: req.id });

        // Get the wallet on the right network first — the provider instance
        // rebinds after a switch, so it must be resolved *after* this.
        try {
          await ensureChain(req, () => patch(req.id, { phase: 'switching' }));
        } catch (e: any) {
          patch(req.id, {
            phase: 'failed',
            failedAt: 'network-switch',
            error: e?.message ?? 'Network switch was declined',
            recoverable: false,
          });
          continue;
        }

        const provider = await resolveProvider(req);
        if (!provider) {
          patch(req.id, {
            phase: 'failed',
            failedAt: 'wallet',
            error: `${req.isEvm ? 'EVM' : 'Solana'} wallet not ready — reconnect it and retry`,
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

    runDemo: async (reqs) => {
      if (get().running) return;
      set({ running: true });
      let demoChain: string | undefined;
      for (const req of reqs) {
        set({ current: req.id });
        if (req.isEvm && req.srcChainKey !== demoChain) {
          patch(req.id, { phase: 'switching' });
          await sleep(550);
        }
        demoChain = req.srcChainKey;
        patch(req.id, { phase: 'quoting' });
        await sleep(450);
        if (req.isEvm) {
          patch(req.id, { phase: 'approving' });
          await sleep(450);
        }
        patch(req.id, { phase: 'swapping' });
        await sleep(650);
        patch(req.id, { phase: 'done', intentHash: '0xDEMO' });
      }
      set({ running: false, current: undefined });
    },

    reset: () => set({ statuses: {}, running: false, current: undefined }),
  };
});
