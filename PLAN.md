# SODAX Cross-Chain Consolidator ("Dust Sweeper") — Build Plan

## Context

Goal: a **real product** that (1) people want to use, (2) drives interest to SODAX, and
(3) generates fees for the builder. SODAX has a built-in **partner fee** program — set a fee
on the `Sodax` instance and it skims from every swap/bridge/money-market action routed through
your app, accruing as wrapped ERC-20 on the Sonic hub, claimable via `sodax.partners.feeClaim`.

The product: user connects wallets across chains → app discovers their token balances →
identifies which are **consolidatable via SODAX** → filters out economically-unviable amounts →
user sweeps selected fragments into ONE output token (default USDC) on ONE chain. Every swap
earns a **0.15% (15 bps)** partner fee.

**Two ground-truth constraints that shaped the design** (validated against the live SDK/MCP):
1. **No batching.** Each token = a separate approve + swap + relay + fill, run *sequentially*.
   N tokens = up to 2N wallet signatures. UX is a resumable per-token queue, not "one click".
2. **SODAX swaps only a small canonical token set per chain** (Base = ETH/USDC/weETH/wstETH/cbBTC/bnUSD/SODA;
   Solana = SOL/USDC/bnUSD/SODA). It is NOT a long-tail DEX — spam/meme dust is *not* sweepable.
   Honest framing: a **consolidator of scattered major-asset fragments**, not a spam cleaner.

Stack: **Next.js (App Router) on Vercel**, React 19, @tanstack/react-query 5, TypeScript.
v1 chains: **EVM ×7** (Ethereum, Base, Arbitrum, Optimism, Polygon, BSC, Avalanche) **+ Solana**.
Defer: Sui, Stellar, ICON, Injective, NEAR, Bitcoin, tier-2 EVM (Hyper/LightLink/Redbelly/Kaia).

## Decisions locked
- Partner fee: **15 bps (0.15%)** — `PARTNER_FEE.percentage` (CONFIRM unit in Phase 0).
- v1 scope: **EVM ×7 + Solana**.
- Naming/branding: **deferred** to the UI phase.

---

## Phase 0 — De-risk spike (DO THIS FIRST, 1–2 days)

A throwaway Node script (private key, tiny real balance on Base). Do **not** build UI until this passes.
Prove, in order:
1. **Partner-fee unit** — docs contradict (bps vs decimal). Set `partnerFee`, run one real
   weETH→USDC or USDC→USDC swap, inspect `sodax.swaps.getPartnerFee(amount)` vs actual deduction.
   Getting this wrong = earn nothing or overcharge.
2. **Fee accrual** — confirm the fee lands claimable on Sonic via
   `sodax.partners.feeClaim.fetchAssetsBalances(PARTNER_SONIC_ADDRESS)`.
3. **Relay-submit recovery** — kill network after `createIntent` returns, confirm a relay-only
   re-submit completes the intent without re-signing the spoke tx.

Validate token lists/quotes via MCP `sodax_get_swap_tokens`, `sodax_get_solver_quote` per chain.

---

## Dependencies

```
@sodax/sdk@2.0.0-rc.8            # types re-exported — do NOT add @sodax/types separately
@sodax/wallet-sdk-react          # pin to rc.8-compatible version
@sodax/dapp-kit                  # pin to rc.8-compatible version
@tanstack/react-query@^5
next@^15  react@^19  react-dom@^19
viem@^2                          # parseUnits/formatUnits, receipts
@solana/web3.js@^1.95
zustand@^5                       # queue/engine state
zod@^3                           # validate API-route responses
# dev: typescript@^5, vitest@^2, @playwright/test
```
Install SDK via the `rc` tag / explicit `@2.0.0-rc.8`; `latest` is stale at rc.1. Lock the lockfile.

---

## Project structure

```
app/
  layout.tsx                     # mounts <Providers>
  page.tsx                       # landing / connect
  sweep/page.tsx                 # discover → select → execute
  fees/page.tsx                  # partner fee dashboard
  api/
    balances/evm/route.ts        # Alchemy token balances (server, key hidden)
    balances/solana/route.ts     # Helius getTokenAccountsByOwner (server)
    prices/route.ts              # Coingecko proxy, server-cached
providers/providers.tsx          # SodaxProvider → QueryClient → SodaxWalletProvider
lib/
  config.ts                      # PARTNER_FEE (15 bps), margins, env
  sodax/client.ts                # server-side read-only Sodax singleton (quotes, token lists)
  sodax/chains.ts                # v1 chain set, ChainKey ↔ chainId maps
  sodax/swap-tokens.ts           # cached getSupportedSwapTokens + matcher (native sentinels)
  balances/{types,evm,solana,viability}.ts
  engine/{execute-one,queue,state-machine,persistence}.ts
components/{ConnectBar,BalanceTable,OutputSelector,SweepQueue,RecoveryBanner}.tsx
hooks/{useDiscoverBalances,useSweepableTokens,useSweepEngine}.ts
```

---

## Key implementation notes

**Providers** (`providers/providers.tsx`): order `SodaxProvider → QueryClientProvider → SodaxWalletProvider`;
`createSodaxQueryClient()` from dapp-kit; EVM config needs `ssr: true` for Vercel hydration;
include Sonic RPC (hub wallet auto-derived — user needs no Sonic wallet); set
`swaps.partnerFee = PARTNER_FEE` here. WalletConnect projectId for EVM.

**Partner fee** (`lib/config.ts`):
```ts
export const PARTNER_FEE: PartnerFee = {
  address: process.env.NEXT_PUBLIC_PARTNER_SONIC_ADDRESS as `0x${string}`,
  percentage: 15, // 15 bps = 0.15% — CONFIRM unit in Phase 0
};
```

