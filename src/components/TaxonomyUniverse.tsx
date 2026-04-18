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
  };
}

interface AnchorSpec {
  x: number;
  y: number;
  outward: number;   // degrees; 270 = up, 90 = down
  span: number;
  radius: number;
  labelBelow: boolean;
}

const ANCHORS: Record<string, AnchorSpec> = {
  llm:        { x: 200,  y: 370, outward: 270, span: 160, radius: 145, labelBelow: true  },
  aigc:       { x: 640,  y: 450, outward: 90,  span: 120, radius: 195, labelBelow: false },
  multimodal: { x: 1000, y: 370, outward: 270, span: 110, radius: 145, labelBelow: true  },
  agent:      { x: 1400, y: 450, outward: 90,  span: 100, radius: 185, labelBelow: false },
};

const L2_LABEL_OFFSET = 26;
const L2_OUTER_RING = 11;  // L2 marker outer ring radius
const DISC_EDGE_GAP = 8;   // gap outside L1 disc border before line starts
const L2_EDGE_GAP = 6;     // gap before L2 outer ring (keep spoke off the node)
const L1_RADIUS = 58;
const L1_HALO_RADIUS = 148;
const VIEW_W = 1600;
const VIEW_H = 820;
const BASELINE_Y = 410;

function gappedLine(
  from: { x: number; y: number },
  to: { x: number; y: number },
  fromGap: number,
  toGap: number
) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  return {
    x1: from.x + ux * fromGap,
    y1: from.y + uy * fromGap,
    x2: to.x - ux * toGap,
    y2: to.y - uy * toGap,
  };
}

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

