'use client';

import Link from 'next/link';

/** Instant-paint shell shown while the dapp island (SDK + wallet stacks) streams in. */
export function AppLoading({ label }: { label: string }) {
  return (
    <main className="sweep">
      <header className="sweep__top">
        <Link href="/" className="sweep__brand serif">
          <span className="seal seal--sm">掃</span> Just Sweep It
        </Link>
      </header>
      <div className="sweep__hintbox">
        <p className="sweep__hint">
          <span className="sq__spin" aria-hidden /> {label}
        </p>
      </div>
    </main>
  );
}
