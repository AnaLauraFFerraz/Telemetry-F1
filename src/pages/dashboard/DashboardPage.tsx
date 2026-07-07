import { Link } from "react-router-dom";
import { useTelemetry } from "@/context/useTelemetry";
import { env } from "@/config/env";
import { ConnectionStatusBadge } from "@/components/connection/ConnectionStatusBadge";
import { SpeedGauge } from "@/components/hero/SpeedGauge";
import { GearRpmDisplay } from "@/components/hero/GearRpmDisplay";
import { PedalBars } from "@/components/hero/PedalBars";
import { SteeringIndicator } from "@/components/hero/SteeringIndicator";
import { GForceBubble } from "@/components/gforce/GForceBubble";
import { TyreGrid } from "@/components/tyres/TyreGrid";
import { LapTimesPanel } from "@/components/laps/LapTimesPanel";
import { useBestLapTracker } from "./useBestLapTracker";
import styles from "./DashboardPage.module.css";

export default function DashboardPage() {
  const { connectionState, motion, lapData, carTelemetry } = useTelemetry();
  const bestLapMs = useBestLapTracker(lapData?.lastLapTimeInMS ?? null);

  return (
    <div className={styles.dash}>
      <div className={styles.topbar}>
        <div className={styles.statusGroup}>
          <ConnectionStatusBadge state={connectionState} />
          <span className={styles.statusSub}>{env.wsUrl}</span>
        </div>
        <div className={styles.sessionInfo}>
          <span className={styles.posChip}>P{lapData?.carPosition ?? "—"}</span>
          <span className={styles.lapCounter}>
            VOLTA <span className={styles.value}>{lapData?.currentLapNum ?? "—"}</span>
          </span>
          <nav className={styles.nav}>
            <Link className={styles.navLink} to="/sessions">
              Sessões
            </Link>
            <Link className={styles.navLink} to="/settings">
              Config
            </Link>
          </nav>
        </div>
      </div>

      <div className={styles.hero}>
        <SpeedGauge speedKmh={carTelemetry?.speed ?? null} />
        <GearRpmDisplay
          gear={carTelemetry?.gear ?? null}
          rpm={carTelemetry?.engineRPM ?? null}
          revLightsBitValue={carTelemetry?.revLightsBitValue ?? null}
        />
        <div className={styles.pedalsInstrument}>
          <PedalBars throttle={carTelemetry?.throttle ?? null} brake={carTelemetry?.brake ?? null} />
          <SteeringIndicator steer={carTelemetry?.steer ?? null} />
        </div>
      </div>

      <div className={styles.panels}>
        <div className={styles.panel}>
          <div className={styles.panelTitle}>Força G</div>
          <GForceBubble lateral={motion?.gForceLateral ?? null} longitudinal={motion?.gForceLongitudinal ?? null} />
        </div>

        <div className={styles.panel}>
          <div className={styles.panelTitle}>Pneus</div>
          <TyreGrid
            pressure={carTelemetry?.tyresPressure ?? null}
            surfaceTemp={carTelemetry?.tyresSurfaceTemperature ?? null}
            innerTemp={carTelemetry?.tyresInnerTemperature ?? null}
          />
        </div>

        <div className={styles.panel}>
          <div className={styles.panelTitle}>Tempos</div>
          <LapTimesPanel
            currentLapTimeMs={lapData?.currentLapTimeInMS ?? null}
            lastLapTimeMs={lapData?.lastLapTimeInMS ?? null}
            bestLapTimeMs={bestLapMs}
            currentSector={lapData?.sector ?? null}
          />
        </div>
      </div>
    </div>
  );
}
