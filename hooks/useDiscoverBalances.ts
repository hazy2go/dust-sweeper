'use client';

import { useQuery } from '@tanstack/react-query';
import type { DiscoveryResponse } from '@/lib/balances/types';

export function useDiscoverBalances(evmAddress?: string, solanaAddress?: string) {
  return useQuery<DiscoveryResponse>({
    queryKey: ['discover', evmAddress ?? '', solanaAddress ?? ''],
    enabled: Boolean(evmAddress || solanaAddress),
    staleTime: 30_000,
    queryFn: async () => {
      const res = await fetch('/api/discover', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ evmAddress, solanaAddress }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? 'Discovery failed');
      return json as DiscoveryResponse;
    },
  });
}
