import type { CarTelemetrySample } from "@/types/rest";

/**
 * sessionTime é um timestamp absoluto da sessão, não "tempo desde o início
 * da volta" - duas voltas diferentes aconteceram em instantes absolutos
 * diferentes. Por isso normalizamos cada volta subtraindo o sessionTime da
 * sua primeira amostra, aproximando "tempo decorrido desde o início da
 * volta" (a primeira amostra decimada fica a poucos metros da linha de
 * largada, então o erro dessa aproximação é pequeno).
 */
function normalizeToLapStart(samples: CarTelemetrySample[]): CarTelemetrySample[] {
  if (samples.length === 0) return samples;
  const startTime = samples[0].sessionTime;
  return samples.map((s) => ({ ...s, sessionTime: s.sessionTime - startTime }));
}

function interpolateElapsedAtDistance(samples: CarTelemetrySample[], distance: number): number {
  const lastIndex = samples.length - 1;
  if (distance <= samples[0].lapDistance) return samples[0].sessionTime;
  if (distance >= samples[lastIndex].lapDistance) return samples[lastIndex].sessionTime;

  for (let i = 0; i < lastIndex; i++) {
    const a = samples[i];
    const b = samples[i + 1];
    if (distance >= a.lapDistance && distance <= b.lapDistance) {
      const span = b.lapDistance - a.lapDistance;
      const ratio = span === 0 ? 0 : (distance - a.lapDistance) / span;
      return a.sessionTime + (b.sessionTime - a.sessionTime) * ratio;
    }
  }
  return samples[lastIndex].sessionTime;
}

/**
 * Delta acumulado entre a volta principal e a volta de comparação, ponto a
 * ponto ao longo da distância da volta principal. Positivo = principal está
 * mais devagar (atrás) da comparação naquele ponto da pista.
 */
export function computeDelta(primary: CarTelemetrySample[], comparison: CarTelemetrySample[]): [number, number][] {
  if (primary.length === 0 || comparison.length === 0) return [];

  const normalizedPrimary = normalizeToLapStart(primary);
  const normalizedComparison = normalizeToLapStart(comparison);

  return normalizedPrimary.map((sample) => {
    const comparisonElapsed = interpolateElapsedAtDistance(normalizedComparison, sample.lapDistance);
    return [sample.lapDistance, sample.sessionTime - comparisonElapsed] as [number, number];
  });
}
