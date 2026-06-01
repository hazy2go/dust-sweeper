'use client';

import { useQuery } from '@tanstack/react-query';
import { useSodaxContext } from '@sodax/dapp-kit';
import { PARTNER_SONIC_ADDRESS } from '@/lib/config';

const ZERO = '0x0000000000000000000000000000000000000000';

export function usePartnerFees() {
  const { sodax } = useSodaxContext();
  return useQuery({
    queryKey: ['partner-fees', PARTNER_SONIC_ADDRESS],
    enabled: PARTNER_SONIC_ADDRESS.toLowerCase() !== ZERO,
    queryFn: async () => {
      const r = await sodax.partners.feeClaim.fetchAssetsBalances(PARTNER_SONIC_ADDRESS);
      if (!r.ok) throw new Error(String((r.error as any)?.message ?? 'Failed to fetch fee balances'));
      return Array.from(r.value.values());
    },
  });
}
