import styles from "./PedalBars.module.css";

interface PedalBarsProps {
  throttle: number | null;
  brake: number | null;
}

export function PedalBars({ throttle, brake }: PedalBarsProps) {
  const throttlePct = throttle === null ? 0 : throttle * 100;
  const brakePct = brake === null ? 0 : brake * 100;

  return (
    <div className={styles.pedals}>
      <div className={styles.col}>
        <div className={styles.track}>
          <div className={`${styles.fill} ${styles.fillThrottle}`} style={{ height: `${throttlePct}%` }} />
        </div>
        <div className={styles.value} style={{ color: "var(--good)" }}>
          {throttle === null ? "—" : `${Math.round(throttlePct)}%`}
        </div>
        <div className={styles.label}>Acel.</div>
      </div>
      <div className={styles.col}>
        <div className={styles.track}>
          <div className={`${styles.fill} ${styles.fillBrake}`} style={{ height: `${brakePct}%` }} />
        </div>
        <div className={styles.value} style={{ color: "var(--danger)" }}>
          {brake === null ? "—" : `${Math.round(brakePct)}%`}
        </div>
        <div className={styles.label}>Freio</div>
      </div>
    </div>
  );
}
