import type { PixelBuffer, PixelRegion } from "./mosaic";

/** Replace every channel so the covered pixels retain neither color nor alpha. */
export function applyRedaction({ data, width }: PixelBuffer, region: PixelRegion): void {
  const bottom = region.y + region.height;
  for (let row = region.y; row < bottom; row++) {
    const start = (row * width + region.x) * 4;
    const end = start + region.width * 4;
    data.fill(0, start, end);
    for (let alpha = start + 3; alpha < end; alpha += 4) {
      data[alpha] = 255;
    }
  }
}
