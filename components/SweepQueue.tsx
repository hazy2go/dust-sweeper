'use client';

import type { TokenSweepState, SweepPhase } from '@/lib/engine/state-machine';
import { chainMeta } from '@/lib/sodax/chains';

const PHASE_LABEL: Record<SweepPhase, string> = {
  idle: 'Queued',
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

  return (
    <div className="sq">
      <div className="sq__head">
        Sweeping — {done} of {rows.length} complete
      </div>
      {rows.map((r) => (
        <div key={r.id} className={`sq__row sq__row--${r.phase}`}>
          <Glyph phase={r.phase} />
          <span className="sq__sym">{r.symbol}</span>
          <span className="sq__chain">{chainMeta(r.chainKey)?.label ?? r.chainKey}</span>
          <span className="sq__status">
            {PHASE_LABEL[r.phase]}
            {r.phase === 'failed' && r.error ? ` — ${r.error}` : ''}
            {r.phase === 'failed' && r.recoverable ? ' · funds may be recoverable on the Fees page' : ''}
          </span>
        </div>
      ))}
    </div>
  );
}
