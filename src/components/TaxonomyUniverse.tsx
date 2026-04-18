import { useMemo, useState, type CSSProperties } from 'react';

interface L2 {
  id: string;
  name: string;
}
interface L1 {
  id: string;
  name: string;
  color: string;
  subcategories: L2[];
}

interface Props {
  taxonomy: L1[];
  locale: 'zh' | 'en';
  basePath: string;
  labels: {
    eyebrow: string;
    title: string;
    sub: string;
    dims: string;
  };
}

interface AnchorSpec {
  x: number;
  y: number;
  outward: number;
  span: number;
  dur: number;
  dir: 'normal' | 'reverse';
}

const ANCHORS: Record<string, AnchorSpec> = {
  llm:        { x: 200,  y: 370, outward: 135, span: 140, dur: 48, dir: 'normal'  },
  aigc:       { x: 640,  y: 450, outward: 90,  span: 90,  dur: 60, dir: 'reverse' },
  multimodal: { x: 1000, y: 370, outward: 270, span: 90,  dur: 52, dir: 'normal'  },
  agent:      { x: 1400, y: 450, outward: 45,  span: 100, dur: 56, dir: 'reverse' },
};

const L2_RADIUS = 130;
const L2_LABEL_OFFSET = 26;
const VIEW_W = 1600;
const VIEW_H = 820;

function polar(anchor: { x: number; y: number }, angleDeg: number, radius: number) {
  const r = (angleDeg * Math.PI) / 180;
  return { x: anchor.x + Math.cos(r) * radius, y: anchor.y + Math.sin(r) * radius };
}

function pickTextAnchor(angleDeg: number): 'start' | 'middle' | 'end' {
  const c = Math.cos((angleDeg * Math.PI) / 180);
  if (c > 0.3) return 'start';
  if (c < -0.3) return 'end';
  return 'middle';
}

