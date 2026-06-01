'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useXAccount } from '@sodax/wallet-sdk-react';
import { useSodaxContext } from '@sodax/dapp-kit';
import { ChainKeys, type SpokeChainKey } from '@sodax/sdk';
import { ConnectBar } from '@/components/ConnectBar';
import { BalanceTable } from '@/components/BalanceTable';
import { OutputSelector, type OutputChoice } from '@/components/OutputSelector';
import { SweepQueue } from '@/components/SweepQueue';
import { RecoveryBanner } from '@/components/RecoveryBanner';
import { useDiscoverBalances } from '@/hooks/useDiscoverBalances';
import { useSweepEngine } from '@/hooks/useSweepEngine';
import type { SweepRequest } from '@/lib/engine/execute-one';
import { chainMeta } from '@/lib/sodax/chains';
import { usd } from '@/lib/format';

export default function SweepPage() {
  const evm = useXAccount({ xChainType: 'EVM' });
  const sol = useXAccount({ xChainType: 'SOLANA' });
  const evmAddress = evm?.address;
  const solAddress = sol?.address;
  const connected = Boolean(evmAddress || solAddress);

  const { sodax } = useSodaxContext();
  const discovery = useDiscoverBalances(evmAddress, solAddress);
  const engine = useSweepEngine();

  const defaultOutput = useMemo<OutputChoice>(() => {
    const base = ChainKeys.BASE_MAINNET;
    let toks: readonly { address: string; symbol: string }[] = [];
    try {
      toks = sodax.config.getSupportedSwapTokensByChainId(base);
    } catch {
      toks = [];
    }
    const usdc = toks.find((t) => t.symbol.toUpperCase() === 'USDC') ?? toks[0];
    return { chainKey: base, tokenAddress: usdc?.address ?? '', tokenSymbol: usdc?.symbol ?? 'USDC' };
  }, [sodax]);

  const [output, setOutput] = useState<OutputChoice>(defaultOutput);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showDust, setShowDust] = useState(false);

  const balances = discovery.data?.balances ?? [];

  useEffect(() => {
    if (discovery.data) {
      setSelected(new Set(discovery.data.balances.filter((b) => b.sweepable).map((b) => b.id)));
    }
  }, [discovery.data]);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const requests = useMemo<SweepRequest[]>(() => {
    const outMeta = chainMeta(output.chainKey);
    const dstAddress = outMeta?.family === 'SOLANA' ? solAddress : evmAddress;
    if (!dstAddress || !output.tokenAddress) return [];
    const out: SweepRequest[] = [];
    for (const b of balances) {
      if (!selected.has(b.id)) continue;
      const meta = chainMeta(b.chainKey);
      const isEvm = meta?.family === 'EVM';
      const srcAddress = isEvm ? evmAddress : solAddress;
      if (!srcAddress) continue;
      out.push({
        id: b.id,
        symbol: b.symbol,
        inputToken: b.address,
        srcChainKey: b.chainKey as SpokeChainKey,
        srcAddress,
        outputToken: output.tokenAddress,
        dstChainKey: output.chainKey,
        dstAddress,
        rawAmount: BigInt(b.rawAmount),
        isEvm,
      });
    }
    return out;
  }, [balances, selected, output, evmAddress, solAddress]);

  const totals = useMemo(() => {
    const picked = balances.filter((b) => selected.has(b.id));
    const value = picked.reduce((s, b) => s + (b.usdValue ?? 0), 0);
    const fees = picked.reduce((s, b) => s + (b.feeUsd?.total ?? 0), 0);
    const signatures = requests.reduce((n, r) => n + (r.isEvm ? 2 : 1), 0);
    return { value, fees, net: Math.max(0, value - fees), signatures, count: requests.length };
  }, [balances, selected, requests]);

  const executing = Object.keys(engine.statuses).length > 0;

  return (
    <main className="sweep">
      <header className="sweep__top">
        <Link href="/" className="sweep__brand serif">
          Just Sweep It
        </Link>
        <Link href="/fees" className="sweep__feeslink">
          Fees & recovery →
        </Link>
      </header>

      <RecoveryBanner addresses={[evmAddress, solAddress]} />

      <section className="sweep__connect">
        <ConnectBar />
      </section>

      {!connected && (
        <p className="sweep__hint">Connect an EVM and/or Solana wallet to scan for consolidatable balances.</p>
      )}

      {connected && !executing && (
        <>
          <div className="sweep__scanbar">
            <button className="btn" onClick={() => discovery.refetch()} disabled={discovery.isFetching}>
              {discovery.isFetching ? 'Scanning…' : discovery.data ? 'Rescan' : 'Scan wallets'}
            </button>
            <OutputSelector value={output} onChange={setOutput} />
          </div>

          {discovery.isError && <p className="sweep__err">{(discovery.error as Error).message}</p>}

          {discovery.data && discovery.data.errors.length > 0 && (
            <p className="sweep__warn">
              Some chains couldn’t be scanned: {discovery.data.errors.map((e) => e.chainKey).join(', ')}
            </p>
          )}

          {discovery.data && (
            <>
              <BalanceTable
                balances={balances}
                selected={selected}
                onToggle={toggle}
                showDust={showDust}
                onShowDust={setShowDust}
              />

              <div className="summary">
                <div className="summary__nums">
                  <span>
                    <b>{totals.count}</b> selected
                  </span>
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
                <p className="summary__sigs">
                  Up to <b>{totals.signatures}</b> wallet signatures — one token at a time, in sequence.
                </p>
                <button
                  className="btn btn--primary"
                  disabled={requests.length === 0 || engine.running}
                  onClick={() => engine.start(requests)}
                >
                  Sweep {totals.count} into {output.tokenSymbol} →
                </button>
              </div>
            </>
          )}
        </>
      )}

      {executing && (
        <>
          <SweepQueue statuses={engine.statuses} />
          {!engine.running && (
            <button
              className="btn"
              onClick={() => {
                engine.reset();
                discovery.refetch();
              }}
            >
              Done — scan again
            </button>
          )}
        </>
      )}
    </main>
  );
}
