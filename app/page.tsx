import Link from 'next/link';

export default function Home() {
  return (
    <main
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'flex-start',
        gap: 28,
        maxWidth: 820,
        margin: '0 auto',
        padding: '0 max(28px,7vw)',
      }}
    >
      <span style={{ fontSize: 13, letterSpacing: '.3em', textTransform: 'uppercase', color: 'var(--ink-dim)' }}>
        クロスチェーン回収 · Cross-chain consolidation
      </span>
      <h1 className="serif" style={{ fontSize: 'clamp(3rem,13vw,6rem)', fontWeight: 600, lineHeight: 0.96 }}>
        Just Sweep<span style={{ color: 'var(--shu)' }}> It.</span>
      </h1>
      <p style={{ maxWidth: '46ch', color: 'var(--ink-dim)', fontSize: '1.05rem' }}>
        Tiny balances stranded across 18 networks — every EVM chain and Solana. Gather every fragment
        into one token, one chain, one tap.
      </p>
      <Link
        href="/sweep"
        className="serif"
        style={{
          background: 'var(--shu)',
          color: 'var(--paper-hi)',
          fontWeight: 600,
          padding: '14px 28px',
          borderRadius: 3,
          letterSpacing: '.04em',
        }}
      >
        Open the sweeper →
      </Link>
    </main>
  );
}
