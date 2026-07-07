/**
 * Espelha C:\Telemetry\TelemetryF1_API\src\ws\messageFormat.ts e os tipos em
 * src\telemetry\{motion,lapData,carTelemetry}\types.ts do backend. Repos
 * separados -> essa duplicação é intencional; atualizar manualmente se o
 * backend mudar o formato das mensagens.
 */

export type TelemetryMessageType = "motion" | "lapData" | "carTelemetry";

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface WheelSet<T> {
  rearLeft: T;
  rearRight: T;
  frontLeft: T;
  frontRight: T;
}

export interface CarMotionData {
  worldPosition: Vector3;
  worldVelocity: Vector3;
  worldForwardDir: Vector3;
  worldRightDir: Vector3;
  gForceLateral: number;
  gForceLongitudinal: number;
  gForceVertical: number;
  yaw: number;
  pitch: number;
  roll: number;
}

export interface LapData {
  lastLapTimeInMS: number;
  currentLapTimeInMS: number;
  sector1TimeMSPart: number;
  sector1TimeMinutesPart: number;
  sector2TimeMSPart: number;
  sector2TimeMinutesPart: number;
  lapDistance: number;
  totalDistance: number;
  carPosition: number;
  currentLapNum: number;
  pitStatus: number;
  sector: number;
  currentLapInvalid: number;
  driverStatus: number;
  resultStatus: number;
  speedTrapFastestSpeed: number;
}

export interface CarTelemetryData {
  speed: number;
  throttle: number;
  steer: number;
  brake: number;
  gear: number;
  engineRPM: number;
  drs: number;
  revLightsPercent: number;
  revLightsBitValue: number;
  tyresPressure: WheelSet<number>;
  tyresSurfaceTemperature: WheelSet<number>;
  tyresInnerTemperature: WheelSet<number>;
}

export interface TelemetryWsMessage<T> {
  type: TelemetryMessageType;
  sessionUID: string;
  sessionTime: number;
  frameIdentifier: number;
  playerCarIndex: number;
  data: T[];
}
