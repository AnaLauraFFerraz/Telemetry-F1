import { ShiftLights } from "./ShiftLights";
import styles from "./GearRpmDisplay.module.css";

// m_maxRPM real vem do pacote Car Status (packetId=7), ainda não implementado
// no backend. Usamos um teto aproximado só para desenhar a barra até lá.
const ASSUMED_MAX_RPM = 13000;

function gearLabel(gear: number | null): string {
  if (gear === null) return "—";
  if (gear === -1) return "R";
  if (gear === 0) return "N";
  return String(gear);
}

interface GearRpmDisplayProps {
  gear: number | null;
  rpm: number | null;
  revLightsBitValue: number | null;
}

export function GearRpmDisplay({ gear, rpm, revLightsBitValue }: GearRpmDisplayProps) {
  const rpmPercent = rpm === null ? 0 : Math.min(100, (rpm / ASSUMED_MAX_RPM) * 100);

  return (
    <div className={styles.instrument}>
      <ShiftLights revLightsBitValue={revLightsBitValue} />
      <div className={styles.main}>
        <div className={styles.gear}>{gearLabel(gear)}</div>
        <div className={styles.rpmCol}>
          <div className={styles.rpmNumeric}>
            {rpm === null ? "—" : rpm.toLocaleString("pt-BR")}
            <span className={styles.rpmSuffix}>RPM</span>
          </div>
          <div className={styles.rpmBar}>
            <div className={styles.rpmBarFill} style={{ width: `${rpmPercent}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}
