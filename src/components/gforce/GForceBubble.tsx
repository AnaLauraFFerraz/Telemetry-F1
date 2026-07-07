import styles from "./GForceBubble.module.css";

// Faixa considerada "full deflection" pra posicionar o ponto na bolha.
// Forças G de F1 real raramente passam de ~5-6g mesmo em frenagem pesada.
const MAX_G = 5;

function toPercent(g: number): number {
  const clamped = Math.max(-MAX_G, Math.min(MAX_G, g));
  return 50 + (clamped / MAX_G) * 42;
}

interface GForceBubbleProps {
  lateral: number | null;
  longitudinal: number | null;
}

export function GForceBubble({ lateral, longitudinal }: GForceBubbleProps) {
  const left = lateral === null ? 50 : toPercent(lateral);
  const top = longitudinal === null ? 50 : toPercent(-longitudinal);

  return (
    <div className={styles.wrap}>
      <div className={styles.circle}>
        <div className={styles.ring} />
        <div className={styles.crossH} />
        <div className={styles.crossV} />
        <div className={styles.dot} style={{ left: `${left}%`, top: `${top}%` }} />
      </div>
      <div className={styles.readout}>
        <div>
          <div className={styles.val}>{lateral === null ? "—" : lateral.toFixed(1)}</div>LAT
        </div>
        <div>
          <div className={styles.val}>{longitudinal === null ? "—" : longitudinal.toFixed(1)}</div>LON
        </div>
      </div>
    </div>
  );
}
