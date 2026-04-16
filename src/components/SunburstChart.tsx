import { useCallback, useEffect, useMemo, useState } from 'react';

interface SunburstNode {
  name: string;
  id?: string;
  itemStyle?: { color: string };
  children?: SunburstNode[];
}

interface Props {
  data: SunburstNode;
  locale: 'zh' | 'en';
  basePath: string;
}

interface NodeLayout {
  x: number;
  y: number;
  angle: number;
}

interface L2Layout extends NodeLayout {
  name: string;
  id?: string;
  parentColor: string;
}

interface L1Layout extends NodeLayout {
  name: string;
  id?: string;
  color: string;
  children: L2Layout[];
}

const VB_W = 1040;
const VB_H = 860;
const CX = VB_W / 2;
const CY = VB_H / 2;

const R_RING1 = 205;
const R_RING2 = 365;

const L1_R = 36;
const L2_R = 16;

function polar(cx: number, cy: number, r: number, angleRad: number) {
  return {
    x: cx + r * Math.sin(angleRad),
    y: cy - r * Math.cos(angleRad),
  };
}

function curvedPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  cx: number,
  cy: number
) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const cpx = mx + (cx - mx) * 0.35;
  const cpy = my + (cy - my) * 0.35;
  return `M${x1},${y1} Q${cpx},${cpy} ${x2},${y2}`;
}

function computeLayout(data: SunburstNode): L1Layout[] {
  const l1Nodes = data.children ?? [];
  const l1Count = l1Nodes.length;
  if (l1Count === 0) return [];

  const sectorAngle = (2 * Math.PI) / l1Count;
  const globalOffset = -Math.PI / l1Count;

  return l1Nodes.map((l1, index) => {
    const l1Angle = globalOffset + index * sectorAngle + sectorAngle / 2;
    const l1Pos = polar(CX, CY, R_RING1, l1Angle);
    const color = l1.itemStyle?.color ?? '#888';

    const l2Nodes = l1.children ?? [];
    const l2Spread = sectorAngle * 0.82;
    const l2Start = l1Angle - l2Spread / 2;
    const l2Step = l2Nodes.length > 1 ? l2Spread / (l2Nodes.length - 1) : 0;

    const children = l2Nodes.map((l2, childIndex) => {
      const l2Angle = l2Nodes.length === 1 ? l1Angle : l2Start + childIndex * l2Step;
      const l2Pos = polar(CX, CY, R_RING2, l2Angle);

      return {
        ...l2Pos,
        angle: l2Angle,
        name: l2.name,
        id: l2.id,
        parentColor: color,
      };
    });

    return {
      ...l1Pos,
      angle: l1Angle,
      name: l1.name,
      id: l1.id,
      color,
      children,
    };
  });
}

function CenterDecoration({ isDark }: { isDark: boolean }) {
  const stroke = isDark ? 'rgba(148,163,184,0.25)' : 'rgba(100,116,139,0.18)';
  const fill = isDark ? 'rgba(59,130,246,0.06)' : 'rgba(59,130,246,0.04)';

  const polygonPoints = (radius: number, rotate = 0) => {
    const points: string[] = [];
    for (let index = 0; index < 6; index += 1) {
      const angle = (Math.PI / 3) * index - Math.PI / 2 + rotate;
      points.push(`${CX + radius * Math.cos(angle)},${CY + radius * Math.sin(angle)}`);
    }
    return points.join(' ');
  };

  return (
    <g>
      <polygon points={polygonPoints(58)} fill={fill} stroke={stroke} strokeWidth={1.2} />
      <polygon
        points={polygonPoints(34, Math.PI / 6)}
        fill="none"
        stroke={stroke}
        strokeWidth={0.8}
      />
      <circle cx={CX} cy={CY} r={4} fill={stroke} />
      {[0, 60, 120].map(deg => {
        const angle = (deg * Math.PI) / 180;
        return (
          <line
            key={deg}
            x1={CX + 22 * Math.cos(angle)}
            y1={CY + 22 * Math.sin(angle)}
            x2={CX - 22 * Math.cos(angle)}
            y2={CY - 22 * Math.sin(angle)}
            stroke={stroke}
            strokeWidth={0.55}
          />
        );
      })}
    </g>
  );
}

