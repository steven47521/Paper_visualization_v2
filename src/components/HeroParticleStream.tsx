import { useEffect, useRef } from 'react';

/**
 * “洒水”状粒子流：二次贝塞尔 + 水平镜像（锚点 x′ = w − x，不用 CSS scaleX）。
 * t=0 近喷嘴、t=1 远端；无中心实线，近端束紧、越远越散。
 */
const STRANDS = 120;
const TRAIL = 11;
const DOTS = 3600;

type Vec = { x: number; y: number };

/**
 * Quadratic spray in “base” space, then mirrored horizontally (x' = w − x)
 * so we keep the visual flip without CSS scaleX (which was clipping/off-screen).
 */
function curveAnchors(w: number, h: number) {
  const base = {
    p0: { x: w * 0.96, y: h * 0.18 },
    p1: { x: w * 0.6, y: h * 0.1 },
    p2: { x: w * 0.08, y: h * 0.78 },
  };
  return {
    p0: { x: w - base.p0.x, y: h - base.p0.y },
    p1: { x: w - base.p1.x, y: h - base.p1.y },
    p2: { x: w - base.p2.x, y: h - base.p2.y },
  };
}

function quadPoint(t: number, p0: Vec, p1: Vec, p2: Vec): Vec {
  const u = 1 - t;
  return {
    x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
    y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y,
  };
}

function quadTangent(t: number, p0: Vec, p1: Vec, p2: Vec): Vec {
  const u = 1 - t;
  const dx = 2 * u * (p1.x - p0.x) + 2 * t * (p2.x - p1.x);
  const dy = 2 * u * (p1.y - p0.y) + 2 * t * (p2.y - p1.y);
  const len = Math.hypot(dx, dy) || 1;
  return { x: dx / len, y: dy / len };
}

/** Nozzle tight; spread grows strongly with distance (far end much wider) */
function fanRadius(t: number): number {
  const u = Math.min(1, Math.max(0, t));
  return 8 + Math.pow(u, 1.82) * 300;
}

function pointOnStrand(
  t: number,
  lane: number,
  w: number,
  h: number,
  timeMs: number,
  anchors: ReturnType<typeof curveAnchors>
): Vec {
  const p = quadPoint(t, anchors.p0, anchors.p1, anchors.p2);
  const tan = quadTangent(t, anchors.p0, anchors.p1, anchors.p2);
  const nx = -tan.y;
  const ny = tan.x;
  const fan = fanRadius(t);
  const far = t * t;
  const wobble =
    Math.sin(timeMs * 0.001 + lane * 44.2) * (1.5 + 4 * t) +
    Math.sin(timeMs * 0.0016 + lane * 19.7) * (1 + 2.5 * t) +
    Math.sin(timeMs * 0.00085 + lane * 31.4) * (22 * far + 8 * t);
  const lateral = lane * fan + wobble;
  return { x: p.x + nx * lateral, y: p.y + ny * lateral };
}

/** Push point away from pointer; blend eases in/out when cursor enters/leaves hero */
function repelFromPointer(
  x: number,
  y: number,
  w: number,
  h: number,
  mx: number,
  my: number,
  blend: number
): Vec {
  if (blend < 0.002) return { x, y };
  let dx = x - mx;
  let dy = y - my;
  let d = Math.hypot(dx, dy);
  if (d < 0.75) {
    dx = 1;
    dy = 0;
    d = 1;
  }
  const R = Math.min(w, h) * 0.24;
  if (d >= R) return { x, y };
  const maxPush = Math.min(w, h) * 0.082;
  const falloff = Math.pow(1 - d / R, 1.52) * blend;
  const k = falloff * maxPush;
  return { x: x + (dx / d) * k, y: y + (dy / d) * k };
}

