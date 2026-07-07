import { useEffect, useRef, useState } from "react";

/**
 * O WebSocket não manda "melhor volta" ao vivo (só currentLapTimeInMS e
 * lastLapTimeInMS por pacote LapData). Rastreamos a menor lastLapTimeInMS
 * observada desde que o dashboard abriu, atualizando só quando o valor
 * muda (ou seja, quando uma volta de fato acabou de fechar).
 */
export function useBestLapTracker(lastLapTimeMs: number | null): number | null {
  const [bestLapMs, setBestLapMs] = useState<number | null>(null);
  const previousLastLapRef = useRef<number | null>(null);

  useEffect(() => {
    if (!lastLapTimeMs || lastLapTimeMs === previousLastLapRef.current) return;
    previousLastLapRef.current = lastLapTimeMs;
    setBestLapMs((prev) => (prev === null || lastLapTimeMs < prev ? lastLapTimeMs : prev));
  }, [lastLapTimeMs]);

  return bestLapMs;
}
