import { describe, it, expect } from 'vitest';
import { classify, feeBreakdownUsd } from '@/lib/balances/viability';
import { tokenKey } from '@/lib/sodax/swap-tokens';
import { tokenId, isTerminal } from '@/lib/engine/state-machine';
import { VIABILITY_SAFETY_MARGIN, HARD_DUST_FLOOR_USD } from '@/lib/config';

describe('viability.classify', () => {
  it('never sweeps unsupported tokens', () => {
    expect(classify(false, 100, 0.25)).toMatchObject({ reason: 'not-supported', sweepable: false });
  });

  it('offers supported-but-unpriced tokens (user decides)', () => {
    expect(classify(true, null, 0.25)).toMatchObject({ reason: 'unpriced', sweepable: true });
  });

  it('hides value below the hard dust floor', () => {
    const r = classify(true, HARD_DUST_FLOOR_USD / 2, 0.25);
    expect(r.reason).toBe('dust');
    expect(r.sweepable).toBe(false);
  });

  it('hides value not exceeding fees * safety margin', () => {
    // flat 0.25, margin 2: threshold ~ value <= (0.0025*value + 0.25)*2 ≈ 0.5
    expect(classify(true, 0.5, 0.25).sweepable).toBe(false);
    expect(classify(true, 0.5, 0.25).reason).toBe('dust');
  });

  it('sweeps value comfortably above fees', () => {
    const r = classify(true, 100, 0.25);
    expect(r.reason).toBe('ok');
    expect(r.sweepable).toBe(true);
    expect(r.feeUsd!.total).toBeGreaterThan(0);
    // 100 well above the ~0.5 threshold and the safety margin
    expect(100).toBeGreaterThan(r.feeUsd!.total * VIABILITY_SAFETY_MARGIN);
  });
});

describe('fee breakdown', () => {
  it('sums solver + partner + flat', () => {
    const f = feeBreakdownUsd(1000, 0.5);
    // solver 0.1% = 1, partner 0.15% = 1.5, flat 0.5
    expect(f.solver).toBeCloseTo(1, 6);
    expect(f.partner).toBeCloseTo(1.5, 6);
    expect(f.flat).toBe(0.5);
    expect(f.total).toBeCloseTo(3, 6);
  });
});

describe('keys', () => {
  it('tokenKey lowercases address and joins with chain', () => {
    expect(tokenKey('0x2105.base', '0xABCdef')).toBe('0x2105.base:0xabcdef');
  });
  it('tokenId matches the discovery id format', () => {
    expect(tokenId('solana', 'So1ABC')).toBe('solana:so1abc');
  });
});

describe('state machine', () => {
  it('marks done/failed as terminal', () => {
    expect(isTerminal('done')).toBe(true);
    expect(isTerminal('failed')).toBe(true);
    expect(isTerminal('swapping')).toBe(false);
  });
});
