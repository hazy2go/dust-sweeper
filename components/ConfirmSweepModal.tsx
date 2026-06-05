'use client';

import { useMemo } from 'react';
import { signaturesFor, type SweepRequest } from '@/lib/engine/execute-one';
import { chainMeta } from '@/lib/sodax/chains';
import { usd } from '@/lib/format';

interface Props {
  requests: SweepRequest[]; // pre-sorted by chain
  outputSymbol: string;
  outputChainLabel: string;
  totals: { value: number; fees: number; net: number };
  demo: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * The honest pre-flight: SODAX has no batching, so each token is its own
 * intent. Spell out exactly how many wallet prompts are coming before the
 * first one appears — surprise prompt #7 is how users rage-quit.
 */
export function ConfirmSweepModal({ requests, outputSymbol, outputChainLabel, totals, demo, onConfirm, onCancel }: Props) {
  const groups = useMemo(() => {
    const out: { chainKey: string; label: string; isEvm: boolean; count: number; sigs: number }[] = [];
    for (const r of requests) {
      const last = out[out.length - 1];
      if (last && last.chainKey === r.srcChainKey) {
        last.count += 1;
        last.sigs += signaturesFor(r);
      } else {
        out.push({
          chainKey: r.srcChainKey,
          label: chainMeta(r.srcChainKey)?.label ?? r.srcChainKey,
          isEvm: r.isEvm,
          count: 1,
          sigs: signaturesFor(r),
        });
      }
    }
    return out;
  }, [requests]);

  const totalSigs = groups.reduce((n, g) => n + g.sigs, 0);
  const evmGroups = groups.filter((g) => g.isEvm).length;
  const switches = Math.max(0, evmGroups - 1); // first EVM group may already be the active network

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <div className="modal__card">
        <h2 id="confirm-title" className="modal__title serif">
          Before you sweep
        </h2>
        <p className="modal__lede">
          {requests.length} token{requests.length === 1 ? '' : 's'} → {outputSymbol} on {outputChainLabel}.
          Each token is swept separately, one wallet prompt at a time.
        </p>

        <div className="modal__plan">
          {groups.map((g, i) => (
            <div key={`${g.chainKey}:${i}`} className="modal__chain">
              <span className="modal__chainname">{g.label}</span>
              <span className="modal__chaindetail">
                {g.count} token{g.count === 1 ? '' : 's'} · up to {g.sigs} signature{g.sigs === 1 ? '' : 's'}
              </span>
            </div>
          ))}
        </div>

        <p className="modal__sigs">
          Up to <b>{totalSigs}</b> wallet signature{totalSigs === 1 ? '' : 's'}
          {switches > 0 && (
            <>
              {' '}
              + <b>{switches}</b> network switch{switches === 1 ? '' : 'es'}
            </>
          )}
          . A failed token never stops the rest.
        </p>

        <div className="modal__nums">
          <span>
            value <b>{usd(totals.value)}</b>
          </span>
          <span>
            fees <b>{usd(totals.fees)}</b>
          </span>
          <span>
            you get <b>≈ {usd(totals.net)}</b>
          </span>
        </div>

        {demo && <p className="modal__demo">Demo — simulated, nothing is signed or sent.</p>}

        <div className="modal__actions">
          <button className="btn" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn btn--primary" onClick={onConfirm}>
            {demo ? 'Run demo sweep' : `Start sweeping — ${requests.length} token${requests.length === 1 ? '' : 's'}`}
          </button>
        </div>
      </div>
    </div>
  );
}
