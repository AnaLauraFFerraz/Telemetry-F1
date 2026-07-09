import { computeMapBounds, buildMapPathD } from "./trackMapMath";
import styles from "./TrackMap.module.css";

interface TrackMapProps {
  primaryPoints: [number, number][];
  comparisonPoints: [number, number][];
  primaryLabel: string;
  comparisonLabel: string;
}

const VIEWPORT = { width: 300, height: 220, padding: 16 };

export function TrackMap({ primaryPoints, comparisonPoints, primaryLabel, comparisonLabel }: TrackMapProps) {
  if (primaryPoints.length === 0 && comparisonPoints.length === 0) {
    return <p className={styles.state}>Sem dados de posição pra desenhar o mapa.</p>;
  }

  const bounds = computeMapBounds([primaryPoints, comparisonPoints]);
  const primaryD = primaryPoints.length > 0 ? buildMapPathD(primaryPoints, bounds, VIEWPORT) : null;
  const comparisonD = comparisonPoints.length > 0 ? buildMapPathD(comparisonPoints, bounds, VIEWPORT) : null;

  return (
    <div>
      <svg
        viewBox={`0 0 ${VIEWPORT.width} ${VIEWPORT.height}`}
        className={styles.svg}
        role="img"
        aria-label={`Traçado da pista: ${primaryLabel} sobreposta a ${comparisonLabel}`}
      >
        {comparisonD && <path d={comparisonD} fill="none" stroke="var(--accent-cool)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" opacity={0.8} />}
        {primaryD && <path d={primaryD} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />}
      </svg>
      <div className={styles.legend}>
        <span>
          <span className={styles.swatch} style={{ background: "var(--accent)" }} />
          {primaryLabel}
        </span>
        <span>
          <span className={styles.swatch} style={{ background: "var(--accent-cool)" }} />
          {comparisonLabel}
        </span>
      </div>
    </div>
  );
}
