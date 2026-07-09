import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSessionDetail } from "@/api/useSessionDetail";
import { useLapTelemetry } from "@/api/useLapTelemetry";
import { LapsTable } from "@/components/sessions/LapsTable";
import { CoachPanel } from "@/components/coach/CoachPanel";
import { Chart, type ChartSeries } from "@/components/chart/Chart";
import { computeDelta } from "@/components/chart/computeDelta";
import { findBestLap } from "@/utils/laps";
import { formatLapTime } from "@/utils/formatLapTime";
import { formatSessionDateTime } from "@/utils/formatDate";
import type { CarTelemetrySample } from "@/types/rest";
import styles from "./SessionAnalysisPage.module.css";

function maxDistance(...sampleArrays: Array<{ lapDistance: number }[]>): number {
  let max = 0;
  for (const arr of sampleArrays) {
    for (const sample of arr) {
      if (sample.lapDistance > max) max = sample.lapDistance;
    }
  }
  return max || 100;
}

function toSeries(samples: CarTelemetrySample[], pick: (s: CarTelemetrySample) => number): [number, number][] {
  return samples.map((s) => [s.lapDistance, pick(s)]);
}

/**
 * Domínio Y calculado a partir dos dados reais, com margem - domínios fixos
 * cortam o gráfico fora quando o valor real passa do esperado (ex: um delta
 * acumulado maior que os ±2s hardcoded antes, ou uma velocidade de pico
 * maior que 330km/h num carro bem configurado).
 */
