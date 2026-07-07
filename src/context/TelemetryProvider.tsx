import { useEffect, useMemo, useState, type ReactNode } from "react";
import { env } from "@/config/env";
import type { CarMotionData, CarTelemetryData, LapData, TelemetryWsMessage } from "@/types/ws";
import { TelemetryContext, type ConnectionState, type TelemetryContextValue } from "./telemetryContext";

const MAX_RECONNECT_DELAY_MS = 15000;

/**
 * Conexão WebSocket única e compartilhada por todo o app. WebSocket nativo
 * do browser não reconecta sozinho - fazemos isso manualmente com backoff
 * exponencial. Cada tipo de pacote (motion/lapData/carTelemetry) vira um
 * estado independente, já com data[playerCarIndex] extraído: quem consome
 * o contexto nunca lida com o array de 22 carros nem com o índice.
 */
export function TelemetryProvider({ children }: { children: ReactNode }) {
  const [connectionState, setConnectionState] = useState<ConnectionState>("connecting");
  const [motion, setMotion] = useState<CarMotionData | null>(null);
  const [lapData, setLapData] = useState<LapData | null>(null);
  const [carTelemetry, setCarTelemetry] = useState<CarTelemetryData | null>(null);
  const [lastMessageAt, setLastMessageAt] = useState<number | null>(null);

  useEffect(() => {
    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let reconnectAttempt = 0;
    let intentionalClose = false;

    function scheduleReconnect() {
      setConnectionState("reconnecting");
      const delay = Math.min(1000 * 2 ** reconnectAttempt, MAX_RECONNECT_DELAY_MS);
      reconnectAttempt += 1;
      reconnectTimer = setTimeout(connect, delay);
    }

    function connect() {
      socket = new WebSocket(env.wsUrl);

      socket.onopen = () => {
        reconnectAttempt = 0;
        setConnectionState("connected");
      };

      socket.onmessage = (event: MessageEvent<string>) => {
        let message: TelemetryWsMessage<unknown>;
        try {
          message = JSON.parse(event.data);
        } catch {
          return; // mensagem malformada, ignora
        }

        const player = message.data[message.playerCarIndex];
        if (!player) return;

        setLastMessageAt(Date.now());
        if (message.type === "motion") setMotion(player as CarMotionData);
        else if (message.type === "lapData") setLapData(player as LapData);
        else if (message.type === "carTelemetry") setCarTelemetry(player as CarTelemetryData);
      };

      socket.onclose = () => {
        if (intentionalClose) return;
        scheduleReconnect();
      };

      socket.onerror = () => {
        socket?.close();
      };
    }

    connect();

    return () => {
      intentionalClose = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, []);

  // Nota de performance: como os 3 tipos moram no mesmo Context, qualquer
  // consumidor (mesmo um que só lê connectionState) re-renderiza a cada
  // pacote recebido. Aceitável para o volume atual; se isso virar jank
  // perceptível, o próximo passo é dividir em 3 Contexts separados - não
  // vale otimizar isso preventivamente agora.
  const value = useMemo<TelemetryContextValue>(
    () => ({ connectionState, motion, lapData, carTelemetry, lastMessageAt }),
    [connectionState, motion, lapData, carTelemetry, lastMessageAt]
  );

  return <TelemetryContext.Provider value={value}>{children}</TelemetryContext.Provider>;
}
