import { test } from "node:test";
import assert from "node:assert/strict";
import { topOpportunities } from "./coachInsights.ts";
import type { LapInsights, CornerInsight } from "../types/rest.ts";

function makeCorner(index: number, deltaLossS: number): CornerInsight {
  return {
    corner: { index, apexDistance: index * 100, apexSpeed: 150, brakingStartDistance: index * 100 - 20, exitDistance: index * 100 + 20, severity: "medium" },
    deltaLossS,
    braking: { brakingPointDiffM: null, peakBrakeDiff: null, trailBrakingPrimary: false, trailBrakingComparison: false },
    throttle: { throttleOnDiffM: null, coastingTimePrimaryS: 0, coastingTimeComparisonS: 0, throttleOscillationPrimary: 0, throttleOscillationComparison: 0 },
    lineDeviation: null,
  };
}

function makeInsights(corners: CornerInsight[]): LapInsights {
  return { totalDeltaS: 0, corners, tyreWindowExcursions: [] };
}

test("ordena por deltaLossS decrescente e limita a 3 por padrão", () => {
  const insights = makeInsights([makeCorner(1, 0.2), makeCorner(2, 0.8), makeCorner(3, 0.5), makeCorner(4, 0.1)]);
  const top = topOpportunities(insights);
  assert.deepEqual(
    top.map((c) => c.corner.index),
    [2, 3, 1]
  );
});

test("ignora curvas com deltaLossS zero ou negativo (onde a volta principal não perdeu tempo)", () => {
  const insights = makeInsights([makeCorner(1, 0.3), makeCorner(2, 0), makeCorner(3, -0.1)]);
  const top = topOpportunities(insights);
  assert.deepEqual(
    top.map((c) => c.corner.index),
    [1]
  );
});

test("respeita o parâmetro max", () => {
  const insights = makeInsights([makeCorner(1, 0.9), makeCorner(2, 0.8), makeCorner(3, 0.7)]);
  assert.equal(topOpportunities(insights, 2).length, 2);
});

test("sem curvas com perda, devolve array vazio", () => {
  const insights = makeInsights([]);
  assert.deepEqual(topOpportunities(insights), []);
});