**Balance discovery** — SODAX gives NO wallet balances. Server-side routes only (keys hidden):
- EVM → Alchemy `getTokenBalances` + metadata (Covalent fallback); native sentinel `0x000…000`.
- Solana → Helius `getTokenAccountsByOwner` + native `getBalance`; mint→balance; sentinel `1111…1111`.
- Prices → Coingecko (cosmetic USD column); **viability gate uses implied price from
  `sodax.swaps.getQuote(token→USDC)`** = the real "what you'll receive".
Normalize all to a unified `RawBalance` / `EnrichedBalance` type.

**Token matching** (`lib/sodax/swap-tokens.ts`): build a `Set` of `${xChainId}:${addr.toLowerCase()}`
from `sodax.config.getSupportedSwapTokens` (the SDK method, NOT a hardcoded list); include native
sentinels. Three UI buckets: **Sweepable** (supported + viable), **Dust** (supported, value ≤ fees·margin —
greyed, opt-in), **Not supported** (informational, never queued).

**Viability** (`lib/balances/viability.ts`): `value > (solver 0.1% + partner 0.15% + flat gas/relay ~$0.25) × 2`
(2× safety margin; per-chain flat-fee overrides).

**Execution engine** — the load-bearing part:
- `execute-one.ts`: quote (spoke addresses + ChainKeys) → `isAllowanceValid`/`approve` (skip natives & Solana,
  wait for receipt) → `createIntent` (raw:false, client signs) → **persist `{spokeTxHash, submitPayload}`
  BEFORE relay submit** → `backendApi.submitSwapTx` (Solana needs `getIntentSubmitTxExtraData` as `data`) →
  poll `getSubmitSwapTxStatus` until `executed|failed` → clear persistence.
  Prefer the split `createIntent + submitSwapTx` over the all-in-one `swaps.swap()` so you can persist in the
  exact gap where funds can get stuck.
- `state-machine.ts`: per-token status `idle→quoting→awaiting-approval→approving→awaiting-swap-sig→swapping
  →relaying→done | failed | relay-submit-failed`.
- `queue.ts`: Zustand store, processes selected tokens ONE at a time; **a failure records status and
  continues to the next token** — one bad token never aborts the batch. Expose `retry`/`retryRelay`.
- `persistence.ts`: localStorage `dustsweep:inflight:{owner}`, written before each relay submit, cleared on
  `executed`. On load, `RecoveryBanner` offers "Resume relay" → calls ONLY `submitSwapTx(savedPayload)`,
  never re-signs the spoke tx. This is the funds-safety guarantee.

**Fee dashboard** (`app/fees/page.tsx`): `sodax.partners.feeClaim.fetchAssetsBalances(PARTNER_SONIC_ADDRESS)`
(or dapp-kit `useFetchAssetsBalances`); claim via `sodax.partners.feeClaim` / `useFeeClaimSwap`.

## Security
- No keys server-side except public RPC/indexer keys (Alchemy/Helius/Coingecko in non-`NEXT_PUBLIC_` env,
  used only inside `app/api/*`). No custody. Every approve/swap/claim signed in the user's wallet (`raw:false`).
- Validate API inputs with zod, rate-limit by IP, never echo keys. Enforce slippage cap (50–100 bps),
  5-min deadlines, `allowPartialFill:false`. Persistence holds only tx hashes/chain keys (non-sensitive).

---

## Delivery phases (solo)
- **Phase 0** — de-risk spike (above).
- **Phase 1 (1–2 wk)** — EVM MVP (start Base + Arbitrum): providers, connect, EVM balance route,
  matcher, viability, output selector (USDC default), queue + state machine + persistence + RecoveryBanner.
  Ship to Vercel.
- **Phase 2 (1 wk)** — remaining EVM chains + **Solana** (Helius route, `getIntentSubmitTxExtraData`
  relay path, SOLANA wallet adapter).
- **Phase 3 (3–5 d)** — fee dashboard + claim, dust opt-in toggle, batch progress polish, resumability tests.
- **Phase 4 (deferred)** — Sui, Stellar, ICON, Injective, NEAR, Bitcoin, tier-2 EVM.

## Verification
- Validate each chain's token list/quotes via MCP (`sodax_get_swap_tokens`, `sodax_get_solver_quote`) before coding it.
- Test with **tiny real mainnet balances** ($2–5) — solver liquidity lives on mainnet, testnet may not fill.
- Adversarially test the relay-submit-failed → resume path (kill network mid-flow, reload, confirm completion w/o re-sign).
- Prove the Solana relay `RelayExtraData` flow end-to-end (most likely silent failure).
- Vitest: matcher (native sentinels, case-insensitivity), viability math, state-machine transitions
  ("one failure doesn't abort batch"). Playwright: connect→discover→select→confirm up to signature boundary.
- Log every phase transition with `spokeTxHash`/`dstTxHash`; debug stuck intents via MCP
  `sodax_get_intent` / `sodax_get_transaction` / `sodax_relay_get_packet`.

## Riskiest parts
1. Partner-fee unit ambiguity (bps vs decimal) — prove in Phase 0.
2. The relay-submit gap — only place funds can get stuck; mitigated by persist-before-submit + resume-relay-only.
3. Solana divergence — different balance source, native sentinel, no approvals, mandatory `RelayExtraData`.
4. RC SDK version drift — pin wallet-sdk-react/dapp-kit to rc.8-compatible versions.
5. Sequential N-swap UX — set expectations, deselect dust by default, make queue resumable.
