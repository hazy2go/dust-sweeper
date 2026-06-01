import { Sodax } from '@sodax/sdk';
import { PARTNER_FEE } from '@/lib/config';

/**
 * Read-only server-side Sodax singleton.
 * Used for quotes and the (synchronous, packaged-default) swap-token config.
 * Carries the partner fee so server quotes reflect the net amount users receive.
 * No wallet/keys here — execution happens client-side with the user's wallet.
 */
let _sodax: Sodax | null = null;

export function getServerSodax(): Sodax {
  if (!_sodax) {
    _sodax = new Sodax({ swaps: { partnerFee: PARTNER_FEE } });
  }
  return _sodax;
}