function computeYDomain(seriesList: ChartSeries[], fallback: [number, number], marginRatio = 0.15): [number, number] {
  let min = Infinity;
  let max = -Infinity;
  for (const series of seriesList) {
    for (const [, y] of series.points) {
      if (y < min) min = y;
      if (y > max) max = y;
    }
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return fallback;
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const margin = (max - min) * marginRatio;
  return [min - margin, max + margin];
}

export default function SessionAnalysisPage() {
  const { id } = useParams();
  const sessionId = Number(id);
  const navigate = useNavigate();
  const result = useSessionDetail(sessionId);

  const [comparisonLapNumber, setComparisonLapNumber] = useState<number | null>(null);

  const laps = result.status === "success" ? result.data.laps : [];
  const bestLap = findBestLap(laps);
  const primaryLap = laps.length > 0 ? laps[laps.length - 1] : null;
  const primaryLapNumber = primaryLap?.lapNumber ?? null;

  useEffect(() => {
    if (result.status !== "success") return;
    if (comparisonLapNumber !== null) return;
    const best = findBestLap(result.data.laps);
    const latest = result.data.laps[result.data.laps.length - 1];
    if (best && latest && best.lapNumber !== latest.lapNumber) {
      setComparisonLapNumber(best.lapNumber);
    }
    // roda só até uma comparação ser definida, não a cada mudança de comparisonLapNumber
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  function handleToggleCompare(lapNumber: number) {
    if (lapNumber === primaryLapNumber) return; // volta atual não é des-selecionável
    setComparisonLapNumber((prev) => (prev === lapNumber ? null : lapNumber));
  }

  const primaryTelemetry = useLapTelemetry(sessionId, primaryLapNumber);
  const comparisonTelemetry = useLapTelemetry(sessionId, comparisonLapNumber);

  const primaryData = primaryTelemetry.status === "success" ? primaryTelemetry.data : null;
  const comparisonData = comparisonTelemetry.status === "success" ? comparisonTelemetry.data : null;

  if (result.status === "loading") {
    return (
      <div className={styles.page}>
        <p className={styles.state}>Carregando sessão...</p>
      </div>
    );
  }

  if (result.status === "error") {
    return (
      <div className={styles.page}>
        <button className={styles.back} onClick={() => navigate("/sessions")}>
          ← Histórico
        </button>
        <p className={styles.state}>
          {result.error === "session not found" ? "Sessão não encontrada." : `Erro: ${result.error}`}
        </p>
      </div>
    );
  }

  const session = result.data;
  const { date, time } = formatSessionDateTime(session.startedAt);
  const selectedLapNumbers = [primaryLapNumber, comparisonLapNumber].filter((n): n is number => n !== null);

  const distanceDomain = maxDistance(primaryData?.carTelemetry ?? [], comparisonData?.carTelemetry ?? []);

  const speedSeries: ChartSeries[] = [];
  if (primaryData) {
    speedSeries.push({
      label: `Volta ${primaryLapNumber}`,
      color: "var(--accent)",
      points: toSeries(primaryData.carTelemetry, (s) => s.speed),
    });
  }
  if (comparisonData && comparisonLapNumber !== null) {
    speedSeries.push({
      label: `Volta ${comparisonLapNumber}`,
      color: "var(--accent-cool)",
      points: toSeries(comparisonData.carTelemetry, (s) => s.speed),
    });
  }

  const pedalSeries: ChartSeries[] = primaryData
    ? [
        { label: "Acelerador", color: "var(--good)", area: true, points: toSeries(primaryData.carTelemetry, (s) => s.throttle * 100) },
        { label: "Freio", color: "var(--danger)", area: true, points: toSeries(primaryData.carTelemetry, (s) => s.brake * 100) },
      ]
    : [];

  const tyreSeries: ChartSeries[] = primaryData
    ? [
        { label: "FL", color: "var(--tyre-fl)", points: toSeries(primaryData.carTelemetry, (s) => s.tyreSurfaceTemp.frontLeft) },
        { label: "FR", color: "var(--tyre-fr)", points: toSeries(primaryData.carTelemetry, (s) => s.tyreSurfaceTemp.frontRight) },
        { label: "RL", color: "var(--tyre-rl)", points: toSeries(primaryData.carTelemetry, (s) => s.tyreSurfaceTemp.rearLeft) },
        { label: "RR", color: "var(--tyre-rr)", points: toSeries(primaryData.carTelemetry, (s) => s.tyreSurfaceTemp.rearRight) },
      ]
    : [];

  const deltaPoints = primaryData && comparisonData ? computeDelta(primaryData.carTelemetry, comparisonData.carTelemetry) : [];
  const deltaEnd = deltaPoints.length > 0 ? deltaPoints[deltaPoints.length - 1][1] : 0;
  const deltaSeries: ChartSeries[] = [
    { label: "Delta", color: deltaEnd >= 0 ? "var(--danger)" : "var(--good)", area: true, points: deltaPoints },
  ];

  const [speedYMinRaw, speedYMax] = computeYDomain(speedSeries, [0, 330]);
  const speedYMin = Math.max(0, speedYMinRaw); // velocidade nunca é negativa

  const [deltaYMinRaw, deltaYMaxRaw] = computeYDomain(deltaSeries, [-2, 2]);
  // o eixo zero do delta divergente precisa ficar sempre visível, mesmo que
  // os dados fiquem só de um lado (ex: principal sempre atrás da comparação)
  const deltaYMin = Math.min(deltaYMinRaw, -0.1);
  const deltaYMax = Math.max(deltaYMaxRaw, 0.1);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <button className={styles.back} onClick={() => navigate("/sessions")}>
            ← Histórico
          </button>
          <h2 className={styles.title}>
            Sessão de {date} · {time}
          </h2>
          <div className={styles.meta}>{laps.length} voltas completadas</div>
        </div>
        <div className={styles.stats}>
          {primaryLap && (
            <div className={styles.stat}>
              <div className={styles.statLabel}>Última volta</div>
              <div className={styles.statValue}>{formatLapTime(primaryLap.lapTimeMs)}</div>
            </div>
          )}
          {bestLap && (
            <div className={`${styles.stat} ${styles.statBest}`}>
              <div className={styles.statLabel}>Melhor volta</div>
              <div className={styles.statValue}>{formatLapTime(bestLap.lapTimeMs)}</div>
            </div>
          )}
        </div>
      </div>

      {laps.length === 0 ? (
        <p className={styles.state}>Nenhuma volta completada nessa sessão ainda.</p>
      ) : (
        <div className={styles.grid}>
          <div className={styles.sidebarCol}>
            <div className={styles.panel}>
              <div className={styles.panelTitle}>Voltas</div>
              <div className={styles.panelSub}>Marque uma volta pra comparar com a mais recente</div>
              <LapsTable
                laps={laps}
                bestLapTimeMs={bestLap?.lapTimeMs ?? null}
                selectedLapNumbers={selectedLapNumbers}
                onToggleCompare={handleToggleCompare}
              />
            </div>

            <CoachPanel sessionId={sessionId} primaryLapNumber={primaryLapNumber} comparisonLapNumber={comparisonLapNumber} />
          </div>

          <div className={styles.chartsCol}>
            <div className={styles.chartPanel}>
              <div className={styles.chartHead}>
                <span className={styles.chartLabel}>
                  Delta acumulado (volta {primaryLapNumber} vs. {comparisonLapNumber ?? "—"})
                </span>
              </div>
              <Chart
                series={deltaSeries}
                xMin={0}
                xMax={distanceDomain}
                yMin={deltaYMin}
                yMax={deltaYMax}
                diverging
                height={100}
                xFormatter={(x) => `${Math.round(x)}m`}
                yFormatter={(y) => `${y >= 0 ? "+" : ""}${y.toFixed(2)}s`}
                ariaLabel="Delta de tempo acumulado entre as duas voltas selecionadas"
              />
            </div>

            <div className={styles.chartPanel}>
              <div className={styles.chartHead}>
                <span className={styles.chartLabel}>Velocidade × distância</span>
                <div className={styles.legend}>
                  {speedSeries.map((s) => (
                    <span key={s.label}>
                      <span className={styles.swatch} style={{ background: s.color }} />
                      {s.label}
                    </span>
                  ))}
                </div>
              </div>
              <Chart
                series={speedSeries}
                xMin={0}
                xMax={distanceDomain}
                yMin={speedYMin}
                yMax={speedYMax}
                xFormatter={(x) => `${Math.round(x)}m`}
                yFormatter={(y) => `${Math.round(y)}`}
                ariaLabel="Velocidade por distância"
              />
            </div>

            <div className={styles.chartPanel}>
              <div className={styles.chartHead}>
                <span className={styles.chartLabel}>Acelerador / freio × distância · volta {primaryLapNumber}</span>
                <div className={styles.legend}>
                  <span>
                    <span className={styles.swatch} style={{ background: "var(--good)" }} />
                    Acelerador
                  </span>
                  <span>
                    <span className={styles.swatch} style={{ background: "var(--danger)" }} />
                    Freio
                  </span>
                </div>
              </div>
              <Chart
                series={pedalSeries}
                xMin={0}
                xMax={distanceDomain}
                yMin={0}
                yMax={100}
                xFormatter={(x) => `${Math.round(x)}m`}
                yFormatter={(y) => `${Math.round(y)}%`}
                ariaLabel="Acelerador e freio por distância"
              />
            </div>

            <div className={styles.chartPanel}>
              <div className={styles.chartHead}>
                <span className={styles.chartLabel}>Temperatura de pneu × distância · volta {primaryLapNumber}</span>
                <div className={styles.legend}>
                  {tyreSeries.map((s) => (
                    <span key={s.label}>
                      <span className={styles.swatch} style={{ background: s.color }} />
                      {s.label}
                    </span>
                  ))}
                </div>
              </div>
              <Chart
                series={tyreSeries}
                xMin={0}
                xMax={distanceDomain}
                yMin={50}
                yMax={120}
                xFormatter={(x) => `${Math.round(x)}m`}
                yFormatter={(y) => `${Math.round(y)}°`}
                ariaLabel="Temperatura de superfície dos 4 pneus por distância"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
