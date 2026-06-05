'use client';

import type { TokenSweepState, SweepPhase } from '@/lib/engine/state-machine';
import { chainMeta } from '@/lib/sodax/chains';

const PHASE_LABEL: Record<SweepPhase, string> = {
  idle: 'Queued',
  switching: 'Switching network…',
  quoting: 'Quoting…',
  approving: 'Approving…',
  swapping: 'Sweeping…',
  done: 'Swept',
  failed: 'Failed',
};

function Glyph({ phase }: { phase: SweepPhase }) {
  if (phase === 'done') return <span className="sq__ok">✓</span>;
  if (phase === 'failed') return <span className="sq__bad">✕</span>;
  if (phase === 'idle') return <span className="sq__idle">·</span>;
  return <span className="sq__spin" aria-hidden />;
}

export function SweepQueue({ statuses }: { statuses: Record<string, TokenSweepState> }) {
  const rows = Object.values(statuses);
  if (!rows.length) return null;

  const done = rows.filter((r) => r.phase === 'done').length;

  // Rows arrive pre-sorted by chain (the engine groups same-chain sweeps
  // back-to-back) — render a header whenever the chain changes.
  const groups: { chainKey: string; rows: TokenSweepState[] }[] = [];
  for (const r of rows) {
    const last = groups[groups.length - 1];
    if (last && last.chainKey === r.chainKey) last.rows.push(r);
    else groups.push({ chainKey: r.chainKey, rows: [r] });
  }

  return (
    <div className="sq">
      <div className="sq__head">
        Sweeping — {done} of {rows.length} complete
      </div>
      {groups.map((g, gi) => (
        <div key={`${g.chainKey}:${gi}`} className="sq__group">
          <div className="sq__chainhead">{chainMeta(g.chainKey)?.label ?? g.chainKey}</div>
          {g.rows.map((r) => (
            <div key={r.id} className={`sq__row sq__row--${r.phase}`}>
              <Glyph phase={r.phase} />
              <span className="sq__sym">{r.symbol}</span>
              <span className="sq__status">
                {PHASE_LABEL[r.phase]}
                {r.phase === 'failed' && r.error ? ` — ${r.error}` : ''}
                {r.phase === 'failed' && r.recoverable ? ' · funds may be recoverable on the Fees page' : ''}
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