export default function HeroParticleStream({ ariaLabel }: { ariaLabel?: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const phaseRef = useRef(0);
  const lastRef = useRef(performance.now());

  useEffect(() => {
    const canvasEl = canvasRef.current;
    const container = wrapRef.current;
    if (!canvasEl || !container) return;
    const root = container;

    const ctx = canvasEl.getContext('2d', { alpha: true });
    if (!ctx) return;

    const seeds = Array.from({ length: STRANDS }, (_, i) => {
      const u = i / (STRANDS - 1 || 1);
      const centered = (u - 0.5) * 2;
      const lane = Math.tanh(centered * 2.4) * 0.5;
      return {
        off: (i / STRANDS) * 0.1 + Math.sin(i * 13.7) * 0.014,
        lane,
      };
    });

    const trails: Vec[][] = seeds.map(() => []);

    const dots = Array.from({ length: DOTS }, (_, i) => ({
      t: Math.pow((i + 0.5) / DOTS, 0.62) * 0.98,
      lane: (Math.sin(i * 2.7) * 0.48 + Math.cos(i * 4.1) * 0.22) * 0.5,
      r: 0.55 + (Math.sin(i * 8.9) * 0.5 + 0.5) * 1.55,
      speed: 0.0002 + ((Math.sin(i * 5.4) * 0.5 + 0.5) * 0.0004),
    }));

    /** Pointer in canvas logical space; blend eases repulsion when entering/leaving hero */
    const pointer = { mx: 0, my: 0, active: false, blend: 0 };
    const heroEl = root.closest('.home-hero');

    function syncPointerFromEvent(e: Event) {
      if (!(e instanceof PointerEvent)) return;
      const r = root.getBoundingClientRect();
      const cw = root.clientWidth || 1;
      const ch = root.clientHeight || 1;
      pointer.mx = ((e.clientX - r.left) / (r.width || 1)) * cw;
      pointer.my = ((e.clientY - r.top) / (r.height || 1)) * ch;
      pointer.active = true;
    }

    function onHeroPointerLeave() {
      pointer.active = false;
    }

    let ro: ResizeObserver;
    let paperBg = '#f9f8f3';
    let cachedTheme: string | null = null;

    function refreshPaperBg() {
      if (!container) return;
      const v = getComputedStyle(container).getPropertyValue('--color-bg').trim();
      paperBg = v || '#f9f8f3';
    }

    function clearTrails() {
      for (let s = 0; s < STRANDS; s++) trails[s].length = 0;
    }

    function sizeCanvas() {
      if (!canvasEl || !container || !ctx) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const ww = container.clientWidth;
      const hh = container.clientHeight;
      canvasEl.width = Math.max(1, Math.floor(ww * dpr));
      canvasEl.height = Math.max(1, Math.floor(hh * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      refreshPaperBg();
      clearTrails();
    }

    function drawFrame(now: number) {
      if (!canvasEl || !container || !ctx) return;
      const dt = Math.min(now - lastRef.current, 48);
      lastRef.current = now;

      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!reduced) {
        phaseRef.current += 0.000045 * dt;
        const targetBlend = pointer.active ? 1 : 0;
        pointer.blend += (targetBlend - pointer.blend) * 0.14;
        if (pointer.blend < 0.003) pointer.blend = 0;
      } else {
        pointer.blend = 0;
      }

      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w < 8 || h < 8) {
        rafRef.current = requestAnimationFrame(drawFrame);
        return;
      }

      const anchors = curveAnchors(w, h);
      const phase = phaseRef.current;
      const time = now;

      const theme = document.documentElement.getAttribute('data-theme') || 'light';
      if (theme !== cachedTheme) {
        cachedTheme = theme;
        refreshPaperBg();
      }
      const isDark = theme === 'dark';

      /* Flat page color — avoids body radial gradients showing through (no “framed” gradient) */
      ctx.fillStyle = paperBg;
      ctx.fillRect(0, 0, w, h);
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      // --- Flow strands ---
      for (let s = 0; s < STRANDS; s++) {
        const tMain = (phase + seeds[s].off) % 1;
        const lane = seeds[s].lane;
        const raw = pointOnStrand(tMain, lane, w, h, time, anchors);
        const pos = repelFromPointer(raw.x, raw.y, w, h, pointer.mx, pointer.my, pointer.blend);
        const tr = trails[s];
        tr.push(pos);
        if (tr.length > TRAIL) tr.shift();

        const nearSpine = Math.abs(lane) < 0.12;
        const r = isDark ? (nearSpine ? 168 : 150) : nearSpine ? 52 : 44;
        const g = isDark ? (nearSpine ? 188 : 172) : nearSpine ? 78 : 68;
        const b = isDark ? (nearSpine ? 210 : 196) : nearSpine ? 98 : 86;

        for (let i = 1; i < tr.length; i++) {
          const age = i / tr.length;
          const a = age * age * (nearSpine ? 0.32 : 0.18) * (isDark ? 0.85 : 1);
          ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${a})`;
          ctx.lineWidth = (nearSpine ? 0.75 : 0.4) + age * (nearSpine ? 0.45 : 0.28);
          ctx.beginPath();
          ctx.moveTo(tr[i - 1].x, tr[i - 1].y);
          ctx.lineTo(tr[i].x, tr[i].y);
          ctx.stroke();
        }
      }

      // --- Drops: dense near nozzle (t≈0), sparse downstream ---
      for (const d of dots) {
        if (!reduced) {
          d.t += d.speed * dt * 0.056;
          if (d.t >= 1) d.t -= 1;
        }
        const along = d.t;
        const streamFalloff = Math.pow(1 - along, 1.05);
        const tt = Math.min(0.998, Math.max(0.002, along + d.lane * 0.035));
        // Widen effective lane with distance → more dots at periphery when far
        const laneSpread = d.lane * (1 + 1.6 * along * along);
        const laneClamped = Math.max(-0.98, Math.min(0.98, laneSpread));
        const raw = pointOnStrand(tt, laneClamped, w, h, time, anchors);
        const pos = repelFromPointer(raw.x, raw.y, w, h, pointer.mx, pointer.my, pointer.blend);
        const spineBoost = Math.exp(-((d.lane * 3.8) ** 2));
        const edgeMix = 0.35 + 0.4 * (1 - along) * spineBoost + 0.45 * along;
        const alpha = (0.1 + streamFalloff * 0.8) * edgeMix;
        ctx.fillStyle = isDark ? `rgba(180, 198, 220, ${alpha * 0.9})` : `rgba(32, 52, 78, ${alpha})`;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, d.r * (0.7 + streamFalloff * 0.4), 0, Math.PI * 2);
        ctx.fill();
      }

      if (!reduced) {
        rafRef.current = requestAnimationFrame(drawFrame);
      }
    }

    ro = new ResizeObserver(() => {
      sizeCanvas();
    });
    ro.observe(container);
    sizeCanvas();

    if (heroEl) {
      heroEl.addEventListener('pointermove', syncPointerFromEvent, { passive: true });
      heroEl.addEventListener('pointerleave', onHeroPointerLeave);
    }

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) {
      phaseRef.current = 0.22;
      drawFrame(performance.now());
    } else {
      lastRef.current = performance.now();
      rafRef.current = requestAnimationFrame(drawFrame);
    }

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      if (heroEl) {
        heroEl.removeEventListener('pointermove', syncPointerFromEvent);
        heroEl.removeEventListener('pointerleave', onHeroPointerLeave);
      }
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      className="home-hero-particle-root"
      role="img"
      aria-label={ariaLabel ?? 'Animated ink-toned particle stream'}
    >
      <canvas ref={canvasRef} />
    </div>
  );
}
