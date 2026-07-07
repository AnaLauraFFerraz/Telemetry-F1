import { test } from "node:test";
import assert from "node:assert/strict";
import { buildPathD, nearestPointIndex } from "./chartMath.ts";

test("buildPathD gera M no primeiro ponto e L nos seguintes", () => {
  const points: [number, number][] = [
    [0, 0],
    [10, 5],
    [20, 2],
  ];
  const d = buildPathD(
    points,
    (x) => x,
    (y) => y
  );
  assert.equal(d, "M0.0,0.0 L10.0,5.0 L20.0,2.0");
});

test("nearestPointIndex acha o ponto mais próximo em x", () => {
  const points: [number, number][] = [
    [0, 0],
    [10, 0],
    [20, 0],
    [30, 0],
  ];
  assert.equal(nearestPointIndex(points, 12), 1);
  assert.equal(nearestPointIndex(points, 18), 2);
  assert.equal(nearestPointIndex(points, -5), 0);
  assert.equal(nearestPointIndex(points, 999), 3);
});

test("nearestPointIndex em array vazio retorna 0 sem crashar", () => {
  assert.equal(nearestPointIndex([], 5), 0);
});
