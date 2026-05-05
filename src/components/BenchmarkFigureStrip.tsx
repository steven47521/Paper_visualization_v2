import { useRef, useState, useEffect, useCallback } from 'react';

export type BenchmarkStripFigure = { src: string; caption: string };

type Props = {
  figures: BenchmarkStripFigure[];
  prevLabel: string;
  nextLabel: string;
  goToSlideLabel: string;
  regionLabel: string;
};

export default function BenchmarkFigureStrip({ figures, prevLabel, nextLabel, goToSlideLabel, regionLabel }: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  const syncActive = useCallback(() => {
    const root = scrollerRef.current;
    if (!root || figures.length === 0) return;
    const center = root.scrollLeft + root.clientWidth * 0.5;
    let best = 0;
    const slides = root.querySelectorAll<HTMLElement>('[data-strip-slide]');
    slides.forEach((el, i) => {
      const mid = el.offsetLeft + el.offsetWidth / 2;
      const bestEl = slides[best];
      const bestMid = bestEl.offsetLeft + bestEl.offsetWidth / 2;
      if (Math.abs(mid - center) < Math.abs(bestMid - center)) best = i;
    });
    setActive(best);
  }, [figures.length]);

  useEffect(() => {
    const root = scrollerRef.current;
    if (!root) return;
    syncActive();
    root.addEventListener('scroll', syncActive, { passive: true });
    const ro = new ResizeObserver(() => syncActive());
    ro.observe(root);
    return () => {
      root.removeEventListener('scroll', syncActive);
      ro.disconnect();
    };
  }, [syncActive]);

  const go = (i: number) => {
    const root = scrollerRef.current;
    const slides = root?.querySelectorAll<HTMLElement>('[data-strip-slide]');
    if (!root || !slides?.length) return;
    const clamped = Math.max(0, Math.min(slides.length - 1, i));
    const el = slides[clamped];
    root.scrollTo({ left: el.offsetLeft, behavior: 'smooth' });
    setActive(clamped);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      go(active - 1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      go(active + 1);
    }
  };

  if (figures.length === 0) return null;

  return (
    <div className="benchmark-figure-strip-root">
      <div className="benchmark-figure-strip-toolbar">
        <button
          type="button"
          className="benchmark-figure-strip-nav"
          onClick={() => go(active - 1)}
          disabled={active <= 0}
          aria-label={prevLabel}
        >
          ‹
        </button>
        <span className="benchmark-figure-strip-counter" aria-live="polite">
          {active + 1} / {figures.length}
        </span>
        <button
          type="button"
          className="benchmark-figure-strip-nav"
          onClick={() => go(active + 1)}
          disabled={active >= figures.length - 1}
          aria-label={nextLabel}
        >
          ›
        </button>
      </div>
      <div
        ref={scrollerRef}
        className="benchmark-figure-strip-scroller"
        tabIndex={0}
        role="region"
        aria-roledescription="carousel"
        aria-label={regionLabel}
        onKeyDown={onKeyDown}
      >
        {figures.map((f, i) => (
          <figure key={i} data-strip-slide className="benchmark-figure-strip-slide benchmark-figure-card">
            <img src={f.src} alt="" loading={i === 0 ? 'eager' : 'lazy'} />
            <figcaption>{f.caption}</figcaption>
          </figure>
        ))}
      </div>
      {figures.length > 1 && (
        <div className="benchmark-figure-strip-dots" role="tablist">
          {figures.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-label={`${goToSlideLabel} ${i + 1}`}
              className={`benchmark-figure-strip-dot${i === active ? ' is-active' : ''}`}
              onClick={() => go(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
