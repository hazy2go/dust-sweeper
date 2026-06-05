'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { listInflight, clearAllInflight, type InflightRecord } from '@/lib/engine/persistence';
import { useRecoveryBalances } from '@/hooks/useRecovery';

/**
 * Local "sweep may not have completed" markers are written before each swap
 * and cleared when the browser sees success — but a relay that fills *after*
 * the browser stops polling leaves stale markers behind. So the banner
 * cross-checks the hub: if the live scan finds nothing stranded, it says so
 * and offers a dismiss instead of crying wolf forever.
 */
export function RecoveryBanner({ addresses }: { addresses: (string | undefined)[] }) {
  const [records, setRecords] = useState<InflightRecord[]>([]);
  const [evmAddress, solAddress] = addresses;
  const hub = useRecoveryBalances(evmAddress, solAddress);

  useEffect(() => {
    const all: InflightRecord[] = [];
    for (const a of addresses) {
      if (a) all.push(...listInflight(a));
    }
    setRecords(all);
  }, [addresses.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!records.length) return null;

  const hubClear = hub.isSuccess && hub.data.length === 0;

  const dismiss = () => {
    for (const a of addresses) {
      if (a) clearAllInflight(a);
    }
    setRecords([]);
  };

  if (hubClear) {
    return (
      <div className="recover recover--ok" role="status">
        <strong>{records.length}</strong> earlier{' '}
        {records.length === 1 ? 'sweep' : 'sweeps'} finished after this page stopped watching — the hub
        shows nothing stuck, so the funds were delivered.{' '}
        <button className="recover__dismiss" onClick={dismiss}>
          Got it, dismiss
        </button>
      </div>
    );
  }

  return (
    <div className="recover" role="status">
      <strong>{records.length}</strong> earlier{' '}
      {records.length === 1 ? 'sweep' : 'sweeps'} may not have completed. Funds that reached the hub can be
      withdrawn back to your wallet.{' '}
      <Link href="/fees" className="recover__link">
        Open recovery →
      </Link>
    </div>
  );
}
