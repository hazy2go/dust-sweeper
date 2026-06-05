import { describe, it, expect } from 'vitest';
import { classify, feeBreakdownUsd } from '@/lib/balances/viability';
import { tokenKey } from '@/lib/sodax/swap-tokens';
import { tokenId, isTerminal } from '@/lib/engine/state-machine';
import { signaturesFor } from '@/lib/engine/execute-one';
import { chainOrderIndex } from '@/lib/sodax/chains';
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

describe('signature planning', () => {
  it('EVM ERC-20 needs up to 2 signatures (approve + swap)', () => {
    expect(signaturesFor({ isEvm: true, inputToken: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' })).toBe(2);
  });
  it('EVM native needs 1 (no approval)', () => {
    expect(signaturesFor({ isEvm: true, inputToken: '0x0000000000000000000000000000000000000000' })).toBe(1);
  });
  it('Solana needs 1', () => {
    expect(signaturesFor({ isEvm: false, inputToken: 'So11111111111111111111111111111111111111111' })).toBe(1);
  });
});

describe('queue chain ordering', () => {
  it('orders EVM chains in V1 order with Solana last', () => {
    const keys = ['solana', '0x2105.base', 'ethereum', '0xa86a.avax'];
    const sorted = [...keys].sort((a, b) => chainOrderIndex(a) - chainOrderIndex(b));
    expect(sorted).toEqual(['ethereum', '0x2105.base', '0xa86a.avax', 'solana']);
  });
  it('unknown chains sink to the end', () => {
    expect(chainOrderIndex('sui')).toBeGreaterThan(chainOrderIndex('solana'));
  });
});
