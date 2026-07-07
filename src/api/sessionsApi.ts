import { httpGet } from "./httpClient";
import type { SessionSummary, SessionDetail, LapTelemetryResponse } from "@/types/rest";

export function fetchSessions(): Promise<SessionSummary[]> {
  return httpGet<SessionSummary[]>("/sessions");
}

export function fetchSessionDetail(id: number): Promise<SessionDetail> {
  return httpGet<SessionDetail>(`/sessions/${id}`);
}

export function fetchLapTelemetry(sessionId: number, lapNumber: number): Promise<LapTelemetryResponse> {
  return httpGet<LapTelemetryResponse>(`/sessions/${sessionId}/laps/${lapNumber}/telemetry`);
}
