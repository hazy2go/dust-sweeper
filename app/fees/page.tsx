'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatUnits } from 'viem';
import { useXAccount, useWalletProvider } from '@sodax/wallet-sdk-react';
import { useSodaxContext } from '@sodax/dapp-kit';
import { usePartnerFees } from '@/hooks/usePartnerFees';
import { useRecoveryBalances, type RecoveryItem } from '@/hooks/useRecovery';
import { ConnectBar } from '@/components/ConnectBar';
import { chainMeta } from '@/lib/sodax/chains';
import { PARTNER_SONIC_ADDRESS } from '@/lib/config';
import { amt, shorten } from '@/lib/format';

const ZERO = '0x0000000000000000000000000000000000000000';

export default function FeesPage() {
  const evm = useXAccount({ xChainType: 'EVM' });
  const sol = useXAccount({ xChainType: 'SOLANA' });
  const { sodax } = useSodaxContext();
  const evmProvider = useWalletProvider({ xChainType: 'EVM' });
  const solProvider = useWalletProvider({ xChainType: 'SOLANA' });

  const fees = usePartnerFees();
  const recovery = useRecoveryBalances(evm?.address, sol?.address);
  const [pending, setPending] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  async function withdraw(item: RecoveryItem) {
    const isSolana = chainMeta(item.chainKey)?.family === 'SOLANA';
    const provider = isSolana ? solProvider : evmProvider;
    if (!provider) {
      setNote('Connect the wallet for this chain first.');
      return;
    }
    const id = `${item.chainKey}:${item.bal.spokeTokenAddress}`;
    setPending(id);
    setNote(null);
    try {
      const r = await sodax.recovery.withdrawHubAsset({
        params: {
          srcChainKey: item.chainKey,
          srcAddress: item.srcAddress,
          token: item.bal.spokeTokenAddress,
          amount: item.bal.balance,
        },
        walletProvider: provider as any,
      });
      if (!r.ok) throw new Error(String((r.error as any)?.message ?? 'Withdraw failed'));
      setNote(`Withdrew ${item.bal.symbol} back to your wallet.`);
      void recovery.refetch();
    } catch (e: any) {
      setNote(e?.message ?? 'Withdraw failed');
    } finally {
      setPending(null);
    }
  }

  return (
    <main className="sweep">
      <header className="sweep__top">
        <Link href="/sweep" className="sweep__brand serif">
          <span className="seal seal--sm">掃</span> ← Just Sweep It
        </Link>
        <span className="sweep__feeslink">Fees & recovery</span>
      </header>

      <section>
        <h2 className="fees__h serif">Partner fees accrued</h2>
        <p className="fees__sub">
          Earned as wrapped assets on the Sonic hub for{' '}
          <code>{shorten(PARTNER_SONIC_ADDRESS)}</code>.
        </p>
        {PARTNER_SONIC_ADDRESS.toLowerCase() === ZERO && (
          <p className="sweep__warn">Set NEXT_PUBLIC_PARTNER_SONIC_ADDRESS to track earnings.</p>
        )}
        {fees.isLoading && <p className="fees__sub">Loading…</p>}
        {fees.isError && <p className="sweep__err">{(fees.error as Error).message}</p>}
        {fees.data && fees.data.length === 0 && <p className="fees__sub">No fees accrued yet.</p>}
        {fees.data && fees.data.length > 0 && (
          <div className="btable">
            {fees.data.map((f) => (
              <div key={f.address} className="frow">
                <span className="brow__sym">{f.symbol}</span>
                <span className="brow__amt">{amt(Number(formatUnits(f.balance, f.decimal)))}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="fees__h serif">Recovery</h2>
        <p className="fees__sub">
          Balances that reached the hub but weren’t delivered. Withdraw them back to your own wallet.
        </p>
        <ConnectBar />
        {note && <p className="fees__note">{note}</p>}
        {recovery.isLoading && <p className="fees__sub">Scanning hub…</p>}
        {recovery.data && recovery.data.length === 0 && (
          <p className="fees__sub">Nothing stuck — all clear.</p>
        )}
        {recovery.data && recovery.data.length > 0 && (
          <div className="btable">
            {recovery.data.map((item) => {
              const id = `${item.chainKey}:${item.bal.spokeTokenAddress}`;
              return (
                <div key={id} className="frow frow--rec">
                  <span className="brow__sym">{item.bal.symbol}</span>
                  <span className="brow__chain">{chainMeta(item.chainKey)?.label ?? item.chainKey}</span>
                  <span className="brow__amt">{amt(Number(formatUnits(item.bal.balance, item.bal.decimal)))}</span>
                  <button className="btn" disabled={pending === id} onClick={() => withdraw(item)}>
                    {pending === id ? 'Withdrawing…' : 'Withdraw'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
