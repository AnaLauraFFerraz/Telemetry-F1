import { test } from "node:test";
import assert from "node:assert/strict";
import { computeMapBounds, projectMapPoint, buildMapPathD } from "./trackMapMath.ts";

test("computeMapBounds cobre todos os pontos de todos os conjuntos", () => {
  const bounds = computeMapBounds([
    [
      [0, 0],
      [10, 5],
    ],
    [
      [-3, 8],
      [4, -2],
    ],
  ]);
  assert.deepEqual(bounds, { minX: -3, maxX: 10, minY: -2, maxY: 8 });
});

test("computeMapBounds sem pontos devolve um fallback finito, sem NaN/Infinity", () => {
  const bounds = computeMapBounds([]);
  assert.deepEqual(bounds, { minX: 0, maxX: 1, minY: 0, maxY: 1 });
});

test("projectMapPoint mapeia bounds quadrados 1:1 pro viewport, com z invertido", () => {
  const bounds = { minX: 0, maxX: 10, minY: 0, maxY: 10 };
  const viewport = { width: 100, height: 100, padding: 0 };

  assert.deepEqual(projectMapPoint(0, 0, bounds, viewport), [0, 100]); // z mínimo -> embaixo
  assert.deepEqual(projectMapPoint(10, 10, bounds, viewport), [100, 0]); // z máximo -> em cima
  assert.deepEqual(projectMapPoint(5, 5, bounds, viewport), [50, 50]); // centro
});

test("projectMapPoint preserva a proporção com letterboxing quando bounds e viewport têm aspect ratios diferentes", () => {
  // bounds 2:1 (largo), viewport quadrado -> escala pelo eixo mais restritivo (Y),
  // sobra margem vertical centralizada em vez de esticar a pista
  const bounds = { minX: 0, maxX: 20, minY: 0, maxY: 10 };
  const viewport = { width: 100, height: 100, padding: 0 };

  assert.deepEqual(projectMapPoint(0, 0, bounds, viewport), [0, 75]);
  assert.deepEqual(projectMapPoint(20, 10, bounds, viewport), [100, 25]);
});

test("buildMapPathD gera M no primeiro ponto e L nos seguintes, já projetados", () => {
  const bounds = { minX: 0, maxX: 10, minY: 0, maxY: 10 };
  const viewport = { width: 100, height: 100, padding: 0 };
  const d = buildMapPathD(
    [
      [0, 0],
      [10, 10],
    ],
    bounds,
    viewport
  );
  assert.equal(d, "M0.0,100.0 L100.0,0.0");
});
