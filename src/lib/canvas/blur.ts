import type { PixelBuffer, PixelRegion } from "./mosaic";

/** A clipped box blur over the region, with alpha-weighted color averaging. */
export function applyBlur(image: PixelBuffer, region: PixelRegion, intensity: number): void {
  const radius = 1 + Math.floor((intensity - 1) * 23 / 99);
  const { x, y, width, height } = region;
  const columns = new Int32Array(width * 4);
  const stride = width * 4;
  const retainedRows = Math.min(height, radius + 1);
  const output = new Uint8ClampedArray(stride * retainedRows);
  const window = new Int32Array(4);

  for (let row = 0; row < Math.min(height, radius + 1); row++) {
    updateColumns(row, 1);
  }

  for (let row = 0; row < height; row++) {
    if (row > 0 && row + radius < height) updateColumns(row + radius, 1);
    if (row > radius) {
      const expiredRow = row - radius - 1;
      updateColumns(expiredRow, -1);
      // The source row has left the vertical window and may now be overwritten.
      flushRow(expiredRow);
    }

    const rows = Math.min(height - 1, row + radius) - Math.max(0, row - radius) + 1;
    window.fill(0);
    for (let col = 0; col < Math.min(width, radius + 1); col++) {
      updateWindow(col, 1);
    }

    for (let col = 0; col < width; col++) {
      if (col > 0 && col + radius < width) updateWindow(col + radius, 1);
      if (col > radius) updateWindow(col - radius - 1, -1);

      const cols = Math.min(width - 1, col + radius) - Math.max(0, col - radius) + 1;
      const index = (row % retainedRows) * stride + col * 4;
      const alpha = window[3];
      output[index] = alpha ? window[0] / alpha : 0;
      output[index + 1] = alpha ? window[1] / alpha : 0;
      output[index + 2] = alpha ? window[2] / alpha : 0;
      output[index + 3] = alpha / (rows * cols);
    }
  }

  for (let row = height - retainedRows; row < height; row++) flushRow(row);

  function flushRow(row: number): void {
    const start = (row % retainedRows) * stride;
    const destination = ((y + row) * image.width + x) * 4;
    image.data.set(output.subarray(start, start + stride), destination);
  }

  function updateColumns(row: number, direction: 1 | -1): void {
    const start = ((y + row) * image.width + x) * 4;
    for (let offset = 0; offset < columns.length; offset += 4) {
      const pixel = start + offset;
      const alpha = image.data[pixel + 3] * direction;
      columns[offset] += image.data[pixel] * alpha;
      columns[offset + 1] += image.data[pixel + 1] * alpha;
      columns[offset + 2] += image.data[pixel + 2] * alpha;
      columns[offset + 3] += alpha;
    }
  }

  function updateWindow(col: number, direction: 1 | -1): void {
    const offset = col * 4;
    for (let channel = 0; channel < 4; channel++) {
      window[channel] += columns[offset + channel] * direction;
    }
  }
}
