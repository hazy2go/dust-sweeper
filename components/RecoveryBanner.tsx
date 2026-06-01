'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { listInflight, type InflightRecord } from '@/lib/engine/persistence';

export function RecoveryBanner({ addresses }: { addresses: (string | undefined)[] }) {
  const [records, setRecords] = useState<InflightRecord[]>([]);

  useEffect(() => {
    const all: InflightRecord[] = [];
    for (const a of addresses) {
      if (a) all.push(...listInflight(a));
    }
    setRecords(all);
  }, [addresses.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!records.length) return null;

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
