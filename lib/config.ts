import type { PartnerFee } from '@sodax/sdk';

/**
 * Partner fee recipient — an address you control on the Sonic hub (EVM).
 * Fees accrue here as wrapped ERC-20 and are claimed via sodax.partners.feeClaim.
 * Falls back to the zero address in dev so quotes still work; set the real one in env.
 */
export const PARTNER_SONIC_ADDRESS = (process.env.NEXT_PUBLIC_PARTNER_SONIC_ADDRESS ??
  '0x0000000000000000000000000000000000000000') as `0x${string}`;

/** 15 basis points = 0.15%. SDK hard cap is 100 (1%). Confirmed via scripts/phase0-fee-assert.ts. */
export const PARTNER_FEE: PartnerFee = {
  address: PARTNER_SONIC_ADDRESS,
  percentage: 15,
};

/** Fixed SODAX solver fee, informational (the SDK computes it via swaps.getSolverFee). */
export const SOLVER_FEE_BPS = 10; // 0.1%

/** Max slippage applied to the solver's quoted output when building minOutputAmount. */
export const SLIPPAGE_BPS = 50n; // 0.5%

/** A sweep is only offered when token value > total fees * this margin. */
export const VIABILITY_SAFETY_MARGIN = 2;

/** Default consolidation target. */
export const DEFAULT_OUTPUT_SYMBOL = 'USDC';

/** Hide anything worth less than this outright (hard dust floor, USD). */
export const HARD_DUST_FLOOR_USD = 0.05;
