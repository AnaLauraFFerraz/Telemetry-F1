import { useState, type MouseEvent, type RefObject } from "react";
import { nearestPointIndex } from "./chartMath";

interface UseChartHoverParams {
  containerRef: RefObject<HTMLDivElement>;
  points: [number, number][];
  xMin: number;
  xMax: number;
  plotLeft: number;
  plotRight: number;
  svgWidth: number;
}

/** Crosshair + tooltip: encontra o ponto mais próximo do mouse em X. */
export function useChartHover({ containerRef, points, xMin, xMax, plotLeft, plotRight, svgWidth }: UseChartHoverParams) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [pointerRatio, setPointerRatio] = useState(0);

  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || points.length === 0) return;

    const relX = ((e.clientX - rect.left) / rect.width) * svgWidth;
    const xValue = xMin + ((relX - plotLeft) / (plotRight - plotLeft)) * (xMax - xMin);

    if (xValue < xMin || xValue > xMax) {
      setHoverIndex(null);
      return;
    }

    setHoverIndex(nearestPointIndex(points, xValue));
    setPointerRatio((e.clientX - rect.left) / rect.width);
  }

  function handleMouseLeave() {
    setHoverIndex(null);
  }

  return { hoverIndex, pointerRatio, handleMouseMove, handleMouseLeave };
}
