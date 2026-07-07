export function buildPathD(
  points: [number, number][],
  sx: (x: number) => number,
  sy: (y: number) => number
): string {
  return points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${sx(x).toFixed(1)},${sy(y).toFixed(1)}`).join(" ");
}

export function nearestPointIndex(points: [number, number][], xValue: number): number {
  let bestIndex = 0;
  let bestDist = Infinity;
  for (let i = 0; i < points.length; i++) {
    const dist = Math.abs(points[i][0] - xValue);
    if (dist < bestDist) {
      bestDist = dist;
      bestIndex = i;
    }
  }
  return bestIndex;
}