export default function SunburstChart({ data, locale, basePath }: Props) {
  const [hovered, setHovered] = useState<{
    key: string;
    name: string;
    x: number;
    y: number;
  } | null>(null);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const syncTheme = () => {
      setIsDark(document.documentElement.getAttribute('data-theme') === 'dark');
    };

    syncTheme();
    const observer = new MutationObserver(syncTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    return () => observer.disconnect();
  }, []);

  const layout = useMemo(() => computeLayout(data), [data]);

  const navigate = useCallback(
    (id?: string) => {
      if (id) {
        window.location.href = `${basePath}${id}/`;
      }
    },
    [basePath]
  );

  const onEnter = useCallback((key: string, name: string, x: number, y: number) => {
    setHovered({ key, name, x, y });
  }, []);

  const ringStroke = isDark ? 'rgba(148,163,184,0.12)' : 'rgba(100,116,139,0.12)';
  const textFill = isDark ? '#e2e8f0' : '#334155';
  const subtextFill = isDark ? '#94a3b8' : '#64748b';

  return (
    <div className="relative mx-auto h-[70vh] min-h-[560px] w-full max-w-6xl select-none md:h-[84vh] md:min-h-[780px]">
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-full"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <filter id="hub-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="hub-glow-subtle" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {[R_RING1 - 28, R_RING1, R_RING2, R_RING2 + 32].map(radius => (
          <circle
            key={radius}
            cx={CX}
            cy={CY}
            r={radius}
            fill="none"
            stroke={ringStroke}
            strokeWidth={radius === R_RING1 || radius === R_RING2 ? 1 : 0.7}
            strokeDasharray={radius === R_RING2 ? '5 5' : radius === R_RING1 ? '7 5' : '2 8'}
          />
        ))}

        <CenterDecoration isDark={isDark} />

        <text
          x={CX}
          y={CY + 76}
          textAnchor="middle"
          fill={subtextFill}
          fontSize={12}
          fontWeight={600}
          style={{ letterSpacing: '0.08em' }}
        >
          {data.name || (locale === 'zh' ? 'AI Benchmark Taxonomy' : 'AI Benchmark Taxonomy')}
        </text>

        {layout.flatMap(l1 =>
          l1.children.map(l2 => (
            <path
              key={`conn-${l1.id}-${l2.id}`}
              d={curvedPath(l1.x, l1.y, l2.x, l2.y, CX, CY)}
              fill="none"
              stroke={l1.color}
              strokeWidth={1.1}
              opacity={
                hovered
                  ? hovered.key === `l1-${l1.id}` || hovered.key === `l2-${l2.id}`
                    ? 0.42
                    : 0.06
                  : 0.14
              }
              style={{ transition: 'opacity 0.25s ease' }}
            />
          ))
        )}

        {layout.flatMap(l1 =>
          l1.children.map(l2 => {
            const key = `l2-${l2.id}`;
            const isHovered = hovered?.key === key;
            const isRelated = hovered?.key === `l1-${l1.id}`;
            const dimmed = hovered && !isHovered && !isRelated;
            const labelOffset = 34;
            const labelX = l2.x + Math.sin(l2.angle) * labelOffset;
            const labelY = l2.y - Math.cos(l2.angle) * labelOffset;
            const isLeftHalf = l2.angle > Math.PI / 2 && l2.angle < (Math.PI * 3) / 2;
            const anchor = Math.abs(Math.cos(l2.angle)) > 0.92 ? 'middle' : isLeftHalf ? 'end' : 'start';

            return (
              <g key={key}>
                {(isHovered || isRelated) && (
                  <circle
                    cx={l2.x}
                    cy={l2.y}
                    r={L2_R + 10}
                    fill={l2.parentColor}
                    opacity={0.14}
                  />
                )}
                <circle
                  cx={l2.x}
                  cy={l2.y}
                  r={isHovered ? L2_R + 4 : L2_R}
                  fill={l2.parentColor}
                  fillOpacity={isHovered ? 0.3 : dimmed ? 0.07 : 0.16}
                  stroke={l2.parentColor}
                  strokeWidth={isHovered ? 1.8 : 1.1}
                  strokeOpacity={isHovered ? 0.82 : dimmed ? 0.14 : 0.52}
                  filter={isHovered ? 'url(#hub-glow)' : undefined}
                  style={{
                    cursor: l1.id ? 'pointer' : 'default',
                    transition: 'r 0.2s ease, fill-opacity 0.25s ease, stroke-opacity 0.25s ease',
                  }}
                  onMouseEnter={() => onEnter(key, l2.name, l2.x, l2.y)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => navigate(l1.id)}
                />
                <text
                  x={labelX}
                  y={labelY}
                  textAnchor={anchor}
                  dominantBaseline="middle"
                  fill={textFill}
                  fontSize={locale === 'zh' ? 13 : 12}
                  fontWeight={600}
                  opacity={dimmed ? 0.38 : 0.92}
                  style={{ pointerEvents: 'none', transition: 'opacity 0.25s ease' }}
                >
                  {l2.name}
                </text>
              </g>
            );
          })
        )}

        {layout.map(l1 => {
          const key = `l1-${l1.id}`;
          const isHovered = hovered?.key === key;
          const dimmed = hovered !== null && !isHovered;

          return (
            <g key={key}>
              <circle
                cx={l1.x}
                cy={l1.y}
                r={isHovered ? L1_R + 18 : L1_R + 10}
                fill={l1.color}
                opacity={isHovered ? 0.14 : 0.06}
                style={{ transition: 'r 0.25s ease, opacity 0.25s ease' }}
              />
              <circle
                cx={l1.x}
                cy={l1.y}
                r={isHovered ? L1_R + 5 : L1_R}
                fill={l1.color}
                fillOpacity={isHovered ? 0.3 : dimmed ? 0.08 : 0.16}
                stroke={l1.color}
                strokeWidth={isHovered ? 2.2 : 1.6}
                strokeOpacity={isHovered ? 0.92 : dimmed ? 0.22 : 0.64}
                filter={isHovered ? 'url(#hub-glow)' : 'url(#hub-glow-subtle)'}
                style={{
                  cursor: l1.id ? 'pointer' : 'default',
                  transition: 'r 0.2s ease, fill-opacity 0.25s ease, stroke-opacity 0.25s ease',
                }}
                onMouseEnter={() => onEnter(key, l1.name, l1.x, l1.y)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => navigate(l1.id)}
              />
              <text
                x={l1.x}
                y={l1.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={isHovered ? (isDark ? '#f8fafc' : '#1e293b') : textFill}
                fontSize={locale === 'zh' ? 14 : 12}
                fontWeight={700}
                opacity={dimmed ? 0.42 : 1}
                style={{ pointerEvents: 'none', transition: 'opacity 0.25s ease, fill 0.25s ease' }}
              >
                {l1.name}
              </text>
            </g>
          );
        })}

        {[R_RING1, R_RING2].map((radius, index) => (
          <circle key={radius} r={1.5} fill={ringStroke} opacity={0.55}>
            <animateMotion
              dur={`${20 + index * 12}s`}
              repeatCount="indefinite"
              path={`M${CX + radius},${CY} A${radius},${radius} 0 1,1 ${CX + radius - 0.001},${CY}`}
            />
          </circle>
        ))}
      </svg>

      {hovered && (
        <div
          className="absolute pointer-events-none"
          style={{
            left: `${(hovered.x / VB_W) * 100}%`,
            top: `${(hovered.y / VB_H) * 100}%`,
            transform: 'translate(-50%, -145%)',
            zIndex: 20,
          }}
        >
          <div
            className="whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium shadow-lg"
            style={{
              backgroundColor: isDark ? 'rgba(30,41,59,0.92)' : 'rgba(255,255,255,0.95)',
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
