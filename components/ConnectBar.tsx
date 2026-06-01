'use client';

import { useXConnectors, useXConnect, useXAccount } from '@sodax/wallet-sdk-react';
import type { ChainType } from '@sodax/sdk';

function shorten(addr?: string) {
  if (!addr) return '';
  return addr.length > 12 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;
}

function FamilyConnect({ xChainType, label }: { xChainType: ChainType; label: string }) {
  const connectors = useXConnectors({ xChainType });
  const account = useXAccount({ xChainType });
  const { mutateAsync: connect, isPending } = useXConnect();

  if (account?.address) {
    return (
      <div className="conn conn--on">
        <span className="conn__fam">{label}</span>
        <span className="conn__addr">{shorten(account.address)}</span>
      </div>
    );
  }

  // Prefer installed connectors; fall back to all.
  const installed = connectors.filter((c) => c.isInstalled);
  const list = installed.length ? installed : connectors;

  return (
    <div className="conn">
      <span className="conn__fam">{label}</span>
      <div className="conn__btns">
        {list.length === 0 && <span className="conn__none">No wallet detected</span>}
        {list.map((c) => (
          <button
            key={c.id}
            className="conn__btn"
            disabled={isPending}
            onClick={() => connect(c).catch(() => {})}
          >
            {c.icon && <img src={c.icon} alt="" width={16} height={16} />}
            {c.name}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ConnectBar() {
  return (
    <div className="connbar">
      <FamilyConnect xChainType="EVM" label="EVM" />
      <FamilyConnect xChainType="SOLANA" label="Solana" />
    </div>
  );
}
