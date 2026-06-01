'use client';

import { useQuery } from '@tanstack/react-query';
import { useSodaxContext } from '@sodax/dapp-kit';
import type { HubAssetBalance, SpokeChainKey } from '@sodax/sdk';
import { V1_CHAINS } from '@/lib/sodax/chains';

export interface RecoveryItem {
  chainKey: SpokeChainKey;
  srcAddress: string;
  bal: HubAssetBalance;
}

/** Hub-side balances that reached Sonic but were never delivered — recoverable. */
export function useRecoveryBalances(evmAddress?: string, solAddress?: string) {
  const { sodax } = useSodaxContext();
  return useQuery<RecoveryItem[]>({
    queryKey: ['recovery', evmAddress ?? '', solAddress ?? ''],
    enabled: Boolean(evmAddress || solAddress),
    queryFn: async () => {
      const out: RecoveryItem[] = [];
      await Promise.all(
        V1_CHAINS.map(async (c) => {
          const srcAddress = c.family === 'SOLANA' ? solAddress : evmAddress;
          if (!srcAddress) return;
          try {
            const r = await sodax.recovery.fetchHubAssetBalances({ chainKey: c.key, srcAddress });
            if (r.ok) {
              for (const bal of r.value) {
                if (bal.balance > 0n) out.push({ chainKey: c.key, srcAddress, bal });
              }
            }
          } catch {
            /* skip chain on error */
          }
        }),
      );
      return out;
    },
  });
}