export default function TaxonomyUniverse({ taxonomy, basePath, labels }: Props) {
  const [hoveredL1, setHoveredL1] = useState<string | null>(null);

  const clusters = useMemo(() => {
    return taxonomy
      .filter(l1 => ANCHORS[l1.id])
      .map((l1, index) => {
        const spec = ANCHORS[l1.id];
        const anchor = { x: spec.x, y: spec.y };
        const n = l1.subcategories.length;
        const start = spec.outward - spec.span / 2;
        const step = n > 1 ? spec.span / (n - 1) : 0;
        const l2s = l1.subcategories.map((sc, i) => {
          const angle = n === 1 ? spec.outward : start + step * i;
          const pos = polar(anchor, angle, spec.radius);
          const label = polar(anchor, angle, spec.radius + L2_LABEL_OFFSET);
          const spoke = gappedLine(
            anchor,
            pos,
            L1_RADIUS + DISC_EDGE_GAP,
            L2_OUTER_RING + L2_EDGE_GAP
          );
          return {
            ...sc,
            angle,
            x: pos.x,
            y: pos.y,
            labelX: label.x,
            labelY: label.y,
            textAnchor: pickTextAnchor(angle),
            spoke,
          };
        });
        const orderStr = String(index + 1).padStart(2, '0');
        const blockOffset = spec.labelBelow ? 1 : -1;
        const labelBlockY = anchor.y + blockOffset * 90;
        return { l1, spec, anchor, l2s, orderStr, labelBlockY, blockOffset };
      });
  }, [taxonomy]);


  const dots = useMemo(() => {
    const rand = mulberry32(0xbe11cafe);
    const arr: { x: number; y: number; rx: number; ry: number; dur: number }[] = [];
    for (let i = 0; i < 18; i++) {
      const x = 60 + rand() * (VIEW_W - 120);
      const y = 40 + rand() * (VIEW_H - 80);
      const rx = 10 + rand() * 10;
      const ry = 6 + rand() * 10;
      const dur = 22 + rand() * 20;
      arr.push({ x, y, rx, ry, dur });
    }
    return arr;
  }, []);

  const clusterOpacity = (id: string): number =>
    hoveredL1 === null || hoveredL1 === id ? 1 : 0.55;

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
        {/* ── Coordinate grid verticals ── */}
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
          {/* Horizontal baseline axis */}
          <line
            x1={80}
            x2={VIEW_W - 80}
            y1={BASELINE_Y}
            y2={BASELINE_Y}
            stroke="var(--uv-line)"
            strokeOpacity={0.22}
            strokeWidth={0.75}
            strokeDasharray="1 6"
          />
          {/* Baseline ticks at each anchor x */}
          {clusters.map(c => (
            <line
              key={`tick-${c.l1.id}`}
              x1={c.anchor.x}
              x2={c.anchor.x}
              y1={BASELINE_Y - 6}
              y2={BASELINE_Y + 6}
              stroke="var(--uv-line)"
              strokeOpacity={0.5}
              strokeWidth={1}
            />
          ))}
        </g>

        {/* ── Editorial corner brackets ── */}
        <g aria-hidden="true" stroke="var(--uv-line)" strokeOpacity={0.45} strokeWidth={1} fill="none">
          <path d="M 40 80 L 40 40 L 80 40" />
          <path d={`M ${VIEW_W - 80} 40 L ${VIEW_W - 40} 40 L ${VIEW_W - 40} 80`} />
          <path d={`M 40 ${VIEW_H - 80} L 40 ${VIEW_H - 40} L 80 ${VIEW_H - 40}`} />
          <path d={`M ${VIEW_W - 80} ${VIEW_H - 40} L ${VIEW_W - 40} ${VIEW_H - 40} L ${VIEW_W - 40} ${VIEW_H - 80}`} />
        </g>

        {/* ── Corner meta readouts (editorial framing) ── */}
        <g
          aria-hidden="true"
          fill="var(--uv-label-muted)"
          fontFamily="var(--font-mono)"
          fontSize={10}
          style={{ letterSpacing: '0.18em', textTransform: 'uppercase' }}
        >
          <text x={56} y={32}>BH · FIELD MAP</text>
          <text x={VIEW_W - 56} y={32} textAnchor="end">v2026.04</text>
          <text x={56} y={VIEW_H - 16}>{`N = ${taxonomy.length} DOMAINS`}</text>
          <text x={VIEW_W - 56} y={VIEW_H - 16} textAnchor="end">BENCHMARK HUB</text>
        </g>


        {/* ── Floating decorative dots ── */}
        <g aria-hidden="true">
          {dots.map((d, i) => (
            <g key={`dot-${i}`} transform={`translate(${d.x} ${d.y})`}>
              <circle r={2} fill="var(--uv-label-muted)" fillOpacity={0.3}>
                <animateMotion
                  path={`M ${-d.rx} 0 a ${d.rx} ${d.ry} 0 1 0 ${d.rx * 2} 0 a ${d.rx} ${d.ry} 0 1 0 ${-d.rx * 2} 0`}
                  dur={`${d.dur.toFixed(1)}s`}
                  repeatCount="indefinite"
                />
              </circle>
            </g>
          ))}
        </g>

        {/* ── Clusters ── */}
        {clusters.map(({ l1, anchor, l2s, orderStr, labelBlockY, blockOffset }, idx) => {
          const hover = hoveredL1 === l1.id;
          return (
            <g
              key={l1.id}
              style={{ opacity: clusterOpacity(l1.id), transition: 'opacity 0.3s' }}
              onMouseEnter={() => setHoveredL1(l1.id)}
              onMouseLeave={() => setHoveredL1(prev => (prev === l1.id ? null : prev))}
            >
              {/* Soft halo — gentle breathing via CSS opacity keyframes */}
              <circle
                cx={anchor.x}
                cy={anchor.y}
                r={L1_HALO_RADIUS}
                fill={l1.color}
                fillOpacity={0.05}
                className="uv-halo"
                style={{ animationDelay: `${idx * 1.6}s` } as CSSProperties}
              />
              {/* Dot-dash spokes (·——·——·) from L1 disc edge to each L2 */}
              {l2s.map(l2 => (
                <line
                  key={`spoke-${l2.id}`}
                  x1={l2.spoke.x1}
                  y1={l2.spoke.y1}
                  x2={l2.spoke.x2}
                  y2={l2.spoke.y2}
                  stroke={l1.color}
                  strokeOpacity={hover ? 0.8 : 0.6}
                  strokeWidth={1.2}
                  strokeDasharray="0.1 5 8 5"
                  strokeLinecap="round"
                  style={{ transition: 'stroke-opacity 0.25s' }}
                />
              ))}

              {/* L2 target-style markers + labels */}
              {l2s.map(l2 => (
                <a
                  key={`l2-${l2.id}`}
                  href={`${basePath}${l1.id}/#${l2.id}`}
                  aria-label={`${l1.name} — ${l2.name}`}
                >
                  <title>{l2.name}</title>
                  {/* outer hollow ring */}
                  <circle
                    cx={l2.x}
                    cy={l2.y}
                    r={11}
                    fill="transparent"
                    stroke={l1.color}
                    strokeOpacity={0.55}
                    strokeWidth={1}
                    style={{ cursor: 'pointer' }}
                  />
                  {/* inner solid dot */}
                  <circle
                    cx={l2.x}
                    cy={l2.y}
                    r={3.5}
                    fill={l1.color}
                    fillOpacity={0.95}
                    style={{ cursor: 'pointer' }}
                  />
                  <text
                    x={l2.labelX}
                    y={l2.labelY}
                    fontSize={11}
                    fontWeight={500}
                    fill="var(--uv-label)"
                    textAnchor={l2.textAnchor}
                    dominantBaseline="middle"
                    style={{ pointerEvents: 'none', letterSpacing: '0.01em' }}
                  >
                    {l2.name}
                  </text>
                </a>
              ))}

              {/* L1 disc + large mono order number */}
              <a href={`${basePath}${l1.id}/`} aria-label={l1.name}>
                <title>{l1.name}</title>
                <circle
                  cx={anchor.x}
                  cy={anchor.y}
                  r={L1_RADIUS}
                  fill={l1.color}
                  fillOpacity={hover ? 0.3 : 0.18}
                  stroke={l1.color}
                  strokeOpacity={hover ? 1 : 0.7}
                  strokeWidth={1.4}
                  style={{
                    cursor: 'pointer',
                    transition: 'fill-opacity 0.25s, stroke-opacity 0.25s',
                  }}
                />
                {/* inner hairline for dimensional detail */}
                <circle
                  cx={anchor.x}
                  cy={anchor.y}
                  r={L1_RADIUS - 10}
                  fill="none"
                  stroke={l1.color}
                  strokeOpacity={0.35}
                  strokeWidth={0.6}
                />
                <text
                  x={anchor.x}
                  y={anchor.y + 14}
                  textAnchor="middle"
                  fontFamily="var(--font-mono)"
                  fontSize={40}
                  fontWeight={500}
                  fill="var(--uv-anchor-text)"
                  style={{ pointerEvents: 'none', userSelect: 'none', letterSpacing: '0.02em' }}
                >
                  {orderStr}
                </text>
              </a>

              {/* Label block: only the big L1 name */}
              <g transform={`translate(${anchor.x} ${labelBlockY})`} style={{ pointerEvents: 'none' }}>
                <text
                  x={0}
                  y={blockOffset > 0 ? 20 : 0}
                  textAnchor="middle"
                  fontSize={32}
                  fontWeight={700}
                  fill="var(--uv-label-active)"
                  style={{ letterSpacing: '-0.01em' }}
                >
                  {l1.name}
                </text>
              </g>
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
