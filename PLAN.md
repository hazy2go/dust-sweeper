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
- Partner fee: **15 bps (0.15%)** — `PARTNER_FEE.percentage = 15`. **Unit confirmed against the SDK
  types**: `PartnerFeePercentage.percentage` is in **basis points** (`100 = 1%`, **max 100 = 1%**), so
  `15` = 0.15% exactly. Set it at `swaps.partnerFee` (see Providers).
- v1 scope: **EVM ×7 + Solana**.
- Naming/branding: **deferred** to the UI phase.

---

## Phase 0 — De-risk spike (DO THIS FIRST, 1–2 days)

A throwaway Node script (private key, tiny real balance on Base). Do **not** build UI until this passes.
Prove, in order:
1. **Partner-fee unit** — ✅ **already resolved from the SDK types** (basis points, `100 = 1%`, max 100).
   Lock it with a fast assertion instead of a live swap: instantiate
   `new Sodax({ swaps: { partnerFee: { address, percentage: 15 } } })` and assert
   `sodax.swaps.getPartnerFee(1_000_000n) === 1_500n` (15 bps of a 6-decimal USDC unit).
2. **Fee accrual** — confirm the fee lands claimable on Sonic via
   `sodax.partners.feeClaim.fetchAssetsBalances(PARTNER_SONIC_ADDRESS)` after one real swap. (Runtime
   behavior — still needs a live check.)
3. **Relay-submit recovery** — kill network after `createIntent` returns, confirm a relay-only
   re-submit completes the intent without re-signing the spoke tx. (Runtime behavior — live check.)

Validate token lists/quotes via MCP `sodax_get_swap_tokens`, `sodax_get_solver_quote` per chain **if
available**; otherwise use the SDK directly in the same script — `sodax.config.getSupportedSwapTokens()`
(synchronous, embedded) and `sodax.swaps.getQuote(...)`.

---

## Dependencies

```
@sodax/sdk@2.0.0-rc.8            # bundles @sodax/types & @sodax/libs @rc.8 — do NOT add them separately
@sodax/wallet-sdk-react@2.0.0-rc.8   # matching rc.8 published — pin exactly
@sodax/dapp-kit@2.0.0-rc.8           # matching rc.8 published — pin exactly
@tanstack/react-query@^5
next@^15  react@^19  react-dom@^19
viem@^2.29                       # match SDK's pinned viem@2.29.2 (avoid a duplicate viem instance)
@solana/web3.js@^1.98            # match SDK's pinned @solana/web3.js@1.98.0
zustand@^5                       # queue/engine state
zod@^3                           # validate API-route responses
# dev: typescript@^5, vitest@^2, @playwright/test
```
Verified on npm: `@sodax/sdk` dist-tags are `latest`=`2.0.0-rc.1` (**stale**) and `rc`=`2.0.0-rc.8`.
Install with the explicit `@2.0.0-rc.8` on all three `@sodax/*` packages, and commit the lockfile.

---

## Project structure

