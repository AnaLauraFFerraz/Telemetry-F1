import { useCallback } from "react";
import { useFetch } from "./useFetch";
import { fetchLapTelemetry } from "./sessionsApi";
import type { LapTelemetryResponse } from "@/types/rest";

const EMPTY_RESPONSE: LapTelemetryResponse = { carTelemetry: [], motion: [] };

/**
 * lapNumber null (nenhuma volta selecionada pra comparação ainda) resolve
 * pra uma resposta vazia sem chamar a API - evita um fetch inútil.
 */
export function useLapTelemetry(sessionId: number, lapNumber: number | null) {
  const fetcher = useCallback(() => {
    if (lapNumber === null) return Promise.resolve(EMPTY_RESPONSE);
    return fetchLapTelemetry(sessionId, lapNumber);
  }, [sessionId, lapNumber]);

  return useFetch(fetcher, [sessionId, lapNumber]);
}
