import { formatLapTime } from "@/utils/formatLapTime";
import { SectorIndicator } from "./SectorIndicator";
import styles from "./LapTimesPanel.module.css";

interface LapTimesPanelProps {
  currentLapTimeMs: number | null;
  lastLapTimeMs: number | null;
  bestLapTimeMs: number | null;
  currentSector: number | null;
}

export function LapTimesPanel({ currentLapTimeMs, lastLapTimeMs, bestLapTimeMs, currentSector }: LapTimesPanelProps) {
  return (
    <div className={styles.laptimes}>
      <div className={`${styles.row} ${styles.current}`}>
        <span className={styles.label}>Volta atual</span>
        <span className={styles.time}>{formatLapTime(currentLapTimeMs)}</span>
      </div>
      <div className={styles.row}>
        <span className={styles.label}>Última volta</span>
        <span className={styles.time}>{formatLapTime(lastLapTimeMs)}</span>
      </div>
      <div className={`${styles.row} ${styles.best}`}>
        <span className={styles.label}>Melhor volta</span>
        <span className={styles.time}>{formatLapTime(bestLapTimeMs)}</span>
      </div>
      <SectorIndicator currentSector={currentSector} />
    </div>
  );
}
