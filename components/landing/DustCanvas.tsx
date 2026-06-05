'use client';

import { useEffect, useRef } from 'react';

interface Mote {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  hue: 'shu' | 'jade' | 'dust';
  tw: number; // twinkle phase
}

const COLORS = {
  shu: [255, 77, 54],
  jade: [61, 220, 151],
  dust: [185, 196, 220],
} as const;

/**
 * The product metaphor, live: drifting dust motes get pulled toward the
 * pointer (the "broom"). Pure canvas — zero deps, ~zero idle cost, pauses
 * off-screen and respects prefers-reduced-motion.
 */
export function DustCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    let motes: Mote[] = [];
    let raf = 0;
    let running = true;
    const pointer = { x: -9999, y: -9999, active: false };

    const seed = () => {
      const count = Math.min(170, Math.floor((w * h) / 11_000));
      motes = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.14 - 0.04,
        r: 0.6 + Math.random() * 1.9,
        hue: Math.random() < 0.08 ? 'shu' : Math.random() < 0.14 ? 'jade' : 'dust',
        tw: Math.random() * Math.PI * 2,
      }));
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    };

    const tick = (t: number) => {
      if (!running) return;
      ctx.clearRect(0, 0, w, h);
      for (const m of motes) {
        // gentle drift + wrap
        m.x += m.vx;
        m.y += m.vy;
        if (m.x < -4) m.x = w + 4;
        if (m.x > w + 4) m.x = -4;
        if (m.y < -4) m.y = h + 4;
        if (m.y > h + 4) m.y = -4;

        // the broom: pull motes toward the pointer, then let them slip past
        if (pointer.active) {
          const dx = pointer.x - m.x;
          const dy = pointer.y - m.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 28_000 && d2 > 9) {
            const f = 9 / d2;
            m.vx += dx * f;
            m.vy += dy * f;
          }
        }
        // damp so swept motes settle back to drift
        m.vx *= 0.985;
        m.vy *= 0.985;

        const [r, g, b] = COLORS[m.hue];
        const a = m.hue === 'dust' ? 0.26 : 0.5;
        const twinkle = 0.65 + 0.35 * Math.sin(t / 900 + m.tw);
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${(a * twinkle).toFixed(3)})`;
        ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    };

    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
      pointer.active = true;
    };
    const onLeave = () => {
      pointer.active = false;
    };

    // pause when scrolled out of view — no wasted frames below the fold
    const io = new IntersectionObserver(([entry]) => {
      const visible = entry?.isIntersecting ?? false;
      if (visible && !running) {
        running = true;
        raf = requestAnimationFrame(tick);
      } else if (!visible) {
        running = false;
        cancelAnimationFrame(raf);
      }
    });

    resize();
    io.observe(canvas);
    raf = requestAnimationFrame(tick);
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerleave', onLeave);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  return <canvas ref={ref} className="dust" aria-hidden="true" />;
}
