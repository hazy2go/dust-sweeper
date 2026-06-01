import Link from 'next/link';

const CHAINS = ['Ethereum', 'Base', 'Arbitrum', 'Optimism', 'Polygon', 'BNB', 'Avalanche', 'Solana'];

export default function Home() {
  return (
    <main className="home">
      <header className="home__top">
        <span className="seal" title="掃 — sweep">
          掃
        </span>
        <span className="home__meta">
          <span className="jp">分散資産回収プロトコル</span>
          Built on SODAX
        </span>
      </header>

      <section className="home__hero">
        <span className="home__eyebrow">
          <span className="jp">クロスチェーン回収</span> · Cross-chain consolidation
        </span>

        <h1 className="home__wordmark serif">
          <span>Just</span>
          <span>Sweep</span>
          <span className="home__it">It.</span>
        </h1>

        <div className="home__rule" />

        <p className="home__lede">
          Tiny balances stranded across <b>18 networks</b> — every EVM chain and Solana. Gather every
          fragment into <b>one token, one chain, one tap.</b>
        </p>

        <div className="home__cta">
          <Link href="/sweep" className="btn btn--primary">
            Open the sweeper →
          </Link>
          <Link href="/sweep" className="home__demo">
            or try a demo, no wallet needed
          </Link>
        </div>

        <div className="home__chains">
          {CHAINS.map((c) => (
            <span key={c}>{c}</span>
          ))}
        </div>
      </section>

      <footer className="home__foot">
        <span className="jp">SODAX クロスネットワーク基盤の上に構築</span>
        <span>© 2026 · Just Sweep It</span>
      </footer>
    </main>
  );
}
