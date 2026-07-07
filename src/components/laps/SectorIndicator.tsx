import styles from "./SectorIndicator.module.css";

interface SectorIndicatorProps {
  currentSector: number | null; // 0, 1 ou 2
}

export function SectorIndicator({ currentSector }: SectorIndicatorProps) {
  const active = currentSector ?? 0;

  return (
    <div className={styles.wrap}>
      <div className={styles.label}>
        Setor {currentSector === null ? "—" : active + 1} de 3
      </div>
      <div className={styles.sectors}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`${styles.sector} ${i < active ? styles.done : ""} ${i === active ? styles.active : ""}`}
          />
        ))}
      </div>
    </div>
  );
}
