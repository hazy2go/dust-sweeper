'use client';

import dynamic from 'next/dynamic';
import { AppLoading } from '@/components/AppLoading';

// ssr:false keeps the SODAX SDK + all wallet-chain adapters out of the route's
// first-load JS — the washi shell paints immediately, the dapp streams in.
const SweepApp = dynamic(() => import('./SweepApp'), {
  ssr: false,
  loading: () => <AppLoading label="Preparing the sweeper…" />,
});

export default function SweepPage() {
  return <SweepApp />;
}
