'use client';

import { useEnabledChainTypes } from '@sodax/wallet-sdk-react';
import { AppLoading } from '@/components/AppLoading';

/**
 * Holds the dapp UI for the single render before SodaxWalletProvider's init
 * effect populates the chain store. Without this gate, wallet hooks read the
 * store too early and the SDK logs `chain "EVM" is not enabled` console
 * warnings on every load.
 */
export function WalletsReady({ children }: { children: React.ReactNode }) {
  const enabled = useEnabledChainTypes();
  if (enabled.length === 0) return <AppLoading label="Connecting the chains…" />;
  return <>{children}</>;
}
