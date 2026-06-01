'use client';

import { useMemo } from 'react';
import { useSodaxContext } from '@sodax/dapp-kit';
import type { SpokeChainKey } from '@sodax/sdk';
import { V1_CHAINS } from '@/lib/sodax/chains';

export interface OutputChoice {
  chainKey: SpokeChainKey;
  tokenAddress: string;
  tokenSymbol: string;
}

interface Props {
  value: OutputChoice;
  onChange: (v: OutputChoice) => void;
}

export function OutputSelector({ value, onChange }: Props) {
  const { sodax } = useSodaxContext();

  const tokens = useMemo(() => {
    try {
      return sodax.config.getSupportedSwapTokensByChainId(value.chainKey);
    } catch {
      return [];
    }
  }, [sodax, value.chainKey]);

  return (
    <div className="outsel">
      <span className="outsel__label">Consolidate into</span>
      <div className="outsel__controls">
        <select
          aria-label="Output token"
          value={value.tokenAddress}
          onChange={(e) => {
            const t = tokens.find((x) => x.address === e.target.value);
            if (t) onChange({ ...value, tokenAddress: t.address, tokenSymbol: t.symbol });
          }}
        >
          {tokens.map((t) => (
            <option key={t.address} value={t.address}>
              {t.symbol}
            </option>
          ))}
        </select>
        <span className="outsel__on">on</span>
        <select
          aria-label="Output chain"
          value={value.chainKey}
          onChange={(e) => {
            const chainKey = e.target.value as SpokeChainKey;
            let next: readonly { address: string; symbol: string }[] = [];
            try {
              next = sodax.config.getSupportedSwapTokensByChainId(chainKey);
            } catch {
              next = [];
            }
            const usdc = next.find((t) => t.symbol.toUpperCase() === 'USDC') ?? next[0];
            onChange({
              chainKey,
              tokenAddress: usdc?.address ?? '',
              tokenSymbol: usdc?.symbol ?? '',
            });
          }}
        >
          {V1_CHAINS.map((c) => (
            <option key={c.key} value={c.key}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
