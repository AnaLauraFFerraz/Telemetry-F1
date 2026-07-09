export interface MapBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface MapViewport {
  width: number;
  height: number;
  padding: number;
}

export function computeMapBounds(pointSets: [number, number][][]): MapBounds {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const points of pointSets) {
    for (const [x, y] of points) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  if (!Number.isFinite(minX)) return { minX: 0, maxX: 1, minY: 0, maxY: 1 };
  return { minX, maxX, minY, maxY };
}

export function projectMapPoint(x: number, z: number, bounds: MapBounds, viewport: MapViewport): [number, number] {
  const rangeX = bounds.maxX - bounds.minX || 1;
  const rangeZ = bounds.maxY - bounds.minY || 1;
  const availableW = viewport.width - viewport.padding * 2;
  const availableH = viewport.height - viewport.padding * 2;
  const scale = Math.min(availableW / rangeX, availableH / rangeZ);

  const scaledW = rangeX * scale;
  const scaledH = rangeZ * scale;
  const marginX = viewport.padding + (availableW - scaledW) / 2;
  const marginY = viewport.padding + (availableH - scaledH) / 2;

  const px = marginX + (x - bounds.minX) * scale;
  const py = marginY + (scaledH - (z - bounds.minY) * scale);

  return [px, py];
}

export function buildMapPathD(points: [number, number][], bounds: MapBounds, viewport: MapViewport): string {
  return points
    .map(([x, z], i) => {
      const [px, py] = projectMapPoint(x, z, bounds, viewport);
      return `${i === 0 ? "M" : "L"}${px.toFixed(1)},${py.toFixed(1)}`;
    })
    .join(" ");
}
