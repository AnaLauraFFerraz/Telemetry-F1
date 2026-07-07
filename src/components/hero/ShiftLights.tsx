import styles from "./ShiftLights.module.css";

const TOTAL_LIGHTS = 15;
// bit 0 = LED mais à esquerda ... bit 14 = mais à direita (spec F1 24)
const GREEN_ZONE_END = 8;
const AMBER_ZONE_END = 12;

interface ShiftLightsProps {
  revLightsBitValue: number | null;
}

export function ShiftLights({ revLightsBitValue }: ShiftLightsProps) {
  const bits = revLightsBitValue ?? 0;

  return (
    <div className={styles.strip}>
      {Array.from({ length: TOTAL_LIGHTS }, (_, i) => {
        const lit = (bits & (1 << i)) !== 0;
        const zoneClass = i < GREEN_ZONE_END ? styles.good : i < AMBER_ZONE_END ? styles.warn : styles.danger;
        return <div key={i} className={`${styles.light} ${lit ? zoneClass : ""}`} />;
      })}
    </div>
  );
}
