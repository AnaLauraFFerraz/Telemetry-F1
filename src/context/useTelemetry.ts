import { useContext } from "react";
import { TelemetryContext, type TelemetryContextValue } from "@/context/telemetryContext";

export function useTelemetry(): TelemetryContextValue {
  const context = useContext(TelemetryContext);
  if (!context) {
    throw new Error("useTelemetry precisa ser usado dentro de um <TelemetryProvider>.");
  }
  return context;
}
