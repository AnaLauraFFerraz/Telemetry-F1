/**
 * Espelha TelemetryF1_API/src/http/routes/sessionsRouter.ts e os
 * repositórios em TelemetryF1_API/src/persistence/*Repository.ts. Repos
 * separados -> duplicação intencional, atualizar manualmente se o backend
 * mudar o formato das respostas.
 */

export interface SessionSummary {
  id: number;
  sessionUid: string;
  startedAt: string;
  lastSeenAt: string;
  lapCount: number;
  bestLapTimeMs: number | null;
}

export interface LapSummary {
  lapNumber: number;
  lapTimeMs: number;
  sector1Ms: number | null;
  sector2Ms: number | null;
  sector3Ms: number | null;
  isValid: boolean;
  carPosition: number | null;
  recordedAt: string;
}

export interface SessionDetail {
  id: number;
  sessionUid: string;
  startedAt: string;
  lastSeenAt: string;
  laps: LapSummary[];
}

interface RestWheelSet {
  rearLeft: number;
  rearRight: number;
  frontLeft: number;
  frontRight: number;
}

export interface CarTelemetrySample {
  lapDistance: number;
  sessionTime: number;
  speed: number;
  throttle: number;
  brake: number;
  steer: number;
  gear: number;
  engineRpm: number;
  drs: number;
  tyrePressure: RestWheelSet;
  tyreSurfaceTemp: RestWheelSet;
  tyreInnerTemp: RestWheelSet;
}

export interface MotionSample {
  lapDistance: number;
  sessionTime: number;
  worldPosition: { x: number; y: number; z: number };
  gForce: { lat: number; lon: number; vert: number };
}

export interface LapTelemetryResponse {
  carTelemetry: CarTelemetrySample[];
  motion: MotionSample[];
}
