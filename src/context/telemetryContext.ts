import { createContext } from "react";
import type { CarMotionData, CarTelemetryData, LapData } from "@/types/ws";

export type ConnectionState = "connecting" | "connected" | "reconnecting" | "disconnected";

export interface TelemetryContextValue {
  connectionState: ConnectionState;
  motion: CarMotionData | null;
  lapData: LapData | null;
  carTelemetry: CarTelemetryData | null;
  lastMessageAt: number | null;
}

export const TelemetryContext = createContext<TelemetryContextValue | null>(null);
