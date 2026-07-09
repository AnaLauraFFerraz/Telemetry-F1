import { useCallback, useState } from "react";
import { analyzeLaps } from "./sessionsApi";
import { ApiError } from "./httpClient";
import type { CoachAnalysisResponse } from "@/types/rest";

export type CoachAnalysisState =
  | { status: "idle" }
  | { status: "loading"; lapA: number; lapB: number }
  | { status: "error"; error: string; lapA: number; lapB: number }
  | { status: "success"; data: CoachAnalysisResponse; lapA: number; lapB: number };

function mapErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 503) return "Coaching indisponível: a API de IA não está configurada no servidor.";
    if (err.status === 429) return "Muitas análises em pouco tempo. Tente novamente em instantes.";
    if (err.status === 502) return "A API de IA está com problemas no momento. Tente novamente.";
    return err.message || "Erro ao gerar análise.";
  }
  return err instanceof Error ? err.message : "Erro desconhecido ao gerar análise.";
}

export function useCoachAnalysis(sessionId: number) {
  const [state, setState] = useState<CoachAnalysisState>({ status: "idle" });

  const analyze = useCallback(
    async (lapA: number, lapB: number) => {
      setState({ status: "loading", lapA, lapB });
      try {
        const data = await analyzeLaps(sessionId, lapA, lapB);
        setState({ status: "success", data, lapA, lapB });
      } catch (err) {
        setState({ status: "error", error: mapErrorMessage(err), lapA, lapB });
      }
    },
    [sessionId]
  );

  return { state, analyze };
}
