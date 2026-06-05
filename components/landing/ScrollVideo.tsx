'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Scroll-scrubbed background video: scrolling the pinned hero drives
 * video.currentTime forward and back. The file is encoded all-keyframes
 * (ffmpeg -g 1) so seeking is instant; a lerp smooths the scrub so it
 * feels weighty instead of steppy. Falls back to nothing (the DustCanvas
 * behind it carries the hero) if the video is missing or reduced-motion.
 */
export function ScrollVideo({ src, poster }: { src: string; poster?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let raf = 0;
    let current = 0;
    let ready = false;

    const onMeta = () => {
      ready = true;
    };

    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (!ready || !video.duration) return;
      // progress of the pinned-hero scroll: 0 at top, 1 when the hero
      // section has fully scrolled past its sticky window
      const scroller = video.closest('.lp__hero') as HTMLElement | null;
      if (!scroller) return;
      const rect = scroller.getBoundingClientRect();
      const range = rect.height - window.innerHeight;
      if (range <= 0) return;
      const target = Math.min(1, Math.max(0, -rect.top / range));
      // lerp toward target for weight; snap when close to avoid micro-seeks
      current += (target - current) * 0.14;
      if (Math.abs(target - current) < 0.0008) current = target;
      const t = current * (video.duration - 0.08);
      if (Math.abs(video.currentTime - t) > 0.012) {
        video.currentTime = t;
      }
    };

    video.addEventListener('loadedmetadata', onMeta);
    if (video.readyState >= 1) ready = true;
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      video.removeEventListener('loadedmetadata', onMeta);
    };
  }, []);

  if (failed) return null;

  return (
    <video
      ref={videoRef}
      className="lp__video"
      src={src}
      poster={poster}
      muted
      playsInline
      preload="auto"
      aria-hidden="true"
      onError={() => setFailed(true)}
    />
  );
}
