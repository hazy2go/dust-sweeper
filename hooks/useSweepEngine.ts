'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useSodaxContext } from '@sodax/dapp-kit';
import { useWalletProvider, getXService } from '@sodax/wallet-sdk-react';
import { useSweepQueue } from '@/lib/engine/queue';
import type { SweepRequest } from '@/lib/engine/execute-one';
import { chainMeta } from '@/lib/sodax/chains';

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** How long to wait for the wallet provider to rebind after a network switch. */
const REBIND_TIMEOUT_MS = 5_000;
const REBIND_POLL_MS = 150;

/**
 * Reads the wallet's current EVM chain id and the active wagmi connector from
 * the wallet SDK's EvmXService. Typed loosely at this single boundary — the
 * SDK exposes `wagmiConfig` as a public field but doesn't re-export its type.
 */
function currentEvmConnection(): { chainId?: number; connector?: any } {
  const svc = getXService('EVM') as any;
  const cfg = svc?.wagmiConfig;
  const currentId: string | null | undefined = cfg?.state?.current;
  const conn = currentId ? cfg?.state?.connections?.get?.(currentId) : undefined;
  return { chainId: conn?.chainId, connector: conn?.connector };
}

/**
 * Wires the sequential sweep queue to the live Sodax instance and the
 * connected wallet providers (one EVM provider for all EVM chains, one Solana).
 *
 * Providers are read through refs at execution time: after a network switch
 * wagmi swaps wallet clients and the SDK re-instantiates the EVM provider, so
 * a value captured at start() would go stale mid-batch.
 */
export function useSweepEngine() {
  const { sodax } = useSodaxContext();
  const evmProvider = useWalletProvider({ xChainType: 'EVM' });
  const solProvider = useWalletProvider({ xChainType: 'SOLANA' });
  const { statuses, running, current, init, run, runDemo, reset } = useSweepQueue();

  const evmRef = useRef(evmProvider);
  const solRef = useRef(solProvider);
  useEffect(() => {
    evmRef.current = evmProvider;
    solRef.current = solProvider;
  }, [evmProvider, solProvider]);

  /** Prompt the wallet to switch networks when the next sweep is on a different EVM chain. */
  const ensureChain = useCallback(async (req: SweepRequest, onSwitching: () => void) => {
    if (!req.isEvm) return; // Solana: single network
    const target = chainMeta(req.srcChainKey)?.evmChainId;
    if (!target) return;
    const { chainId, connector } = currentEvmConnection();
    if (chainId === target || !connector?.switchChain) return;

    onSwitching();
    const staleProvider = evmRef.current;
    await connector.switchChain({ chainId: target }); // rejects if the user declines

    // Wait for the SDK to rebind the EVM provider to the new chain's client.
    const deadline = Date.now() + REBIND_TIMEOUT_MS;
    while (Date.now() < deadline) {
      if (evmRef.current && evmRef.current !== staleProvider) return;
      await sleep(REBIND_POLL_MS);
    }
    // Timed out — proceed with whatever provider is current; executeOne will
    // surface a chain-mismatch error if the rebind genuinely never happened.
  }, []);

  const start = useCallback(
    (reqs: SweepRequest[]) => {
      init(reqs);
      const resolveProvider = (req: SweepRequest) => (req.isEvm ? evmRef.current : solRef.current);
      void run(sodax, resolveProvider, ensureChain, reqs);
    },
    [sodax, init, run, ensureChain],
  );

  const startDemo = useCallback(
    (reqs: SweepRequest[]) => {
      init(reqs);
      void runDemo(reqs);
    },
    [init, runDemo],
  );

  return { statuses, running, current, start, startDemo, reset };
}
