import { useState, useEffect, useCallback, useMemo } from 'react';

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface SunburstNode {
  name: string;
  value?: number;
  id?: string;
  l1Id?: string;
  itemStyle?: { color: string };
  children?: SunburstNode[];
}

interface Props {
  data: SunburstNode;
  locale: 'zh' | 'en';
  basePath: string;
}

/* ------------------------------------------------------------------ */
/*  Geometry helpers                                                   */
/* ------------------------------------------------------------------ */

/** Polar to cartesian, angle in *radians*, 0 = top (12-o'clock). */
function polar(cx: number, cy: number, r: number, angleRad: number) {
  // SVG: 0 rad = up  =>  x = sin(a), y = -cos(a)
  return {
    x: cx + r * Math.sin(angleRad),
    y: cy - r * Math.cos(angleRad),
  };
}

/** Build an SVG quadratic-curve path between two points (a gentle arc). */
function curvedPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  cx: number,
  cy: number,
) {
  // Control point is biased toward the center for a nice inward curve
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const cpx = mx + (cx - mx) * 0.35;
  const cpy = my + (cy - my) * 0.35;
  return `M${x1},${y1} Q${cpx},${cpy} ${x2},${y2}`;
}

/* ------------------------------------------------------------------ */
/*  Layout constants                                                  */
/* ------------------------------------------------------------------ */

const VB_W = 800;
const VB_H = 600;
const CX = VB_W / 2;   // 400
const CY = VB_H / 2;   // 300

const R_RING1 = 120;   // L1
const R_RING2 = 210;   // L2
const R_RING3 = 290;   // L3

const L1_R = 26;       // L1 node radius
const L2_R = 13;       // L2 node radius
const L3_R = 5;        // L3 node radius

/* ------------------------------------------------------------------ */
/*  Precomputed layout for nodes                                      */
/* ------------------------------------------------------------------ */

interface NodeLayout {
  x: number;
  y: number;
  angle: number; // radians
}

interface L3Layout extends NodeLayout {
  name: string;
  id?: string;
  l1Id?: string;
  parentColor: string;
}

interface L2Layout extends NodeLayout {
  name: string;
  id?: string;
  parentColor: string;
  parentL1Id?: string;
  children: L3Layout[];
}

interface L1Layout extends NodeLayout {
  name: string;
  id?: string;
  color: string;
  children: L2Layout[];
}

function computeLayout(data: SunburstNode): L1Layout[] {
  const l1s = data.children ?? [];
  const l1Count = l1s.length;
  if (l1Count === 0) return [];

  // We give each L1 an equal angular sector. Start angle offset so
  // first item is near top-left for visual balance.
  const sectorAngle = (2 * Math.PI) / l1Count;
  const globalOffset = -Math.PI / l1Count; // rotate half a sector so items are symmetric

  return l1s.map((l1, i) => {
    const l1Angle = globalOffset + i * sectorAngle + sectorAngle / 2;
    const l1Pos = polar(CX, CY, R_RING1, l1Angle);
    const color = l1.itemStyle?.color ?? '#888';

    // Distribute L2 children within the sector
    const l2s = l1.children ?? [];
    const l2Spread = sectorAngle * 0.75; // use 75% of the sector
    const l2Start = l1Angle - l2Spread / 2;
    const l2Step = l2s.length > 1 ? l2Spread / (l2s.length - 1) : 0;

    const l2Layouts: L2Layout[] = l2s.map((l2, j) => {
      const l2Angle = l2s.length === 1 ? l1Angle : l2Start + j * l2Step;
      const l2Pos = polar(CX, CY, R_RING2, l2Angle);

      // Distribute L3 children around the L2 position
      const l3s = l2.children ?? [];
      const l3Spread = l2s.length > 1 ? l2Step * 0.7 : sectorAngle * 0.5;
      const l3Start = l2Angle - l3Spread / 2;
      const l3Step = l3s.length > 1 ? l3Spread / (l3s.length - 1) : 0;

      const l3Layouts: L3Layout[] = l3s.map((l3, k) => {
        const l3Angle = l3s.length === 1 ? l2Angle : l3Start + k * l3Step;
        const l3Pos = polar(CX, CY, R_RING3, l3Angle);
        return {
          ...l3Pos,
          angle: l3Angle,
          name: l3.name,
          id: l3.id,
          l1Id: l3.l1Id ?? l1.id,
          parentColor: color,
        };
      });

      return {
        ...l2Pos,
        angle: l2Angle,
        name: l2.name,
        id: l2.id,
        parentColor: color,
        parentL1Id: l1.id,
        children: l3Layouts,
      };
    });

    return {
      ...l1Pos,
      angle: l1Angle,
      name: l1.name,
      id: l1.id,
      color,
      children: l2Layouts,
    };
  });
}

