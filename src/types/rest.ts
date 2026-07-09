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

/**
 * Espelha TelemetryF1_API/src/analysis/types.ts (LapInsights e afins) - o
 * JSON de insights que o endpoint de coaching devolve junto da análise em
 * texto. Mesma regra de duplicação intencional dos outros tipos deste
 * arquivo: repos separados, atualizar manualmente se o backend mudar.
 */
export type Wheel = "rearLeft" | "rearRight" | "frontLeft" | "frontRight";
export type CornerSeverity = "slow" | "medium" | "fast";

export interface Corner {
  index: number;
  apexDistance: number;
  apexSpeed: number;
  brakingStartDistance: number;
  exitDistance: number;
  severity: CornerSeverity;
}

export interface BrakingInsight {
  brakingPointDiffM: number | null;
  peakBrakeDiff: number | null;
  trailBrakingPrimary: boolean;
  trailBrakingComparison: boolean;
}

export interface ThrottleInsight {
  throttleOnDiffM: number | null;
  coastingTimePrimaryS: number;
  coastingTimeComparisonS: number;
  throttleOscillationPrimary: number;
  throttleOscillationComparison: number;
}

export interface LineDeviationInsight {
  maxLateralDeviationM: number;
  avgLateralDeviationM: number;
}

export interface TyreWindowInsight {
  wheel: Wheel;
  distanceStart: number;
  distanceEnd: number;
  avgTempC: number;
  status: "cold" | "hot";
}

export interface CornerInsight {
  corner: Corner;
  deltaLossS: number;
  braking: BrakingInsight;
  throttle: ThrottleInsight;
  lineDeviation: LineDeviationInsight | null;
}

export interface LapInsights {
  totalDeltaS: number;
  corners: CornerInsight[];
  tyreWindowExcursions: TyreWindowInsight[];
}

export interface CoachAnalysisResponse {
  analysis: string;
  insights: LapInsights;
  cached: boolean;
}
