import { ImageEditError } from "../editor/image-edit-error";
import { normalizeRegion, type EditRegion } from "../editor/edit-region";
import { applyBlur } from "./blur";
import { applyMosaic } from "./mosaic";
import { applyRedaction } from "./redact";

export function renderImage(
  image: ImageBitmap,
  regions: readonly EditRegion[],
  target: CanvasRenderingContext2D,
): void {
  const { width, height } = image;
  if (width === 0 || height === 0) {
    throw new ImageEditError("RENDER_FAILED", "이미지 비트맵이 닫혔거나 비어 있습니다.");
  }

  const seen = new Set<string>();
  const normalized = regions.map((region) => {
    const result = normalizeRegion(region, width, height);
    if (seen.has(result.id)) {
      throw new ImageEditError("INVALID_REGION", "같은 ID의 편집 영역이 이미 있습니다.");
    }
    seen.add(result.id);
    return result;
  });
  const redactions = normalized.filter(({ type }) => type === "redact");

  try {
    // Resizing also resets transforms, clipping and blend state on the dedicated canvas.
    target.canvas.width = width;
    target.canvas.height = height;
    target.drawImage(image, 0, 0);
    for (const region of redactions) applyRedaction(target, region);
    for (const region of normalized) {
      if (region.type === "redact") continue;

      const { x, y, width, height, intensity } = region;
      const pixels = target.getImageData(x, y, width, height);
      const localRegion = { x: 0, y: 0, width, height };
      if (region.type === "mosaic") applyMosaic(pixels, localRegion, intensity);
      else applyBlur(pixels, localRegion, intensity);
      target.putImageData(pixels, x, y);
    }
    for (const region of redactions) applyRedaction(target, region);
  } catch (cause) {
    // A failed effect must never leave the unedited source visible.
    target.canvas.width = 0;
    throw new ImageEditError("RENDER_FAILED", "편집 이미지 렌더링에 실패했습니다.", { cause });
  }
}
