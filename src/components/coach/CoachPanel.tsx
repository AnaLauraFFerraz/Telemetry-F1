import type { CoachAnalysisState } from "@/api/useCoachAnalysis";
import { topOpportunities } from "@/utils/coachInsights";
import styles from "./CoachPanel.module.css";

interface CoachPanelProps {
  state: CoachAnalysisState;
  isStale: boolean;
  primaryLapNumber: number | null;
  comparisonLapNumber: number | null;
  onAnalyze: () => void;
  highlightedCornerIndex: number | null;
  onHighlightCorner: (index: number | null) => void;
}

export function CoachPanel({
  state,
  isStale,
  primaryLapNumber,
  comparisonLapNumber,
  onAnalyze,
  highlightedCornerIndex,
  onHighlightCorner,
}: CoachPanelProps) {
  const canAnalyze = primaryLapNumber !== null && comparisonLapNumber !== null;
  const showLoading = state.status === "loading" && !isStale;
  const showError = state.status === "error" && !isStale;
  const showResult = state.status === "success" && !isStale;

  return (
    <div className={styles.panel}>
      <div className={styles.panelTitle}>Coach</div>

      {showLoading && state.status === "loading" && (
        <p className={styles.state}>
          Analisando volta {state.lapA} vs. {state.lapB}...
        </p>
      )}

      {showError && state.status === "error" && (
        <>
          <p className={styles.stateError}>{state.error}</p>
          <button className={styles.analyzeButton} onClick={onAnalyze} disabled={!canAnalyze}>
            Tentar de novo
          </button>
        </>
      )}

      {showResult && state.status === "success" && (
        <>
          {state.data.cached && <div className={styles.cachedBadge}>Análise em cache</div>}

          {(() => {
            const opportunities = topOpportunities(state.data.insights);
            if (opportunities.length === 0) return null;
            return (
              <div className={styles.chips}>
                {opportunities.map((c, i) => {
                  const active = highlightedCornerIndex === c.corner.index;
                  return (
                    <button
                      key={c.corner.index}
                      className={active ? styles.chipActive : styles.chip}
                      onClick={() => onHighlightCorner(active ? null : c.corner.index)}
                    >
                      {i + 1}. {Math.round(c.corner.apexDistance)}m · +{c.deltaLossS.toFixed(2)}s
                    </button>
                  );
                })}
              </div>
            );
          })()}

          <div className={styles.analysisText}>
            {state.data.analysis.split(/\n{2,}/).map((paragraph, i) => (
              <p key={i} className={styles.paragraph}>
                {paragraph}
              </p>
            ))}
          </div>
        </>
      )}

      {!showLoading && !showError && !showResult && (
        <>
          <p className={styles.panelSub}>
            {canAnalyze
              ? `Compare a volta ${primaryLapNumber} com a volta ${comparisonLapNumber} e receba onde priorizar o próximo treino.`
              : "Marque uma volta na tabela ao lado pra comparar antes de pedir uma análise."}
          </p>
          <button className={styles.analyzeButton} onClick={onAnalyze} disabled={!canAnalyze}>
            Analisar diferença
          </button>
        </>
      )}
    </div>
  );
}
