import type { WheelSet } from "@/types/ws";
import { classifyTyreTemp } from "./tyreColor";
import styles from "./TyreGrid.module.css";

interface TyreBoxProps {
  position: "FL" | "FR" | "RL" | "RR";
  surfaceTemp: number | null;
  innerTemp: number | null;
  pressure: number | null;
}

function TyreBox({ position, surfaceTemp, innerTemp, pressure }: TyreBoxProps) {
  const status = surfaceTemp === null ? "ideal" : classifyTyreTemp(surfaceTemp);

  return (
    <div className={`${styles.box} ${styles[status]}`}>
      <div className={styles.pos}>{position}</div>
      <div className={styles.temp}>{surfaceTemp === null ? "—" : `${Math.round(surfaceTemp)}°`}</div>
      <div className={styles.sub}>
        int {innerTemp === null ? "—" : `${Math.round(innerTemp)}°`} ·{" "}
        {pressure === null ? "—" : `${pressure.toFixed(1)} psi`}
      </div>
    </div>
  );
}

interface TyreGridProps {
  pressure: WheelSet<number> | null;
  surfaceTemp: WheelSet<number> | null;
  innerTemp: WheelSet<number> | null;
}

export function TyreGrid({ pressure, surfaceTemp, innerTemp }: TyreGridProps) {
  return (
    <div>
      <div className={styles.stage}>
        <svg className={styles.carOutline} width="70" height="200" viewBox="0 0 70 200" aria-hidden="true">
          <path
            d="M 35 4 C 20 4 14 16 14 30 L 14 165 C 14 185 22 196 35 196 C 48 196 56 185 56 165 L 56 30 C 56 16 50 4 35 4 Z"
            fill="none"
            stroke="var(--hairline)"
            strokeWidth="1.5"
          />
          <line x1="14" y1="52" x2="56" y2="52" stroke="var(--hairline)" strokeWidth="1" />
        </svg>
        <div className={styles.grid}>
          <TyreBox
            position="FL"
            surfaceTemp={surfaceTemp?.frontLeft ?? null}
            innerTemp={innerTemp?.frontLeft ?? null}
            pressure={pressure?.frontLeft ?? null}
          />
          <TyreBox
            position="FR"
            surfaceTemp={surfaceTemp?.frontRight ?? null}
            innerTemp={innerTemp?.frontRight ?? null}
            pressure={pressure?.frontRight ?? null}
          />
          <TyreBox
            position="RL"
            surfaceTemp={surfaceTemp?.rearLeft ?? null}
            innerTemp={innerTemp?.rearLeft ?? null}
            pressure={pressure?.rearLeft ?? null}
          />
          <TyreBox
            position="RR"
            surfaceTemp={surfaceTemp?.rearRight ?? null}
            innerTemp={innerTemp?.rearRight ?? null}
            pressure={pressure?.rearRight ?? null}
          />
        </div>
      </div>
      <div className={styles.legend}>
        <span>
          <span className={styles.legendDot} style={{ background: "var(--accent-cool)" }} />
          Frio
        </span>
        <span>
          <span className={styles.legendDot} style={{ background: "var(--good)" }} />
          Ideal
        </span>
        <span>
          <span className={styles.legendDot} style={{ background: "var(--danger)" }} />
          Quente
        </span>
      </div>
    </div>
  );
}
