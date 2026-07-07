export function formatLapTime(ms: number | null): string {
  if (ms === null || ms <= 0) return "—";
  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = (totalSeconds - minutes * 60).toFixed(3).padStart(6, "0");
  return `${minutes}:${seconds}`;
}
