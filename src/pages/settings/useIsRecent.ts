import { useEffect, useState } from "react";

/**
 * true se `timestamp` (epoch ms) foi atualizado há menos de `thresholdMs`.
 * Precisa de um timer próprio porque a "atualidade" muda com o tempo mesmo
 * sem nenhum re-render disparado por dado novo.
 */
export function useIsRecent(timestamp: number | null, thresholdMs = 5000): boolean {
  const [, forceTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => forceTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  if (timestamp === null) return false;
  return Date.now() - timestamp < thresholdMs;
}
