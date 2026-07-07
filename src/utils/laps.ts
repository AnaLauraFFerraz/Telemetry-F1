import type { LapSummary } from "@/types/rest";

export function findBestLap(laps: LapSummary[]): LapSummary | null {
  const validLaps = laps.filter((lap) => lap.isValid);
  if (validLaps.length === 0) return null;
  return validLaps.reduce((best, lap) => (lap.lapTimeMs < best.lapTimeMs ? lap : best));
}
