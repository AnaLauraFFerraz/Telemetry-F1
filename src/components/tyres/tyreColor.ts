export type TyreTempStatus = "cold" | "ideal" | "hot";

const COLD_THRESHOLD_C = 70;
const HOT_THRESHOLD_C = 110;

/**
 * Thresholds são um chute inicial (faixa de operação real de pneus de F1,
 * ~80-110°C na superfície) - calibrar com dados reais do jogo assim que o
 * dashboard estiver rodando ao vivo (Fase 2 do plano de frontend).
 */
export function classifyTyreTemp(celsius: number): TyreTempStatus {
  if (celsius < COLD_THRESHOLD_C) return "cold";
  if (celsius > HOT_THRESHOLD_C) return "hot";
  return "ideal";
}
