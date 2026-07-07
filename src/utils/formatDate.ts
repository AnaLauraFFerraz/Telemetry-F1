export function formatSessionDateTime(iso: string): { date: string; time: string } {
  const parsed = new Date(iso);
  return {
    date: parsed.toLocaleDateString("pt-BR"),
    time: parsed.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
  };
}

/**
 * Aproximação: lastSeenAt é atualizado a cada pacote recebido, não marca um
 * "fim de sessão" de verdade (não temos esse evento no backend ainda).
 */
export function formatSessionDuration(startedAt: string, lastSeenAt: string): string {
  const ms = new Date(lastSeenAt).getTime() - new Date(startedAt).getTime();
  const totalMinutes = Math.max(0, Math.round(ms / 60000));
  if (totalMinutes < 1) return "<1min";
  return `${totalMinutes}min`;
}
