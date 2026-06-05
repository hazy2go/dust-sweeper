/**
 * Crash-safe record of sweeps that were started. Written before the swap
 * call and cleared on success. If a swap errors after funds left the source
 * (e.g. they reach the Sonic hub but the intent never fills), the record
 * tells the UI to offer the SDK-native recovery path (withdrawHubAsset).
 * Holds only non-sensitive identifiers — never keys.
 */
export interface InflightRecord {
  id: string;
  srcChainKey: string;
  srcAddress: string;
  symbol: string;
  ts: number;
  intentHash?: string;
}

const key = (owner: string) => `justsweep:inflight:${owner.toLowerCase()}`;

function read(owner: string): InflightRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(window.localStorage.getItem(key(owner)) ?? '[]');
  } catch {
    return [];
  }
}

function write(owner: string, records: InflightRecord[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key(owner), JSON.stringify(records));
  } catch {
    /* storage unavailable — non-fatal */
  }
}

export function listInflight(owner: string): InflightRecord[] {
  return read(owner);
}

export function markInflight(owner: string, rec: InflightRecord) {
  const records = read(owner).filter((r) => r.id !== rec.id);
  records.push(rec);
  write(owner, records);
}

export function clearInflight(owner: string, id: string) {
  write(
    owner,
    read(owner).filter((r) => r.id !== id),
  );
}

/** Drop every marker for an owner — used after the hub scan confirms nothing is stuck. */
export function clearAllInflight(owner: string) {
  write(owner, []);
}