/* ------------------------------------------------------------------ */
/*  Center decoration: nested geometric shape                         */
/* ------------------------------------------------------------------ */

function CenterDecoration({ isDark }: { isDark: boolean }) {
  const stroke = isDark ? 'rgba(148,163,184,0.25)' : 'rgba(100,116,139,0.18)';
  const fill = isDark ? 'rgba(59,130,246,0.06)' : 'rgba(59,130,246,0.04)';

  // Build two nested hexagons
  const hexPoints = (r: number) => {
    const pts: string[] = [];
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i - Math.PI / 2;
      pts.push(`${CX + r * Math.cos(a)},${CY + r * Math.sin(a)}`);
    }
    return pts.join(' ');
  };

  return (
    <g className="center-decoration">
      {/* Outer hex */}
      <polygon
        points={hexPoints(44)}
        fill={fill}
        stroke={stroke}
        strokeWidth={1.2}
      />
      {/* Inner hex, rotated 30 deg */}
      <polygon
        points={(() => {
          const pts: string[] = [];
          for (let i = 0; i < 6; i++) {
            const a = (Math.PI / 3) * i - Math.PI / 2 + Math.PI / 6;
            pts.push(`${CX + 26 * Math.cos(a)},${CY + 26 * Math.sin(a)}`);
          }
          return pts.join(' ');
        })()}
        fill="none"
        stroke={stroke}
        strokeWidth={0.8}
      />
      {/* Center dot */}
      <circle cx={CX} cy={CY} r={3} fill={stroke} />
      {/* Cross lines inside inner hex */}
      {[0, 60, 120].map((deg) => {
        const rad = (deg * Math.PI) / 180;
        return (
          <line
            key={deg}
            x1={CX + 18 * Math.cos(rad)}
            y1={CY + 18 * Math.sin(rad)}
            x2={CX - 18 * Math.cos(rad)}
            y2={CY - 18 * Math.sin(rad)}
            stroke={stroke}
            strokeWidth={0.5}
          />
        );
      })}
    </g>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                    */
/* ------------------------------------------------------------------ */

export default function SunburstChart({ data, locale, basePath }: Props) {
  const [hovered, setHovered] = useState<{
    key: string;
    name: string;
    x: number;
    y: number;
  } | null>(null);
  const [isDark, setIsDark] = useState(false);

  // Observe theme attribute
  useEffect(() => {
    const check = () => {
      setIsDark(
        document.documentElement.getAttribute('data-theme') === 'dark',
      );
    };
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    return () => obs.disconnect();
  }, []);

  // Layout
  const layout = useMemo(() => computeLayout(data), [data]);

  // Navigation
  const navigate = useCallback(
    (id?: string, l1Id?: string) => {
      if (l1Id && id) {
        // L3 benchmark
        window.location.href = `${basePath}${l1Id}/${id}/`;
      } else if (id) {
        // L1 category
        window.location.href = `${basePath}${id}/`;
      }
    },
    [basePath],
  );

  // Hover helpers
  const onEnter = useCallback(
    (key: string, name: string, svgX: number, svgY: number) => {
      setHovered({ key, name, x: svgX, y: svgY });
    },
    [],
  );
  const onLeave = useCallback(() => setHovered(null), []);

  // Theme-aware colours
  const ringStroke = isDark
    ? 'rgba(148,163,184,0.10)'
    : 'rgba(100,116,139,0.12)';
  const textFill = isDark ? '#e2e8f0' : '#334155';
  const subtextFill = isDark ? '#94a3b8' : '#64748b';
  const titleText = data.name || (locale === 'zh' ? 'AI 评测基准' : 'AI Benchmarks');

  return (
    <div
      className="w-full max-w-3xl mx-auto relative select-none"
      style={{ aspectRatio: `${VB_W} / ${VB_H}` }}
    >
      {/* SVG canvas */}
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
        style={{ overflow: 'visible' }}
      >
        {/* ---------- Definitions: filters & gradients ---------- */}
        <defs>
          {/* Glow filter for hovered nodes */}
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Subtle glow for idle L1 nodes */}
          <filter id="glow-subtle" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ---------- Orbital rings ---------- */}
        {[R_RING1 - 20, R_RING1, R_RING2, R_RING3, R_RING3 + 24].map((r) => (
          <circle
            key={r}
            cx={CX}
            cy={CY}
            r={r}
            fill="none"
            stroke={ringStroke}
            strokeWidth={r === R_RING1 || r === R_RING2 ? 1 : 0.6}
            strokeDasharray={
              r === R_RING1 || r === R_RING2
                ? '6 4'
                : r === R_RING3
                  ? '2 6'
                  : '1 8'
            }
          />
        ))}

        {/* ---------- Center decoration ---------- */}
        <CenterDecoration isDark={isDark} />

        {/* Center title */}
        <text
          x={CX}
          y={CY + 58}
          textAnchor="middle"
          fill={subtextFill}
          fontSize={11}
          fontWeight={500}
          style={{ letterSpacing: '0.05em' }}
        >
          {titleText}
        </text>

        {/* ---------- Connection lines: L1 -> L2 ---------- */}
        {layout.flatMap((l1) =>
          l1.children.map((l2) => (
            <path
              key={`conn-${l1.id}-${l2.id}`}
              d={curvedPath(l1.x, l1.y, l2.x, l2.y, CX, CY)}
              fill="none"
              stroke={l1.color}
              strokeWidth={1}
              opacity={
                hovered
                  ? hovered.key === `l1-${l1.id}` ||
                    hovered.key === `l2-${l2.id}`
                    ? 0.4
                    : 0.06
                  : 0.12
              }
              style={{ transition: 'opacity 0.3s ease' }}
            />
          )),
        )}

        {/* ---------- Connection lines: L2 -> L3 ---------- */}
        {layout.flatMap((l1) =>
          l1.children.flatMap((l2) =>
            l2.children.map((l3) => (
              <line
                key={`conn3-${l2.id}-${l3.id}`}
                x1={l2.x}
                y1={l2.y}
                x2={l3.x}
                y2={l3.y}
                stroke={l1.color}
                strokeWidth={0.6}
                opacity={
                  hovered
                    ? hovered.key === `l2-${l2.id}` ||
                      hovered.key === `l3-${l3.id}`
                      ? 0.35
                      : 0.04
                    : 0.08
                }
                style={{ transition: 'opacity 0.3s ease' }}
              />
            )),
          ),
        )}

        {/* ---------- L3 nodes ---------- */}
        {layout.flatMap((l1) =>
          l1.children.flatMap((l2) =>
            l2.children.map((l3) => {
              const key = `l3-${l3.id}`;
              const isHov = hovered?.key === key;
              const isRelated =
                hovered?.key === `l2-${l2.id}` ||
                hovered?.key === `l1-${l1.id}`;
              const dimmed = hovered && !isHov && !isRelated;
              return (
                <g key={key}>
                  {/* Glow halo */}
                  {isHov && (
                    <circle
                      cx={l3.x}
                      cy={l3.y}
                      r={L3_R + 6}
                      fill={l3.parentColor}
                      opacity={0.15}
                    />
                  )}
                  <circle
                    cx={l3.x}
                    cy={l3.y}
                    r={isHov ? L3_R + 2 : L3_R}
                    fill={l3.parentColor}
                    fillOpacity={isHov ? 0.6 : dimmed ? 0.08 : 0.2}
                    stroke={l3.parentColor}
                    strokeWidth={isHov ? 1.2 : 0.6}
                    strokeOpacity={isHov ? 0.8 : dimmed ? 0.1 : 0.35}
                    style={{
                      cursor: l3.id ? 'pointer' : 'default',
                      transition:
                        'r 0.2s ease, fill-opacity 0.3s ease, stroke-opacity 0.3s ease',
                    }}
                    onMouseEnter={() => onEnter(key, l3.name, l3.x, l3.y)}
                    onMouseLeave={onLeave}
                    onClick={() => navigate(l3.id, l3.l1Id)}
                  />
                </g>
              );
            }),
          ),
        )}

        {/* ---------- L2 nodes ---------- */}
        {layout.flatMap((l1) =>
          l1.children.map((l2) => {
            const key = `l2-${l2.id}`;
            const isHov = hovered?.key === key;
            const isRelated = hovered?.key === `l1-${l1.id}`;
            const dimmed = hovered && !isHov && !isRelated;
            return (
              <g key={key}>
                {/* Glow halo */}
                {isHov && (
                  <circle
                    cx={l2.x}
                    cy={l2.y}
                    r={L2_R + 10}
                    fill={l2.parentColor}
                    opacity={0.12}
                  />
                )}
                <circle
                  cx={l2.x}
                  cy={l2.y}
                  r={isHov ? L2_R + 3 : L2_R}
                  fill={l2.parentColor}
                  fillOpacity={isHov ? 0.28 : dimmed ? 0.06 : 0.14}
                  stroke={l2.parentColor}
                  strokeWidth={isHov ? 1.6 : 1}
                  strokeOpacity={isHov ? 0.8 : dimmed ? 0.12 : 0.5}
                  filter={isHov ? 'url(#glow)' : undefined}
                  style={{
                    cursor: 'pointer',
                    transition:
                      'r 0.2s ease, fill-opacity 0.3s ease, stroke-opacity 0.3s ease',
                  }}
                  onMouseEnter={() => onEnter(key, l2.name, l2.x, l2.y)}
                  onMouseLeave={onLeave}
                  onClick={() => {
                    // L2 doesn't have its own page, navigate to parent L1
                    if (l1.id) navigate(l1.id);
                  }}
                />
                {/* Label - shown when hovered or when the parent L1 is hovered */}
                {(isHov || isRelated) && (
                  <text
                    x={l2.x}
                    y={l2.y + L2_R + 14}
                    textAnchor="middle"
                    fill={textFill}
                    fontSize={10}
                    fontWeight={500}
                    opacity={0.9}
                    style={{ pointerEvents: 'none' }}
                  >
                    {l2.name}
                  </text>
                )}
              </g>
            );
          }),
        )}

        {/* ---------- L1 nodes ---------- */}
        {layout.map((l1) => {
          const key = `l1-${l1.id}`;
          const isHov = hovered?.key === key;
          const dimmed =
            hovered !== null && !isHov;
          return (
            <g key={key}>
              {/* Outer glow ring */}
              <circle
                cx={l1.x}
                cy={l1.y}
                r={isHov ? L1_R + 14 : L1_R + 8}
                fill={l1.color}
                opacity={isHov ? 0.12 : 0.05}
                style={{ transition: 'r 0.3s ease, opacity 0.3s ease' }}
              />
              {/* Main circle */}
              <circle
                cx={l1.x}
                cy={l1.y}
                r={isHov ? L1_R + 4 : L1_R}
                fill={l1.color}
                fillOpacity={isHov ? 0.3 : dimmed ? 0.08 : 0.15}
                stroke={l1.color}
                strokeWidth={isHov ? 2 : 1.5}
                strokeOpacity={isHov ? 0.9 : dimmed ? 0.2 : 0.6}
                filter={isHov ? 'url(#glow)' : 'url(#glow-subtle)'}
                style={{
                  cursor: l1.id ? 'pointer' : 'default',
                  transition:
                    'r 0.2s ease, fill-opacity 0.3s ease, stroke-opacity 0.3s ease',
                }}
                onMouseEnter={() => onEnter(key, l1.name, l1.x, l1.y)}
                onMouseLeave={onLeave}
                onClick={() => navigate(l1.id)}
              />
              {/* L1 label (always visible) */}
              <text
                x={l1.x}
                y={l1.y + 4}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={isHov ? (isDark ? '#f8fafc' : '#1e293b') : textFill}
                fontSize={locale === 'zh' ? 11 : 9.5}
                fontWeight={600}
                style={{
                  pointerEvents: 'none',
                  transition: 'fill 0.3s ease',
                }}
                opacity={dimmed ? 0.4 : 1}
              >
                {l1.name}
              </text>
            </g>
          );
        })}

        {/* ---------- Small animated particles on rings (decorative) ---------- */}
        {[R_RING1, R_RING2, R_RING3].map((r, ri) => (
          <circle key={`particle-${ri}`} r={1.2} fill={ringStroke} opacity={0.5}>
            <animateMotion
              dur={`${20 + ri * 15}s`}
              repeatCount="indefinite"
              path={`M${CX + r},${CY} A${r},${r} 0 1,1 ${CX + r - 0.001},${CY}`}
            />
          </circle>
        ))}
      </svg>

      {/* ---------- Tooltip overlay (HTML, positioned absolutely) ---------- */}
      {hovered && (
        <div
          className="absolute pointer-events-none"
          style={{
            left: `${(hovered.x / VB_W) * 100}%`,
            top: `${(hovered.y / VB_H) * 100}%`,
            transform: 'translate(-50%, -140%)',
            zIndex: 20,
          }}
        >
          <div
            className="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shadow-lg"
            style={{
              backgroundColor: isDark
                ? 'rgba(30,41,59,0.92)'
                : 'rgba(255,255,255,0.95)',
              color: isDark ? '#f1f5f9' : '#1e293b',
              border: `1px solid ${isDark ? 'rgba(71,85,105,0.5)' : 'rgba(203,213,225,0.8)'}`,
              backdropFilter: 'blur(8px)',
            }}
          >
            {hovered.name}
          </div>
        </div>
      )}
    </div>
  );
}
