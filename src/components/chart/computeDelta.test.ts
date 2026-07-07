import { test } from "node:test";
import assert from "node:assert/strict";
import { computeDelta } from "./computeDelta.ts";

function sample(lapDistance: number, sessionTime: number) {
  return {
    lapDistance,
    sessionTime,
    speed: 0,
    throttle: 0,
    brake: 0,
    steer: 0,
    gear: 0,
    engineRpm: 0,
    drs: 0,
    tyrePressure: { rearLeft: 0, rearRight: 0, frontLeft: 0, frontRight: 0 },
    tyreSurfaceTemp: { rearLeft: 0, rearRight: 0, frontLeft: 0, frontRight: 0 },
    tyreInnerTemp: { rearLeft: 0, rearRight: 0, frontLeft: 0, frontRight: 0 },
  };
}

test("arrays vazios retornam delta vazio", () => {
  assert.deepEqual(computeDelta([], []), []);
  assert.deepEqual(computeDelta([sample(0, 0)], []), []);
});

test("voltas idênticas têm delta zero em todo ponto", () => {
  const lap = [sample(0, 100), sample(50, 110), sample(100, 120)];
  const result = computeDelta(lap, lap);
  for (const [, delta] of result) {
    assert.ok(Math.abs(delta) < 1e-9);
  }
});

test("volta de comparação mais rápida gera delta positivo (principal está atrás)", () => {
  const primary = [sample(0, 100), sample(100, 120)]; // 20s pra percorrer 100m
  const comparison = [sample(0, 200), sample(100, 215)]; // 15s pra percorrer 100m (mais rápida)
  const result = computeDelta(primary, comparison);
  const lastDelta = result[result.length - 1][1];
  assert.ok(lastDelta > 0); // principal perdeu tempo em relação à comparação
});

test("interpola linearmente quando a distância cai entre duas amostras da comparação", () => {
  const primary = [sample(25, 100)];
  const comparison = [sample(0, 200), sample(50, 210)];
  const result = computeDelta(primary, comparison);
  // comparação normalizada: [0, 10]; interpolado em 25m = 5; primary normalizado = 0
  assert.equal(result[0][1], -5);
});
