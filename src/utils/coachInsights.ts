import type { LapInsights, CornerInsight } from "@/types/rest";

export const MAX_OPPORTUNITIES = 3;

export function topOpportunities(insights: LapInsights, max = MAX_OPPORTUNITIES): CornerInsight[] {
  return [...insights.corners]
    .filter((c) => c.deltaLossS > 0)
    .sort((a, b) => b.deltaLossS - a.deltaLossS)
    .slice(0, max);
}
