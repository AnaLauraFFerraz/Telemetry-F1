import styles from "./SteeringIndicator.module.css";

interface SteeringIndicatorProps {
  steer: number | null;
}

export function SteeringIndicator({ steer }: SteeringIndicatorProps) {
  const percent = steer === null ? 50 : ((steer + 1) / 2) * 100;

  return (
    <div className={styles.col}>
      <div className={styles.label}>Direção</div>
      <div className={styles.track}>
        <div className={styles.center} />
        <div className={styles.thumb} style={{ left: `${percent}%` }} />
      </div>
    </div>
  );
}
