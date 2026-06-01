import { SOLVER_FEE_BPS, PARTNER_FEE, VIABILITY_SAFETY_MARGIN, HARD_DUST_FLOOR_USD } from '@/lib/config';
import type { FeeBreakdownUsd, SweepReason } from './types';

const PARTNER_BPS = 'percentage' in PARTNER_FEE ? PARTNER_FEE.percentage : 0;

export function feeBreakdownUsd(valueUsd: number, flatFeeUsd: number): FeeBreakdownUsd {
  const solver = (valueUsd * SOLVER_FEE_BPS) / 10_000;
  const partner = (valueUsd * PARTNER_BPS) / 10_000;
  return { solver, partner, flat: flatFeeUsd, total: solver + partner + flatFeeUsd };
}

export interface Classification {
  reason: SweepReason;
  sweepable: boolean;
  feeUsd?: FeeBreakdownUsd;
}

/**
 * Decide whether a discovered balance should be offered for sweeping.
 * - not supported → never
 * - supported but unpriced → offered, flagged (user decides)
 * - below hard floor or value <= fees*margin → dust (hidden by default, opt-in)
 * - otherwise → sweepable
 */
export function classify(supported: boolean, valueUsd: number | null, flatFeeUsd: number): Classification {
  if (!supported) return { reason: 'not-supported', sweepable: false };
  if (valueUsd == null) return { reason: 'unpriced', sweepable: true };

  const feeUsd = feeBreakdownUsd(valueUsd, flatFeeUsd);
  if (valueUsd < HARD_DUST_FLOOR_USD) return { reason: 'dust', sweepable: false, feeUsd };
  if (valueUsd <= feeUsd.total * VIABILITY_SAFETY_MARGIN) return { reason: 'dust', sweepable: false, feeUsd };
  return { reason: 'ok', sweepable: true, feeUsd };
}
