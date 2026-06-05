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
import { ConfirmSweepModal } from '@/components/ConfirmSweepModal';
import { useDiscoverBalances } from '@/hooks/useDiscoverBalances';
import { useSweepEngine } from '@/hooks/useSweepEngine';
import { signaturesFor, type SweepRequest } from '@/lib/engine/execute-one';
import { chainMeta, chainOrderIndex } from '@/lib/sodax/chains';
import { DEMO_BALANCES, DEMO_EVM_ADDRESS, DEMO_SOL_ADDRESS } from '@/lib/balances/demo';
import { usd } from '@/lib/format';
import { Providers } from '@/providers/providers';
import { WalletsReady } from '@/components/WalletsReady';

/**
 * The full dapp island — Providers (and with them the entire SODAX SDK +
 * wallet stacks) mount here, dynamically imported by page.tsx with ssr:false,
 * so the route shell paints before the ~2MB of chain adapters arrive.
 */
export default function SweepApp() {
  return (
    <Providers>
      <WalletsReady>
        <SweepView />
      </WalletsReady>
    </Providers>
  );
}

function SweepView() {
  const evm = useXAccount({ xChainType: 'EVM' });
  const sol = useXAccount({ xChainType: 'SOLANA' });
  const evmAddress = evm?.address;
  const solAddress = sol?.address;
  const connected = Boolean(evmAddress || solAddress);

  const { sodax } = useSodaxContext();
  const discovery = useDiscoverBalances(evmAddress, solAddress);
  const engine = useSweepEngine();

  const [demoMode, setDemoMode] = useState(false);
  const [output, setOutput] = useState<OutputChoice>(() => {
    const base = ChainKeys.BASE_MAINNET;
    let toks: readonly { address: string; symbol: string }[] = [];
    try {
      toks = sodax.config.getSupportedSwapTokensByChainId(base);
    } catch {
      toks = [];
    }
    const usdc = toks.find((t) => t.symbol.toUpperCase() === 'USDC') ?? toks[0];
    return { chainKey: base, tokenAddress: usdc?.address ?? '', tokenSymbol: usdc?.symbol ?? 'USDC' };
  });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showDust, setShowDust] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const balances = demoMode ? DEMO_BALANCES : discovery.data?.balances ?? [];
  const hasResults = demoMode || Boolean(discovery.data);

  useEffect(() => {
    const src = demoMode ? DEMO_BALANCES : discovery.data?.balances;
    if (src) setSelected(new Set(src.filter((b) => b.sweepable).map((b) => b.id)));
  }, [demoMode, discovery.data]);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const addrFor = (family?: string) => {
    const isSol = family === 'SOLANA';
    if (demoMode) return isSol ? DEMO_SOL_ADDRESS : DEMO_EVM_ADDRESS;
    return isSol ? solAddress : evmAddress;
  };

  const requests = useMemo<SweepRequest[]>(() => {
    const outMeta = chainMeta(output.chainKey);
    const dstAddress = addrFor(outMeta?.family);
    if (!dstAddress || !output.tokenAddress) return [];
    const out: SweepRequest[] = [];
    for (const b of balances) {
      if (!selected.has(b.id)) continue;
      const meta = chainMeta(b.chainKey);
      const isEvm = meta?.family === 'EVM';
      const srcAddress = addrFor(meta?.family);
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
    // Group same-chain sweeps back-to-back: one network-switch prompt per
    // chain instead of one per token. EVM chains in V1 order, Solana last.
    out.sort((a, b) => chainOrderIndex(a.srcChainKey) - chainOrderIndex(b.srcChainKey));
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [balances, selected, output, evmAddress, solAddress, demoMode]);

  const totals = useMemo(() => {
    const picked = balances.filter((b) => selected.has(b.id));
    const value = picked.reduce((s, b) => s + (b.usdValue ?? 0), 0);
    const fees = picked.reduce((s, b) => s + (b.feeUsd?.total ?? 0), 0);
    const signatures = requests.reduce((n, r) => n + signaturesFor(r), 0);
    return { value, fees, net: Math.max(0, value - fees), signatures, count: requests.length };
  }, [balances, selected, requests]);

  const executing = Object.keys(engine.statuses).length > 0;

  // every wallet family the selected requests actually need has a live signing client
  const walletsReadyForSweep = useMemo(() => {
    const needsEvm = requests.some((r) => r.isEvm);
    const needsSol = requests.some((r) => !r.isEvm);
    return (!needsEvm || engine.evmReady) && (!needsSol || engine.solReady);
  }, [requests, engine.evmReady, engine.solReady]);

  return (
    <main className="sweep">
      <header className="sweep__top">
        <Link href="/" className="sweep__brand serif">
          <span className="seal seal--sm">掃</span> Just Sweep It
        </Link>
        <Link href="/fees" className="sweep__feeslink">
          Fees & recovery →
        </Link>
      </header>

      <RecoveryBanner addresses={[evmAddress, solAddress]} />

      {demoMode && (
        <div className="demo-banner">
          Demo mode — sample balances, simulated sweeps. No wallet, no real transactions.{' '}
          <button
            className="demo-banner__exit"
            onClick={() => {
              setDemoMode(false);
              engine.reset();
            }}
          >
            Exit demo
          </button>
        </div>
      )}

      {!demoMode && (
        <section className="sweep__connect">
          <ConnectBar />
        </section>
      )}

      {!connected && !demoMode && !executing && (
        <div className="sweep__hintbox">
          <p className="sweep__hint">Connect an EVM and/or Solana wallet to scan for consolidatable balances.</p>
          <button className="btn" onClick={() => setDemoMode(true)}>
            Try a demo — no wallet needed
          </button>
        </div>
      )}

      {(connected || demoMode) && !executing && (
        <>
          <div className="sweep__scanbar">
            {!demoMode && (
              <button className="btn" onClick={() => discovery.refetch()} disabled={discovery.isFetching}>
                {discovery.isFetching ? 'Scanning…' : discovery.data ? 'Rescan' : 'Scan wallets'}
              </button>
            )}
            <OutputSelector value={output} onChange={setOutput} />
          </div>

          {!demoMode && discovery.isError && (
            <p className="sweep__err">{(discovery.error as Error).message}</p>
          )}
          {!demoMode && discovery.data && discovery.data.errors.length > 0 && (
            <p className="sweep__warn">
              Some chains couldn’t be scanned: {discovery.data.errors.map((e) => e.chainKey).join(', ')}
            </p>
          )}

          {hasResults && (
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
                {!demoMode && !walletsReadyForSweep && requests.length > 0 && (
                  <p className="sweep__warn">Waking your wallet&rsquo;s signing client… one moment.</p>
                )}
                <button
                  className="btn btn--primary"
                  disabled={requests.length === 0 || engine.running || (!demoMode && !walletsReadyForSweep)}
                  onClick={() => setConfirming(true)}
                >
                  Sweep {totals.count} into {output.tokenSymbol} →
                </button>
              </div>
            </>
          )}
        </>
      )}

      {confirming && (
        <ConfirmSweepModal
          requests={requests}
          outputSymbol={output.tokenSymbol}
          outputChainLabel={chainMeta(output.chainKey)?.label ?? output.chainKey}
          totals={totals}
          demo={demoMode}
          onCancel={() => setConfirming(false)}
          onConfirm={() => {
            setConfirming(false);
            demoMode ? engine.startDemo(requests) : engine.start(requests);
          }}
        />
      )}

      {executing && (
        <>
          <SweepQueue statuses={engine.statuses} />
          {!engine.running && (
            <button
              className="btn"
              onClick={() => {
                engine.reset();
                if (!demoMode) discovery.refetch();
              }}
            >
              Done — {demoMode ? 'run again' : 'scan again'}
            </button>
          )}
        </>
      )}
    </main>
  );
}
