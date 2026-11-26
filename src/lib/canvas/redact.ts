import type { PixelRegion } from "./mosaic";

/** Fully opaque fill on the dedicated renderer context. */
export function applyRedaction(target: CanvasRenderingContext2D, region: PixelRegion): void {
  target.fillStyle = "#000";
  target.fillRect(region.x, region.y, region.width, region.height);
}
