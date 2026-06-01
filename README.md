# Just Sweep It

Cross-chain **consolidator** built on the SODAX SDK. Connect wallets across EVM chains
and Solana, discover scattered balances, and sweep selected fragments into **one token,
one chain, one tap**. Earns a **0.15% partner fee** on every swap (accrues on the Sonic hub).

> Honest scope: SODAX swaps a small canonical token set per chain, so this consolidates
> major-asset fragments (ETH/USDC/BTC/SOL/…), not arbitrary spam tokens.

## Stack
- Next.js 15 (App Router) · React 19 · TypeScript
- `@sodax/sdk` · `@sodax/wallet-sdk-react` · `@sodax/dapp-kit` — all `2.0.0-rc.8`
- v1 chains: Ethereum, Base, Arbitrum, Optimism, Polygon, BNB, Avalanche, **Solana**

## Architecture
- `lib/sodax/*` — chains, read-only server Sodax client, swap-token matcher
- `lib/balances/*` — EVM (Alchemy) + Solana (Helius) discovery, CoinGecko pricing, viability filter
- `lib/engine/*` — state machine, per-token executor (quote → approve → swap), sequential
  queue (one failure never aborts the batch), localStorage persistence + recovery backstop
- `app/sweep` — Discover → Review (gate) → Execute · `app/fees` — partner earnings + recovery
- `docs/sodax-api-notes.md` — verified rc.8 API surface

## Run
```bash
pnpm install
cp .env.example .env.local   # add ALCHEMY_API_KEY + HELIUS_API_KEY at minimum
pnpm dev                     # http://localhost:3000
pnpm typecheck && pnpm test && pnpm build
pnpm spike:fee               # Phase-0 partner-fee assertion (no network)
```

The teaser/coming-soon page lives in `teaser/` (deployed separately).

Built on `@sodax/sdk@2.0.0-rc.8`.
