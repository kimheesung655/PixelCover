import type { EditRegion } from "../editor/edit-region";

export type PixelBuffer = Pick<ImageData, "data" | "width" | "height">;
export type PixelRegion = Pick<EditRegion, "x" | "y" | "width" | "height">;

/** The region is already normalized and lies within the buffer. */
export function applyMosaic(
  { data, width }: PixelBuffer,
  region: PixelRegion,
  intensity: number,
): void {
  const blockSize = 2 + Math.floor((intensity - 1) * 30 / 99);
  const right = region.x + region.width;
  const bottom = region.y + region.height;

  for (let y = region.y; y < bottom; y += blockSize) {
    const blockBottom = Math.min(y + blockSize, bottom);
    for (let x = region.x; x < right; x += blockSize) {
      const blockRight = Math.min(x + blockSize, right);
      let red = 0;
      let green = 0;
      let blue = 0;
      let alpha = 0;
      for (let row = y; row < blockBottom; row++) {
        for (let col = x; col < blockRight; col++) {
          const index = (row * width + col) * 4;
          const opacity = data[index + 3];
          red += data[index] * opacity;
          green += data[index + 1] * opacity;
          blue += data[index + 2] * opacity;
          alpha += opacity;
        }
      }

      const averageRed = alpha ? red / alpha : 0;
      const averageGreen = alpha ? green / alpha : 0;
      const averageBlue = alpha ? blue / alpha : 0;
      const averageAlpha = alpha / ((blockBottom - y) * (blockRight - x));
      for (let row = y; row < blockBottom; row++) {
        for (let col = x; col < blockRight; col++) {
          const index = (row * width + col) * 4;
          data[index] = averageRed;
          data[index + 1] = averageGreen;
          data[index + 2] = averageBlue;
          data[index + 3] = averageAlpha;
        }
      }
    }
  }
}
