import { httpGet, httpPost } from "./httpClient";
import type { SessionSummary, SessionDetail, LapTelemetryResponse, CoachAnalysisResponse } from "@/types/rest";

export function fetchSessions(): Promise<SessionSummary[]> {
  return httpGet<SessionSummary[]>("/sessions");
}

export function fetchSessionDetail(id: number): Promise<SessionDetail> {
  return httpGet<SessionDetail>(`/sessions/${id}`);
}

export function fetchLapTelemetry(sessionId: number, lapNumber: number): Promise<LapTelemetryResponse> {
  return httpGet<LapTelemetryResponse>(`/sessions/${sessionId}/laps/${lapNumber}/telemetry`);
}

// POST, não GET: no cache miss do lado do servidor isso dispara uma chamada
// paga à API da Anthropic - ver TelemetryF1_API/src/http/routes/analysisRouter.ts.
export function analyzeLaps(sessionId: number, lapA: number, lapB: number): Promise<CoachAnalysisResponse> {
  return httpPost<CoachAnalysisResponse>(`/sessions/${sessionId}/analysis`, { lapA, lapB });
}
