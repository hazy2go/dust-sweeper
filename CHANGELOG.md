# Changelog

## v0.2.0 — "First Yen" · 2026-06-05

**The headline: first real sweeps executed, first fees earned. The product works.**

### 💰 Milestone — Real-Money E2E Passed
- Real dust swept across multiple chains by a real wallet
- Relay filled, funds delivered, and **0.15% partner fees confirmed accruing on the Sonic hub** — verified against the SODAX partner ledger
- The full pipeline is proven: scan → quote → sign → deposit → relay → fill → fee

### ✨ New — Sweep Flow
- **Chain-grouped queue**: same-chain tokens sweep back-to-back; one network-switch prompt per chain (auto-prompted), not one per token
- **Pre-flight confirm modal**: per-chain plan with exact signature counts (EVM native = 1, ERC-20 ≤ 2, Solana = 1) + network-switch count before anything fires
- **"Switching network…" state** + chain headers in the live queue

### 🎨 New — Full Site Revamp
- **Dark neo-Tokyo glassmorphism** across landing + app: glass cards, neon vermilion/jade, aurora atmosphere
- **Scroll-scrubbed video hero** — Higgsfield-generated (Seedance 2.0, 1080p, hue-graded to brand vermilion, all-keyframe encode): scroll drives the video forward *and backward*
- Interactive dust canvas — your cursor is the broom
- **Higgsfield section art**: crystal-shard fragment cards; radar/orbs/stream step visuals
- Chain marquee, parallax fragments, count-up stats, glowing hanko finale
- **Branded OG card** (link previews) + vermilion 掃 SVG favicon

### ⚡ Performance
- **/sweep first load: 2.36 MB → 110 kB** — SDK + chain adapters now stream in after the shell paints
- Hero video upgraded to native 1920×1080

### 🐛 Fixes (live-fire, found during real sweeps)
- **"No connected wallet" batch wipeout**: after reload, the address restores before the signing client — engine now waits for it; Sweep button gated until ready
- **Polygon RPC**: polygon-rpc.com started 401ing → swapped to publicnode
- **POL price n/a**: CoinGecko killed `matic-network` post-migration → `polygon-ecosystem-token`
- **Stale recovery banner**: now cross-checks the hub live; flips to green "delivered ✓" with dismiss when nothing is stranded
- Nav bar sliding off-screen (motion inline transform vs CSS `translateX` centering)
- "J" descender clipped in hero wordmark (`background-clip:text` box)
- Marquee loop gap — two exact sets, mathematically seamless `-50%`
- SDK "chain not enabled" console spam (app-side) silenced via WalletsReady gate

### 🔧 Infra
- Alchemy (×7 EVM) + Helius keys live in Vercel prod; partner fee address configured
- All 7 Alchemy networks enabled — full 8-chain discovery operational

### 📋 Known Issues
- Sub-$2 fragments can fail quoting (solver minimum) — fails cleanly before signing; friendlier "too small to sweep" message coming
- SDK internals still flash one "not enabled" warning during chunk load — cosmetic

---

## v0.1.0 · 2026-06-01

- Initial release: cross-chain consolidator on `@sodax/sdk@2.0.0-rc.8`
- 8 networks (Ethereum, Base, Arbitrum, Optimism, Polygon, BNB, Avalanche, Solana)
- Discovery (Alchemy + Helius, server-side), viability classifier, sequential sweep engine with crash-safe persistence + recovery, fee dashboard, demo mode
- Washi-paper landing + teaser site; deployed to Vercel
