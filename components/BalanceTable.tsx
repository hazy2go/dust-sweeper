'use client';

import type { EnrichedBalance } from '@/lib/balances/types';
import { chainMeta } from '@/lib/sodax/chains';
import { usd, amt } from '@/lib/format';

interface Props {
  balances: EnrichedBalance[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  showDust: boolean;
  onShowDust: (v: boolean) => void;
}

function Row({
  b,
  checked,
  onToggle,
}: {
  b: EnrichedBalance;
  checked: boolean;
  onToggle: () => void;
}) {
  const net = b.usdValue != null && b.feeUsd ? Math.max(0, b.usdValue - b.feeUsd.total) : null;
  return (
    <label className="brow">
      <input type="checkbox" checked={checked} onChange={onToggle} />
      <span className="brow__sym">{b.symbol}</span>
      <span className="brow__chain">{chainMeta(b.chainKey)?.label ?? b.chainKey}</span>
      <span className="brow__amt">{amt(b.amount)}</span>
      <span className="brow__usd">{usd(b.usdValue)}</span>
      <span className="brow__net">{b.reason === 'unpriced' ? 'price n/a' : net != null ? `≈ ${usd(net)}` : '—'}</span>
    </label>
  );
}

export function BalanceTable({ balances, selected, onToggle, showDust, onShowDust }: Props) {
  const sweepable = balances.filter((b) => b.sweepable);
  const dust = balances.filter((b) => !b.sweepable);

  return (
    <div className="btable">
      <div className="btable__head">
        <span />
        <span>Token</span>
        <span>Chain</span>
        <span>Balance</span>
        <span>Value</span>
        <span>You get</span>
      </div>

      {sweepable.length === 0 && <p className="btable__empty">No consolidatable balances found.</p>}
      {sweepable.map((b) => (
        <Row key={b.id} b={b} checked={selected.has(b.id)} onToggle={() => onToggle(b.id)} />
      ))}

      {dust.length > 0 && (
        <div className="btable__dust">
          <button className="btable__dusttoggle" onClick={() => onShowDust(!showDust)}>
            {showDust ? '▾' : '▸'} {dust.length} below-threshold {dust.length === 1 ? 'balance' : 'balances'}{' '}
            <span>(fees would eat most of the value)</span>
          </button>
          {showDust &&
            dust.map((b) => (
              <Row key={b.id} b={b} checked={selected.has(b.id)} onToggle={() => onToggle(b.id)} />
            ))}
        </div>
      )}
    </div>
  );
}
