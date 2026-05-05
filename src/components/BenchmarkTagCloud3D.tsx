import { useEffect, useRef } from 'react';

export type BenchmarkTagCloudEntry = {
  label: string;
  href: string;
};

type Props = {
  entries: BenchmarkTagCloudEntry[];
  ariaLabel?: string;
};

const SVG_NS = 'http://www.w3.org/2000/svg';
const DEG = Math.PI / 180;

function fibonacciUnit(i: number, n: number) {
  const l = n + 1;
  const phi = Math.acos(-1 + (2 * (i + 1)) / l);
  const theta = Math.sqrt(l * Math.PI) * phi;
  return {
    x: Math.cos(theta) * Math.sin(phi),
    y: Math.sin(theta) * Math.sin(phi),
    z: Math.cos(phi),
  };
}

function truncateVisualLabel(s: string, max = 28): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

export default function BenchmarkTagCloud3D({ entries, ariaLabel }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = wrapRef.current;
    if (!container || entries.length === 0) return;
    const hostEl: HTMLElement = container;

    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    /* Interactive labels: must not use role="img" (would suppress link activation in some cases) */
    if (ariaLabel) {
      svg.setAttribute('aria-label', ariaLabel);
      svg.setAttribute('role', 'region');
    } else {
      svg.setAttribute('aria-hidden', 'true');
    }

    type Item = {
      idx: number;
      ux: number;
      uy: number;
      uz: number;
      text: SVGTextElement;
      link: SVGAElement;
    };

    /** Reordering `<a>` nodes every frame breaks click (mousedown/up must hit the same element). */
    let lastZOrderKey = '';

    const holder: Item[] = [];
    const n = entries.length;

    for (let i = 0; i < n; i++) {
      const u = fibonacciUnit(i, n);
      const len = Math.hypot(u.x, u.y, u.z) || 1;
      const entry = entries[i];
      const link = document.createElementNS(SVG_NS, 'a');
      link.setAttribute('href', entry.href);
      link.setAttribute('title', entry.label);

      link.addEventListener('click', (ev) => {
        if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
        ev.preventDefault();
        window.location.assign(entry.href);
      });

      const text = document.createElementNS(SVG_NS, 'text');
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dominant-baseline', 'central');
      text.textContent = truncateVisualLabel(entry.label);

      link.appendChild(text);
      svg.appendChild(link);

      holder.push({
        idx: i,
        ux: u.x / len,
        uy: u.y / len,
        uz: u.z / len,
        text,
        link,
      });
    }

    hostEl.appendChild(svg);

    let raf = 0;
    let mousePos = { x: 0, y: 0 };
    let pauseRotate = false;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const settings = {
      speed: 0.35,
      fov: 720,
      opacityOut: 0.12,
      fontSizeMin: 13,
      fontSizeMax: 22,
      sphereFill: 0.75,
      radiusFloor: 104,
      clickOpacityCutoff: 0.2,
    };

    function syncTypography() {
      const cs = getComputedStyle(hostEl);
      const fill = cs.color || '#0f172a';
      const fontFamily = cs.fontFamily || 'system-ui, sans-serif';
      for (const item of holder) {
        item.text.setAttribute('fill', fill);
        item.text.setAttribute('font-family', fontFamily);
      }
    }

    syncTypography();
    const themeObserver = new MutationObserver(syncTypography);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    function onPointerMove(e: PointerEvent) {
      const rect = svg.getBoundingClientRect();
      mousePos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    svg.addEventListener('pointermove', onPointerMove);

    const onEnter = () => {
      pauseRotate = true;
    };
    const onLeave = () => {
      pauseRotate = false;
    };
    const onLinkPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      pauseRotate = true;
    };
    holder.forEach(({ link }) => {
      link.addEventListener('pointerenter', onEnter);
      link.addEventListener('pointerleave', onLeave);
      link.addEventListener('pointerdown', onLinkPointerDown);
    });

    function rotateStep() {
      const w = svg.clientWidth || 400;
      const h = svg.clientHeight || 400;
      const c2x = w / 2;
      const c2y = h / 2;

      const speedX = settings.speed / c2x;
      const speedY = settings.speed / c2y;
      const fx = speedX * mousePos.x - settings.speed;
      const fy = settings.speed - speedY * mousePos.y;

      const angleX = fx * DEG;
      const angleY = fy * DEG;
      const sinX = Math.sin(angleX);
      const cosX = Math.cos(angleX);
      const sinY = Math.sin(angleY);
      const cosY = Math.cos(angleY);

      for (const item of holder) {
        let { ux, uy, uz } = item;
        const rx = ux;
        const rz = uy * sinY + uz * cosY;
        ux = rx * cosX + rz * sinX;
        uy = uy * cosY + uz * -sinY;
        uz = rx * -sinX + rz * cosX;
        item.ux = ux;
        item.uy = uy;
        item.uz = uz;
      }
    }

    function projectAndPaint() {
      const w = svg.clientWidth || 400;
      const h = svg.clientHeight || 400;
      const c2x = w / 2;
      const c2y = h / 2;
      const diameter = Math.min(w, h) * settings.sphereFill;
      const radius = Math.max(diameter / 2, settings.radiusFloor);

      for (const item of holder) {
        const px = item.ux * radius;
        const py = item.uy * radius;
        const pz = item.uz * radius;

        const scale = settings.fov / (settings.fov + pz);
        const x2 = px * scale + c2x;
        const y2 = py * scale + c2y;

        item.text.setAttribute('x', String(x2));
        item.text.setAttribute('y', String(y2));

        let opacity = (radius - pz) / diameter;
        if (opacity < settings.opacityOut) opacity = settings.opacityOut;
        if (opacity > 1) opacity = 1;

        item.text.setAttribute('opacity', String(opacity));

        const fs =
          settings.fontSizeMin +
          (settings.fontSizeMax - settings.fontSizeMin) * Math.pow(opacity, 1.15);
        item.text.setAttribute('font-size', `${fs}px`);

        item.text.style.pointerEvents = 'visiblePainted';
        item.link.style.pointerEvents = opacity < settings.clickOpacityCutoff ? 'none' : 'auto';
      }

      const sorted = [...holder].sort((a, b) => a.uz - b.uz);
      const zOrderKey = sorted.map((it) => it.idx).join('|');
      if (zOrderKey !== lastZOrderKey) {
        lastZOrderKey = zOrderKey;
        for (const item of sorted) {
          svg.appendChild(item.link);
        }
      }
    }

    function tick() {
      if (!reducedMotion && !pauseRotate) {
        rotateStep();
      }
      projectAndPaint();
      if (!reducedMotion) {
        raf = requestAnimationFrame(tick);
      }
    }

    if (reducedMotion) {
      projectAndPaint();
    } else {
      tick();
    }

    const ro = new ResizeObserver(() => {
      projectAndPaint();
    });
    ro.observe(hostEl);

    return () => {
      themeObserver.disconnect();
      ro.disconnect();
      cancelAnimationFrame(raf);
      svg.removeEventListener('pointermove', onPointerMove);
      holder.forEach(({ link }) => {
        link.removeEventListener('pointerenter', onEnter);
        link.removeEventListener('pointerleave', onLeave);
        link.removeEventListener('pointerdown', onLinkPointerDown);
      });
      svg.remove();
    };
  }, [entries, ariaLabel]);

  return (
    <div
      ref={wrapRef}
      className="home-benchmark-tag-cloud-host"
      data-component="benchmark-tag-cloud-3d"
    />
  );
}