```
app/
  layout.tsx                     # mounts <Providers>
  page.tsx                       # landing / connect
  sweep/page.tsx                 # discover → REVIEW (gate) → execute
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
include Sonic RPC (hub wallet auto-derived — user needs no Sonic wallet); set the partner fee via the
SDK config `new Sodax({ swaps: { partnerFee: PARTNER_FEE } })` (`DeepPartial<SodaxConfig>`) — confirm
the exact prop dapp-kit's `SodaxProvider` accepts for this. WalletConnect projectId for EVM.

**Partner fee** (`lib/config.ts`):
```ts
export const PARTNER_FEE: PartnerFeePercentage = {
  address: process.env.NEXT_PUBLIC_PARTNER_SONIC_ADDRESS as `0x${string}`,
  percentage: 15, // basis points: 100 = 1%, so 15 = 0.15%. SDK hard cap is 100 (1%).
};
```
(`PartnerFee = PartnerFeeAmount | PartnerFeePercentage`; use the percentage variant. Both are
re-exported from `@sodax/sdk`.)

**Balance discovery** — SODAX gives NO wallet balances. Server-side routes only (keys hidden):
- EVM → Alchemy `getTokenBalances` + metadata (Covalent fallback); native sentinel `0x000…000`.
- Solana → Helius `getTokenAccountsByOwner` + native `getBalance`; mint→balance; sentinel `1111…1111`.
- Prices → Coingecko (cosmetic USD column); **viability gate uses implied price from
  `sodax.swaps.getQuote(token→USDC)`** = the real "what you'll receive".
Normalize all to a unified `RawBalance` / `EnrichedBalance` type.

**Token matching** (`lib/sodax/swap-tokens.ts`): build a `Set` of `${xChainId}:${addr.toLowerCase()}`
from `sodax.config.getSupportedSwapTokens()` — a **synchronous** `ConfigService` method returning
`Record<SpokeChainKey, readonly XToken[]>` that is **embedded in the pinned SDK config** (NOT a network
call, NOT a hardcoded list). Include native sentinels. Three UI buckets: **Sweepable** (supported +
viable), **Dust** (supported, value ≤ fees·margin — greyed, opt-in), **Not supported** (informational,
never queued). Regenerate the documented Base/Solana token sets (above) from `getSupportedSwapTokens()`
rather than trusting a hand-written list.

**Viability** (`lib/balances/viability.ts`): `value > (swaps.getSolverFee(amount) +
swaps.getPartnerFee(amount) + flat gas/relay ~$0.25) × 2` (2× safety margin; per-chain flat-fee
overrides). Use the SDK fee methods rather than hardcoding the percentages — `getSolverFee` is the
fixed 0.1% (10 bps) solver fee and `getPartnerFee` reflects our configured 15 bps.

**Sweep flow — Discover → Review → Execute** (`app/sweep/page.tsx`, components `BalanceTable`,
`OutputSelector`, `SweepQueue`): **Review is a hard gate before any signature.**
- A review table lists **every discovered token**, grouped **Sweepable / Dust / Not-supported**, each
  row showing token, chain, balance, USD value, and **expected net output in the target token** from
  `swaps.getQuote` (already net of solver + partner fee), plus a per-row fee breakdown
  (gross → solver 0.1% → partner 0.15% → est. gas/relay → net received).
- **Per-row select/deselect** checkboxes; **dust deselected by default** (opt-in toggle reveals it);
  **Not-supported rows are informational and never selectable**, each with a short
  "why isn't this sweepable?" explainer.
- `OutputSelector` chooses target token (USDC default) + destination chain.
- A **running summary**: tokens selected, total expected output, total fees, and crucially the
  **number of wallet signatures required (up to 2N)** — set the sequential-UX expectation up front.
- A **final confirmation step** restating min-received + signature count before the queue starts.
- During execution: per-token live status (the `state-machine` phase), retry / resume-relay controls,
  the `RecoveryBanner`, and an "X of N swept" partial-completion summary.

**Execution engine** — the load-bearing part. The SDK exposes **two relay surfaces**; pick the
high-level `sodax.swaps` one consistently (it is documented as the "manual control" path and matches
the persist-in-the-gap design). Do **not** mix in the lower-level `backendApi.submitSwapTx` path.
- `execute-one.ts`: `getQuote` (spoke addresses + ChainKeys) → `isAllowanceValid`/`approve` (skip
  natives & Solana — no allowance concept there; **exact-amount approval**, wait for receipt) →
  `createIntent` (raw:false, client signs) which returns `{ tx, intent, relayData:{address,payload} }`
  → **persist `{spokeTxHash, relayData}` BEFORE relaying** → `submitIntent(relayData)` (Solana needs
  `getIntentSubmitTxExtraData` → `RelayExtraData`) → `postExecution` (notify solver) → poll `getStatus`
  until `solved|failed` → clear persistence.
  Prefer this split (`createIntent` + `submitIntent` + `postExecution`) over the all-in-one
  `swaps.swap()` so you can persist in the exact gap where funds can get stuck.
  (Alternative lower-level surface, not recommended for v1: `backendApi.submitSwapTx` +
  `backendApi.getSubmitSwapTxStatus`. Choose one; never both.)
- `state-machine.ts`: per-token status `idle→quoting→awaiting-approval→approving→awaiting-swap-sig→swapping
  →relaying→done | failed | relay-submit-failed`.
- `queue.ts`: Zustand store, processes selected tokens ONE at a time; **a failure records status and
  continues to the next token** — one bad token never aborts the batch. Expose `retry`/`retryRelay`.
- `persistence.ts`: localStorage `dustsweep:inflight:{owner}`, written before each relay submit, cleared
  once the intent is `solved`. On load, `RecoveryBanner` offers "Resume relay" → calls ONLY
  `submitIntent(savedRelayData)` (+ `postExecution`), never re-signs the spoke tx. This is the
  funds-safety guarantee. Holds only non-sensitive tx hashes / chain keys / relay payloads — never a secret.

**Fee dashboard** (`app/fees/page.tsx`): `sodax.partners.feeClaim.fetchAssetsBalances(PARTNER_SONIC_ADDRESS)`
(or dapp-kit `useFetchAssetsBalances`); claim via `sodax.partners.feeClaim` / `useFeeClaimSwap`.

**Recovery (SDK-native backstop)** — the SDK ships `sodax.recovery` (RecoveryService), a safety net
beyond the localStorage resume for the genuinely-stuck case (funds landed on the Sonic hub but the
intent was never filled):
- `recovery.fetchHubAssetBalances({ chainKey, srcAddress })` → lists the user's non-zero hub-side
  balances for a spoke chain.
- `recovery.withdrawHubAsset({ srcChainKey, srcAddress, token, amount }, raw, walletProvider)` →
  withdraws a stuck hub asset back to the user's **own** spoke address (signed by the user, `raw:false`).
Surface this on the fees page (or a `recovery/` route): list any hub-stuck balances and offer a
withdraw action. The localStorage persist-before-submit + resume-relay stays the *primary* mechanism;
recovery is the *backstop*.

## Security (threat model)

User funds must be safe at every moment, and the app must be hardened against outside attack. Two axes:

**Funds / signing — no draining:**
- **No custody, ever.** The app holds no keys and no funds. Every approve / swap / claim / withdraw is
  signed in the user's own wallet (`raw:false`). Server routes are **read-only proxies** — they never
  build, sign, or relay a value-moving transaction.
- **Exact-amount approvals only.** Use the SDK's `approve` (scoped to `inputAmount`); never request an
  unlimited/max allowance. The spender (EVM spoke asset manager / hub intents contract) is derived from
  the pinned `ConfigService`, never from user/URL/API input. Re-check `isAllowanceValid` right before
  `createIntent`.
- **Config-fixed addresses + supply-chain integrity.** Spender, hub assets, and chain configs come only
  from the pinned SDK. Pin the exact `@sodax/*@2.0.0-rc.8` versions and commit the lockfile.
- **Output-protection invariants** on every intent: slippage cap (50–100 bps), short deadline (~5 min),
  `allowPartialFill:false`, and a **fresh-quote guard** — re-quote right before signing and abort if
  `minOutputAmount` drifts beyond tolerance from what the user reviewed.
- **Destination integrity.** Output token + destination chain are user-chosen from the supported set;
  `recovery.withdrawHubAsset` sends only to the user's own SDK-derived spoke address — never an
  arbitrary address. The partner-fee address is a build-time env constant (a wrong value loses revenue,
  not user funds).
- **Idempotency / no double-spend.** Queue runs one token at a time; disable signing controls while a tx
  is in flight; persisted `relayData` makes resume relay-only (never re-signs the spoke tx).

**Outside-attack surface — the web app + API routes:**
- API routes (`balances/*`, `prices`) validate every input with **zod** (strict address format, chain
  enum allow-list), reject unknown params, and are **not open proxies** (no arbitrary URL/host
  passthrough → no SSRF). Indexer/RPC keys (Alchemy/Helius/Coingecko) live in non-`NEXT_PUBLIC_` env,
  used only inside `app/api/*`, never echoed in responses or errors.
- Rate-limit by IP, set request timeouts, lock CORS to the app's own origin, and cache to blunt abuse/DoS.
- Hardening headers: CSP, HSTS, `X-Content-Type-Options`, `frame-ancestors 'none'` (block
  clickjacking / wallet-drainer iframes). No `dangerouslySetInnerHTML`; sanitize indexer-supplied token
  metadata (names/symbols) before render to prevent UI spoofing / XSS.
- **Clear-signing as a security control:** before each signature show a human-readable summary (action,
  token, exact amount, destination, min-received), and verify the wallet `chainId` matches the intended
  chain before prompting. The app never asks for a seed phrase / private key — state this in the UI.
- **Persistence safety:** localStorage holds only non-sensitive tx hashes / chain keys / relay payloads,
  namespaced per owner address, cleared on completion. Never a secret.
- A short **"What this app will never do"** trust note (no custody, no unlimited approvals, no
  seed-phrase prompts, no sending to addresses you didn't choose) — both UX and anti-phishing signal.

---

## Product scope & priorities

Triaged so scope stays honest. Security (above) is cross-cutting and applies to every phase.

**v1 (MVP — protects funds, sets expectations, or core to the value prop):**
- Security threat model — cross-cutting.
- Discover → **Review (gate)** → Execute with per-token select/deselect.
- **Full fee/output transparency:** per-token and total breakdown (gross → solver 0.1% → partner 0.15%
  → est. gas/relay → **net received**), shown before signing. Justifies the fee, builds trust.
- **Expectation-setting onboarding:** pre-connect explainer of what the tool does/doesn't do, the
  "up to 2N signatures, one token at a time" reality, and the fee.
- **Resilient discovery:** multi-wallet (EVM + Solana) aggregation with per-chain partial results,
  graceful indexer fail/rate-limit handling, refresh, and loading/empty states.
- **Robust sequential queue:** resumable across reload/disconnect (persistence + `recovery`), per-token
  retry/skip, "X of N swept" partial-completion, EVM chain-switch prompts between tokens on different
  chains, and a "one failure never aborts the batch" guarantee.
- **"Why not sweepable?" explainers** on Not-supported / below-viability rows.

**Fast-follow (high value, not blocking):**
- **Receipts / history view:** completed sweeps with explorer links (spoke + hub + fill tx) and intent
  hash, exportable — lets users verify arrival and helps debug stuck intents.
- **Recovery dashboard** surfacing `recovery.fetchHubAssetBalances` + `withdrawHubAsset`.
- Fee dashboard polish + claim flow (`partners.feeClaim`).
- Privacy-respecting analytics (sweep count / volume / fees earned — never leak user addresses).
- Mobile/responsive + a11y pass.

**Defer (explicitly out of v1):**
- Sui, Stellar, ICON, Injective, NEAR, Bitcoin, tier-2 EVM (Hyper/LightLink/Redbelly/Kaia).
- Limit-order mode (`createLimitOrder` exists in the SDK but is out of scope for a consolidator).
- i18n, shareable-success cards.

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
2. The relay-submit gap — the place funds can get stuck; mitigated by persist-before-submit +
   resume-relay-only, with `sodax.recovery.withdrawHubAsset` as an SDK-native backstop for funds that
   reached the hub but were never filled.
3. Solana divergence — different balance source, native sentinel, no approvals, mandatory `RelayExtraData`.
4. RC SDK version drift — pin wallet-sdk-react/dapp-kit to rc.8-compatible versions.
5. Sequential N-swap UX — set expectations, deselect dust by default, make queue resumable.
