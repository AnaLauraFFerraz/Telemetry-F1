import styles from "./SpeedGauge.module.css";

interface SpeedGaugeProps {
  speedKmh: number | null;
}

export function SpeedGauge({ speedKmh }: SpeedGaugeProps) {
  return (
    <div className={styles.instrument}>
      <div className={styles.label}>Velocidade</div>
      <div className={styles.value}>{speedKmh === null ? "—" : Math.round(speedKmh)}</div>
      <div className={styles.unit}>KM/H</div>
    </div>
  );
}
