import type { LapSummary } from "@/types/rest";
import { formatLapTime } from "@/utils/formatLapTime";
import styles from "./LapsTable.module.css";

interface LapsTableProps {
  laps: LapSummary[];
  bestLapTimeMs: number | null;
  selectedLapNumbers: number[];
  onToggleCompare: (lapNumber: number) => void;
}

export function LapsTable({ laps, bestLapTimeMs, selectedLapNumbers, onToggleCompare }: LapsTableProps) {
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th></th>
          <th>Volta</th>
          <th>Tempo</th>
          <th>Delta</th>
        </tr>
      </thead>
      <tbody>
        {laps.map((lap) => {
          const isBest = bestLapTimeMs !== null && lap.lapTimeMs === bestLapTimeMs && lap.isValid;
          const deltaMs = bestLapTimeMs === null ? null : lap.lapTimeMs - bestLapTimeMs;

          return (
            <tr key={lap.lapNumber}>
              <td>
                <input
                  type="checkbox"
                  className={styles.check}
                  checked={selectedLapNumbers.includes(lap.lapNumber)}
                  onChange={() => onToggleCompare(lap.lapNumber)}
                  aria-label={`Comparar volta ${lap.lapNumber}`}
                />
              </td>
              <td className={styles.lapNum}>{lap.lapNumber}</td>
              <td className={`${styles.mono} ${!lap.isValid ? styles.invalid : ""} ${isBest ? styles.isBest : ""}`}>
                {formatLapTime(lap.lapTimeMs)}
                {!lap.isValid ? " ×" : ""}
              </td>
              <td className={`${styles.mono} ${isBest || deltaMs === null ? "" : deltaMs >= 0 ? styles.deltaPos : styles.deltaNeg}`}>
                {isBest || deltaMs === null ? "—" : `${deltaMs >= 0 ? "+" : ""}${(deltaMs / 1000).toFixed(3)}`}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
