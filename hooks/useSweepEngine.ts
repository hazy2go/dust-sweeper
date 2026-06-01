'use client';

import { useCallback } from 'react';
import { useSodaxContext } from '@sodax/dapp-kit';
import { useWalletProvider } from '@sodax/wallet-sdk-react';
import { useSweepQueue } from '@/lib/engine/queue';
import type { SweepRequest } from '@/lib/engine/execute-one';

/**
 * Wires the sequential sweep queue to the live Sodax instance and the
 * connected wallet providers (one EVM provider for all EVM chains, one Solana).
 */
export function useSweepEngine() {
  const { sodax } = useSodaxContext();
  const evmProvider = useWalletProvider({ xChainType: 'EVM' });
  const solProvider = useWalletProvider({ xChainType: 'SOLANA' });
  const { statuses, running, current, init, run, runDemo, reset } = useSweepQueue();

  const start = useCallback(
    (reqs: SweepRequest[]) => {
      init(reqs);
      const resolveProvider = (req: SweepRequest) => (req.isEvm ? evmProvider : solProvider);
      void run(sodax, resolveProvider, reqs);
    },
    [sodax, evmProvider, solProvider, init, run],
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
