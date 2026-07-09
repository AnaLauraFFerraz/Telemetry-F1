import { useCoachAnalysis } from "@/api/useCoachAnalysis";
import styles from "./CoachPanel.module.css";

interface CoachPanelProps {
  sessionId: number;
  primaryLapNumber: number | null;
  comparisonLapNumber: number | null;
}

export function CoachPanel({ sessionId, primaryLapNumber, comparisonLapNumber }: CoachPanelProps) {
  const { state, analyze } = useCoachAnalysis(sessionId);

  const canAnalyze = primaryLapNumber !== null && comparisonLapNumber !== null;
  // Resultado (ou erro) de um par antigo - usuário trocou a volta de
  // comparação depois de já ter analisado/tentado. Trata como se nada
  // tivesse acontecido ainda, em vez de mostrar um resultado ou erro que
  // não corresponde mais à seleção atual da tabela.
  const isStale =
    state.status !== "idle" && (state.lapA !== primaryLapNumber || state.lapB !== comparisonLapNumber);
  const showLoading = state.status === "loading" && !isStale;
  const showError = state.status === "error" && !isStale;
  const showResult = state.status === "success" && !isStale;

  function handleAnalyze() {
    if (primaryLapNumber === null || comparisonLapNumber === null) return;
    analyze(primaryLapNumber, comparisonLapNumber);
  }

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
          <button className={styles.analyzeButton} onClick={handleAnalyze} disabled={!canAnalyze}>
            Tentar de novo
          </button>
        </>
      )}

      {showResult && state.status === "success" && (
        <>
          {state.data.cached && <div className={styles.cachedBadge}>Análise em cache</div>}
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
          <button className={styles.analyzeButton} onClick={handleAnalyze} disabled={!canAnalyze}>
            Analisar diferença
          </button>
        </>
      )}
    </div>
  );
}
