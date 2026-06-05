'use client';

import { useRef, useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, useScroll, useTransform, useInView, type Variants } from 'motion/react';
import { DustCanvas } from './DustCanvas';

const CHAINS = [
  { name: 'Ethereum', dot: '#8a93ff' },
  { name: 'Base', dot: '#2a5cff' },
  { name: 'Arbitrum', dot: '#3fa9f5' },
  { name: 'Optimism', dot: '#ff3b30' },
  { name: 'Polygon', dot: '#9a4dff' },
  { name: 'BNB Chain', dot: '#ffcd2e' },
  { name: 'Avalanche', dot: '#ff5a45' },
  { name: 'Solana', dot: '#3ddc97' },
];

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.12 } },
};
const rise: Variants = {
  hidden: { y: 34, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
};

function CountUp({ to, suffix = '', decimals = 0 }: { to: number; suffix?: string; decimals?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const t0 = performance.now();
    const dur = 1400;
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 4);
      setVal(to * eased);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [inView, to]);
  return (
    <span ref={ref}>
      {val.toFixed(decimals)}
      {suffix}
    </span>
  );
}

export function Landing() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: heroP } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroFade = useTransform(heroP, [0, 0.85], [1, 0]);
  const heroLift = useTransform(heroP, [0, 1], ['0%', '-18%']);
  const kanjiDrift = useTransform(heroP, [0, 1], ['0%', '26%']);

  const scatterRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: scatterP } = useScroll({ target: scatterRef, offset: ['start end', 'end start'] });
  const floatA = useTransform(scatterP, [0, 1], [70, -70]);
  const floatB = useTransform(scatterP, [0, 1], [120, -40]);
  const floatC = useTransform(scatterP, [0, 1], [40, -110]);

  return (
    <main className="lp">
      {/* glass nav */}
      <motion.nav
        className="lp__nav"
        initial={{ y: -56, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <Link href="/" className="lp__brand">
          <span className="seal seal--sm">掃</span>
          <span className="serif">Just Sweep It</span>
        </Link>
        <div className="lp__navlinks">
          <Link href="/sweep">Sweeper</Link>
          <Link href="/fees">Fees</Link>
          <Link href="/sweep" className="lp__navcta">
            Launch →
          </Link>
        </div>
      </motion.nav>

      {/* hero */}
      <section ref={heroRef} className="lp__hero">
        <DustCanvas />
        <motion.div className="lp__kanji brush" style={{ y: kanjiDrift }} aria-hidden>
          掃
        </motion.div>

        <motion.div className="lp__heroinner" style={{ opacity: heroFade, y: heroLift }}>
          <motion.div variants={stagger} initial="hidden" animate="show">
            <motion.span variants={rise} className="lp__chip">
              <span className="lp__chipdot" /> 8 networks · built on SODAX
            </motion.span>

            <motion.h1 variants={rise} className="lp__word serif">
              Just <em>Sweep</em> It.
            </motion.h1>

            <motion.p variants={rise} className="lp__lede">
              Forgotten balances on every chain you ever touched. One scan finds them, one queue
              sweeps them — <b>one token, one chain, one clean wallet.</b>
            </motion.p>

            <motion.div variants={rise} className="lp__cta">
              <Link href="/sweep" className="lp__btn lp__btn--glow">
                Open the sweeper →
              </Link>
              <Link href="/sweep" className="lp__btn lp__btn--glass">
                Try the demo — no wallet
              </Link>
            </motion.div>
          </motion.div>
        </motion.div>

        <div className="lp__scrollhint" aria-hidden>
          <span />
        </div>
      </section>

      {/* chain marquee */}
      <section className="lp__marquee" aria-label="Supported networks">
        <div className="lp__marqueetrack">
          {[...CHAINS, ...CHAINS].map((c, i) => (
            <span key={`${c.name}:${i}`} className="lp__pill">
              <i style={{ background: c.dot }} /> {c.name}
            </span>
          ))}
        </div>
      </section>

      {/* the problem — floating fragments */}
      <section ref={scatterRef} className="lp__scatter">
        <motion.div
          className="lp__scattertext"
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
        >
          <motion.h2 variants={rise} className="serif">
            Your money is <em>everywhere.</em>
          </motion.h2>
          <motion.p variants={rise}>
            $4 of ETH on Base. Half a MATIC from a mint two years ago. SOL change from an NFT you
            flipped. Each one too small to bother bridging — together, real money doing nothing.
          </motion.p>
        </motion.div>

        <div className="lp__frags" aria-hidden>
          <motion.div className="lp__frag" style={{ y: floatA }}>
            <b>0.0021 ETH</b>
            <span>Base · $5.41</span>
          </motion.div>
          <motion.div className="lp__frag lp__frag--b" style={{ y: floatB }}>
            <b>3.2 MATIC</b>
            <span>Polygon · $1.87</span>
          </motion.div>
          <motion.div className="lp__frag lp__frag--c" style={{ y: floatC }}>
            <b>0.048 SOL</b>
            <span>Solana · $6.62</span>
          </motion.div>
        </div>
      </section>

      {/* three moves */}
      <section className="lp__steps">
        <motion.h2
          className="serif"
          initial={{ y: 30, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          Three moves. <em>That&apos;s the whole product.</em>
        </motion.h2>

        <motion.div
          className="lp__stepgrid"
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
        >
          {[
            {
              n: '01',
              t: 'Scan',
              d: 'Connect an EVM wallet, a Solana wallet, or both. We sweep every supported network for balances worth moving — and tell you honestly which dust isn’t.',
            },
            {
              n: '02',
              t: 'Select',
              d: 'Pick the fragments, pick one destination token on one chain. You see value, fees, and exactly how many signatures before anything happens.',
            },
            {
              n: '03',
              t: 'Sweep',
              d: 'A sequential queue walks each token home via SODAX intents. One failure never stops the rest — and anything stuck is recoverable, always.',
            },
          ].map((s) => (
            <motion.div key={s.n} variants={rise} className="lp__step">
              <span className="lp__stepnum serif">{s.n}</span>
              <h3 className="serif">{s.t}</h3>
              <p>{s.d}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* stats */}
      <section className="lp__stats">
        <motion.div
          className="lp__statgrid"
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
        >
          <motion.div variants={rise} className="lp__stat">
            <strong>
              <CountUp to={8} />
            </strong>
            <span>networks, one sweep</span>
          </motion.div>
          <motion.div variants={rise} className="lp__stat">
            <strong>
              <CountUp to={0.15} decimals={2} suffix="%" />
            </strong>
            <span>flat fee — only when you sweep</span>
          </motion.div>
          <motion.div variants={rise} className="lp__stat">
            <strong>
              <CountUp to={1} />
            </strong>
            <span>token out. Your pick.</span>
          </motion.div>
          <motion.div variants={rise} className="lp__stat">
            <strong>
              <CountUp to={0} />
            </strong>
            <span>custody. Every action signed by you.</span>
          </motion.div>
        </motion.div>
      </section>

      {/* final CTA */}
      <section className="lp__final">
        <motion.div
          initial={{ scale: 0.86, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="lp__sealring"
        >
          <span className="lp__bigseal brush">掃</span>
        </motion.div>
        <motion.h2
          className="serif"
          initial={{ y: 26, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.7, delay: 0.1 }}
        >
          A clean wallet is one sweep away.
        </motion.h2>
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.7, delay: 0.2 }}
        >
          <Link href="/sweep" className="lp__btn lp__btn--glow lp__btn--big">
            Just sweep it →
          </Link>
        </motion.div>
      </section>

      <footer className="lp__foot">
        <span className="jp">SODAX クロスネットワーク基盤の上に構築</span>
        <span>Non-custodial · intent-based · © 2026 Just Sweep It</span>
      </footer>
    </main>
  );
}
