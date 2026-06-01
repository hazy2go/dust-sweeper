/**
 * Phase 0 spike — confirm the partner-fee unit with zero network/keys.
 * The SDK types document percentage as basis points (100 = 1%, max 100).
 * 15 bps of a 6-decimal 1.0 USDC unit (1_000_000) must equal 1_500.
 * Also sanity-checks the fixed 0.1% solver fee.
 */
import { Sodax } from '@sodax/sdk';

const PARTNER_ADDRESS = '0x0000000000000000000000000000000000000001';

const sodax = new Sodax({
  swaps: { partnerFee: { address: PARTNER_ADDRESS, percentage: 15 } },
});

const ONE_USDC = 1_000_000n; // 6 decimals
const partnerFee = sodax.swaps.getPartnerFee(ONE_USDC);
const solverFee = sodax.swaps.getSolverFee(ONE_USDC);

console.log('input                 :', ONE_USDC.toString());
console.log('getPartnerFee (15 bps):', partnerFee.toString(), '(expect 1500)');
console.log('getSolverFee  (0.1%)  :', solverFee.toString(), '(expect 1000)');

let ok = true;
if (partnerFee !== 1_500n) {
  console.error('✗ FAIL: partner fee is not 15 bps. Re-check the unit before shipping.');
  ok = false;
}
if (solverFee !== 1_000n) {
  console.warn('⚠ NOTE: solver fee != 0.1% of input (' + solverFee.toString() + '); verify assumption.');
}
if (ok) console.log('\n✓ PASS — partner fee = 15 bps (0.15%). Unit confirmed.');
process.exit(ok ? 0 : 1);
