'use client';

import dynamic from 'next/dynamic';
import { AppLoading } from '@/components/AppLoading';

// Same dynamic-island pattern as /sweep — see app/sweep/page.tsx.
const FeesApp = dynamic(() => import('./FeesApp'), {
  ssr: false,
  loading: () => <AppLoading label="Opening fees & recovery…" />,
});

export default function FeesPage() {
  return <FeesApp />;
}