function mulberry32(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const GRID_X = [200, 400, 600, 800, 1000, 1200, 1400];
const BRIDGE_ORDER = ['llm', 'aigc', 'multimodal', 'agent'];

export default function TaxonomyUniverse({ taxonomy, locale, basePath, labels }: Props) {
  const [hoveredL1, setHoveredL1] = useState<string | null>(null);

  const clusters = useMemo(() => {
    return taxonomy
      .filter(l1 => ANCHORS[l1.id])
      .map(l1 => {
        const spec = ANCHORS[l1.id];
        const anchor = { x: spec.x, y: spec.y };
        const n = l1.subcategories.length;
        const start = spec.outward - spec.span / 2;
        const step = n > 1 ? spec.span / (n - 1) : 0;
        const l2s = l1.subcategories.map((sc, i) => {
          const angle = n === 1 ? spec.outward : start + step * i;
          const pos = polar(anchor, angle, L2_RADIUS);
          const label = polar(anchor, angle, L2_RADIUS + L2_LABEL_OFFSET);
          return {
            ...sc,
            angle,
            x: pos.x,
            y: pos.y,
            labelX: label.x,
            labelY: label.y,
            textAnchor: pickTextAnchor(angle),
          };
        });
        return { l1, spec, anchor, l2s };
      });
  }, [taxonomy]);

  const bridges = useMemo(() => {
    const byId = new Map(clusters.map(c => [c.l1.id, c.anchor]));
    const out: { d: string; key: string }[] = [];
    for (let i = 0; i < BRIDGE_ORDER.length - 1; i++) {
      const a = byId.get(BRIDGE_ORDER[i]);
      const b = byId.get(BRIDGE_ORDER[i + 1]);
      if (!a || !b) continue;
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.hypot(dx, dy) || 1;
      const sign = i % 2 === 0 ? 1 : -1;
      const ctrl = { x: mid.x + (-dy / len) * 60 * sign, y: mid.y + (dx / len) * 60 * sign };
      out.push({
        key: `${BRIDGE_ORDER[i]}-${BRIDGE_ORDER[i + 1]}`,
        d: `M ${a.x} ${a.y} Q ${ctrl.x} ${ctrl.y} ${b.x} ${b.y}`,
      });
    }
    return out;
  }, [clusters]);

  const dots = useMemo(() => {
    const rand = mulberry32(0xbe11cafe);
    const arr: { x: number; y: number; rx: number; ry: number; dur: number }[] = [];
    for (let i = 0; i < 22; i++) {
      const x = 60 + rand() * (VIEW_W - 120);
      const y = 40 + rand() * (VIEW_H - 80);
      const rx = 10 + rand() * 10;
      const ry = 6 + rand() * 10;
      const dur = 20 + rand() * 20;
      arr.push({ x, y, rx, ry, dur });
    }
    return arr;
  }, []);

  const clusterOpacity = (id: string): number =>
    hoveredL1 === null || hoveredL1 === id ? 1 : 0.65;

  const mainCircleStyle = (id: string) =>
    hoveredL1 === id ? { fillOpacity: 0.36, strokeOpacity: 1 } : { fillOpacity: 0.22, strokeOpacity: 0.55 };

  return (
    <section className="universe-wrap" aria-label={labels.title}>
      <div className="universe-header">
        <div className="universe-eyebrow">{labels.eyebrow}</div>
        <h1 className="universe-title">{labels.title}</h1>
        <p className="universe-sub">{labels.sub}</p>
      </div>

      <svg
        className="universe-svg"
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        role="img"
        aria-label={labels.title}
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Coordinate grid — lightest bottom layer */}
        <g aria-hidden="true">
          {GRID_X.map(x => (
            <line
              key={`grid-${x}`}
              x1={x}
              x2={x}
              y1={40}
              y2={VIEW_H - 40}
              stroke="var(--uv-line)"
              strokeOpacity={0.08}
              strokeWidth={0.5}
              strokeDasharray="2 8"
            />
          ))}
        </g>

        {/* Galaxy bridges between L1 clusters */}
        <g aria-hidden="true">
          {bridges.map(b => (
            <path
              key={b.key}
              d={b.d}
              fill="none"
              stroke="var(--uv-line)"
              strokeWidth={1}
              strokeOpacity={0.4}
            />
          ))}
        </g>

        {/* Floating model dots — deterministic */}
        <g aria-hidden="true">
          {dots.map((d, i) => (
            <g key={`dot-${i}`} transform={`translate(${d.x} ${d.y})`}>
              <circle r={2} fill="var(--uv-label-muted)" fillOpacity={0.35}>
                <animateMotion
                  path={`M ${-d.rx} 0 a ${d.rx} ${d.ry} 0 1 0 ${d.rx * 2} 0 a ${d.rx} ${d.ry} 0 1 0 ${-d.rx * 2} 0`}
                  dur={`${d.dur.toFixed(1)}s`}
                  repeatCount="indefinite"
                />
              </circle>
            </g>
          ))}
        </g>

        {/* Clusters */}
        {clusters.map(({ l1, spec, anchor, l2s }) => {
          const hover = hoveredL1 === l1.id;
          const main = mainCircleStyle(l1.id);
          const rotateStyle: CSSProperties = {
            transformOrigin: `${anchor.x}px ${anchor.y}px`,
            transformBox: 'view-box' as unknown as CSSProperties['transformBox'],
            animationName: 'uvRotate',
            animationDuration: `${spec.dur}s`,
            animationDirection: spec.dir,
            animationIterationCount: 'infinite',
            animationTimingFunction: 'linear',
          };

          return (
            <g
              key={l1.id}
              style={{ opacity: clusterOpacity(l1.id), transition: 'opacity 0.2s' }}
              onMouseEnter={() => setHoveredL1(l1.id)}
              onMouseLeave={() => setHoveredL1(prev => (prev === l1.id ? null : prev))}
            >
              {/* L1 outer glow + middle ring (static) */}
              <circle cx={anchor.x} cy={anchor.y} r={110} fill={l1.color} fillOpacity={0.04} />
              <circle cx={anchor.x} cy={anchor.y} r={88} fill={l1.color} fillOpacity={0.10} />

              {/* Rotating: L2 connections, circles, labels */}
              <g className="uv-cluster-rotate" style={rotateStyle}>
                {l2s.map(l2 => (
                  <line
                    key={`line-${l2.id}`}
                    x1={anchor.x}
                    y1={anchor.y}
                    x2={l2.x}
                    y2={l2.y}
                    stroke={l1.color}
                    strokeOpacity={0.28}
                    strokeWidth={1}
                  />
                ))}
                {l2s.map(l2 => (
                  <a
                    key={`l2-${l2.id}`}
                    href={`${basePath}${l1.id}/#${l2.id}`}
                    aria-label={`${l1.name} — ${l2.name}`}
                  >
                    <circle
                      cx={l2.x}
                      cy={l2.y}
                      r={12}
                      fill={l1.color}
                      fillOpacity={0.18}
                      stroke={l1.color}
                      strokeOpacity={0.6}
                      strokeWidth={1.2}
                      style={{ cursor: 'pointer' }}
                    />
                    <text
                      x={l2.labelX}
                      y={l2.labelY}
                      fontSize={12}
                      fontWeight={600}
                      fill="var(--uv-label)"
                      textAnchor={l2.textAnchor}
                      dominantBaseline="middle"
                      style={{ pointerEvents: 'none' }}
                    >
                      {l2.name}
                    </text>
                  </a>
                ))}
              </g>

              {/* L1 main circle (static, drawn above rotating lines) */}
              <a
                href={`${basePath}${l1.id}/`}
                aria-label={l1.name}
              >
                <circle
                  cx={anchor.x}
                  cy={anchor.y}
                  r={68}
                  fill={l1.color}
                  stroke={l1.color}
                  strokeWidth={1.5}
                  style={{
                    cursor: 'pointer',
                    transition: 'fill-opacity 0.2s, stroke-opacity 0.2s',
                    ...main,
                  }}
                />
                <text
                  x={anchor.x}
                  y={anchor.y + 5}
                  fontSize={17}
                  fontWeight={700}
                  fill="var(--uv-anchor-text)"
                  textAnchor="middle"
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  {l1.name}
                </text>
                <text
                  x={anchor.x}
                  y={anchor.y + 27}
                  fontSize={11}
                  fill="var(--uv-label-muted)"
                  textAnchor="middle"
                  fontFamily="var(--font-mono)"
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  {l2s.length} {labels.dims}
                </text>
              </a>
              {/* mark hover variable for unused linter silence */}
              {hover ? null : null}
            </g>
          );
        })}
      </svg>

      <div className="universe-legend" role="list">
        {clusters.map(({ l1, l2s }) => (
          <button
            key={l1.id}
            type="button"
            className="uv-legend-chip"
            role="listitem"
            onMouseEnter={() => setHoveredL1(l1.id)}
            onMouseLeave={() => setHoveredL1(prev => (prev === l1.id ? null : prev))}
            onFocus={() => setHoveredL1(l1.id)}
            onBlur={() => setHoveredL1(prev => (prev === l1.id ? null : prev))}
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.location.href = `${basePath}${l1.id}/`;
              }
            }}
            style={{ ['--chip-color' as string]: l1.color, color: 'inherit' } as CSSProperties}
          >
            <span
              className="uv-legend-dot"
              style={{ backgroundColor: l1.color, color: l1.color }}
              aria-hidden="true"
            />
            <span>{l1.name}</span>
            <span className="uv-legend-count">{l2s.length}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
