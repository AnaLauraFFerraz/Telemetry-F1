import { useRef } from "react";
import { buildPathD } from "./chartMath";
import { useChartHover } from "./useChartHover";
import styles from "./Chart.module.css";

export interface ChartSeries {
  label: string;
  color: string;
  points: [number, number][];
  area?: boolean;
}

export interface ChartMarker {
  x: number;
  label?: string;
  active?: boolean;
}

export interface ChartHighlightRange {
  xStart: number;
  xEnd: number;
}

interface ChartProps {
  series: ChartSeries[];
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  diverging?: boolean;
  xFormatter?: (x: number) => string;
  yFormatter?: (y: number) => string;
  height?: number;
  ariaLabel: string;
  /** Marcadores verticais (ex: curvas detectadas pelo Coach) - só leitura, sem interação própria. */
  markers?: ChartMarker[];
  /** Faixa destacada (ex: curva selecionada no painel Coach). */
  highlightRange?: ChartHighlightRange | null;
}

const SVG_WIDTH = 600;
const PAD_LEFT = 38;
const PAD_RIGHT = 10;
const PAD_TOP = 10;
const PAD_BOTTOM = 22;

export function Chart({
  series,
  xMin,
  xMax,
  yMin,
  yMax,
  diverging,
  xFormatter,
  yFormatter,
  height = 170,
  ariaLabel,
  markers,
  highlightRange,
}: ChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const plotWidth = SVG_WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotHeight = height - PAD_TOP - PAD_BOTTOM;

  const sx = (x: number) => PAD_LEFT + ((x - xMin) / (xMax - xMin)) * plotWidth;
  const sy = (y: number) => PAD_TOP + plotHeight - ((y - yMin) / (yMax - yMin)) * plotHeight;

  const referencePoints = series[0]?.points ?? [];
  const { hoverIndex, pointerRatio, handleMouseMove, handleMouseLeave } = useChartHover({
    containerRef,
    points: referencePoints,
    xMin,
    xMax,
    plotLeft: PAD_LEFT,
    plotRight: SVG_WIDTH - PAD_RIGHT,
    svgWidth: SVG_WIDTH,
  });

  const gridLines = Array.from({ length: 4 }, (_, i) => yMin + ((yMax - yMin) * i) / 3);
  const zeroBaseline = diverging ? 0 : yMin;

  return (
    <div className={styles.wrap} ref={containerRef} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
      <svg viewBox={`0 0 ${SVG_WIDTH} ${height}`} className={styles.svg} role="img" aria-label={ariaLabel}>
        {highlightRange && (
          <rect
            x={sx(Math.max(highlightRange.xStart, xMin))}
            y={PAD_TOP}
            width={Math.max(0, sx(Math.min(highlightRange.xEnd, xMax)) - sx(Math.max(highlightRange.xStart, xMin)))}
            height={plotHeight}
            className={styles.highlightRange}
          />
        )}

        {gridLines.map((gy) => (
          <g key={gy}>
            <line x1={PAD_LEFT} y1={sy(gy)} x2={SVG_WIDTH - PAD_RIGHT} y2={sy(gy)} className={styles.grid} />
            <text x={PAD_LEFT - 6} y={sy(gy) + 3} textAnchor="end" className={styles.axisLabel}>
              {yFormatter ? yFormatter(gy) : Math.round(gy)}
            </text>
          </g>
        ))}
        {diverging && (
          <line x1={PAD_LEFT} y1={sy(0)} x2={SVG_WIDTH - PAD_RIGHT} y2={sy(0)} className={styles.zeroLine} />
        )}

        {series.map((s) => {
          if (s.points.length === 0) return null;
          const d = buildPathD(s.points, sx, sy);
          const last = s.points[s.points.length - 1];
          const first = s.points[0];
          const areaD = s.area
            ? `${d} L ${sx(last[0]).toFixed(1)},${sy(zeroBaseline).toFixed(1)} L ${sx(first[0]).toFixed(1)},${sy(zeroBaseline).toFixed(1)} Z`
            : null;

          return (
            <g key={s.label}>
              {areaD && <path d={areaD} fill={s.color} opacity={0.16} stroke="none" />}
              <path d={d} fill="none" stroke={s.color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              <circle cx={sx(last[0])} cy={sy(last[1])} r={3} fill={s.color} />
            </g>
          );
        })}

        {markers?.map((marker, i) => {
          if (marker.x < xMin || marker.x > xMax) return null;
          const mx = sx(marker.x);
          return (
            <g key={i} className={marker.active ? styles.markerActive : styles.marker}>
              <line x1={mx} y1={PAD_TOP} x2={mx} y2={height - PAD_BOTTOM} />
              {marker.label && (
                <text x={mx} y={PAD_TOP + 9} textAnchor="middle" className={styles.markerLabel}>
                  {marker.label}
                </text>
              )}
            </g>
          );
        })}

        {hoverIndex !== null && referencePoints[hoverIndex] && (
          <line
            x1={sx(referencePoints[hoverIndex][0])}
            y1={PAD_TOP}
            x2={sx(referencePoints[hoverIndex][0])}
            y2={height - PAD_BOTTOM}
            className={styles.crosshair}
          />
        )}
      </svg>

      {hoverIndex !== null && referencePoints[hoverIndex] && (
        <div className={styles.tooltip} style={{ left: `${Math.min(pointerRatio * 100, 78)}%` }}>
          <div className={styles.tooltipHeader}>
            {xFormatter ? xFormatter(referencePoints[hoverIndex][0]) : referencePoints[hoverIndex][0]}
          </div>
          {series.map((s) => (
            <div key={s.label} className={styles.tooltipRow}>
              <span className={styles.swatch} style={{ background: s.color }} />
              {s.label}
              <span className={styles.tooltipValue}>
                {s.points[hoverIndex]
                  ? yFormatter
                    ? yFormatter(s.points[hoverIndex][1])
                    : s.points[hoverIndex][1]
                  : "—"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
