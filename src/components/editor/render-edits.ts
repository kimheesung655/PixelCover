import { exportImage, ImageEditError, normalizeRegion, renderImage, type EditRegion } from "../../lib/editor";
import { applyBlur } from "../../lib/canvas/blur";
import { applyMosaic } from "../../lib/canvas/mosaic";
import { applyRedaction } from "../../lib/canvas/redact";
import { fillPaintedPixels, keepPaintedPixels, type BrushMask } from "./brush-mask";

/*
 * 브러시(마스크) 영역을 위한 프론트 임시 렌더러.
 *
 * 엔진(src/lib)은 지금 사각형 영역만 처리한다. 브러시로 칠한 영역이 하나도 없으면 엔진 renderImage·exportImage를
 * 그대로 쓰고, 있을 때만 엔진과 같은 순서(가림 → 효과 → 가림)로 그리면서 칠한 픽셀에만 효과를 남긴다.
 * 모자이크·블러·가림 픽셀 계산은 엔진 함수를 그대로 재사용한다.
 * 엔진에 마스크 영역 지원이 생기면 이 파일은 지우고 엔진 호출로 되돌린다.
 */

export type BrushMasks = ReadonlyMap<string, BrushMask>;

function hasBrushRegion(regions: readonly EditRegion[], masks: BrushMasks): boolean {
  return regions.some(({ id }) => masks.has(id));
}

export function renderEdits(
  image: ImageBitmap,
  regions: readonly EditRegion[],
  masks: BrushMasks,
  target: CanvasRenderingContext2D,
): void {
  if (!hasBrushRegion(regions, masks)) {
    renderImage(image, regions, target);
    return;
  }

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
    target.canvas.width = width;
    target.canvas.height = height;
    target.drawImage(image, 0, 0);
    // 가려질 원본이 블러·모자이크 계산에 섞이지 않도록 효과 전에도 가린다(엔진과 같은 규칙).
    for (const region of redactions) redact(target, region, masks.get(region.id));
    for (const region of normalized) {
      if (region.type === "redact") continue;

      const { x, y, width: regionWidth, height: regionHeight, intensity } = region;
      const pixels = target.getImageData(x, y, regionWidth, regionHeight);
      const mask = masks.get(region.id);
      const original = mask ? pixels.data.slice() : undefined;
      const local = { x: 0, y: 0, width: regionWidth, height: regionHeight };
      if (region.type === "mosaic") applyMosaic(pixels, local, intensity);
      else applyBlur(pixels, local, intensity);
      if (mask && original) keepPaintedPixels(pixels.data, original, region, mask);
      target.putImageData(pixels, x, y);
    }
    for (const region of redactions) redact(target, region, masks.get(region.id));
  } catch (cause) {
    // 실패했을 때 편집 전 원본이 그대로 보이면 안 된다.
    target.canvas.width = 0;
    throw new ImageEditError("RENDER_FAILED", "편집 이미지 렌더링에 실패했습니다.", { cause });
  }
}

function redact(target: CanvasRenderingContext2D, region: EditRegion, mask: BrushMask | undefined): void {
  if (!mask) {
    applyRedaction(target, region);
    return;
  }
  const pixels = target.getImageData(region.x, region.y, region.width, region.height);
  fillPaintedPixels(pixels.data, region, mask);
  target.putImageData(pixels, region.x, region.y);
}

/** 원본 해상도 PNG. 브러시 영역이 있으면 합성한 결과를 엔진 exportImage로 인코딩한다(메타데이터 미포함). */
export async function exportEdits(
  image: ImageBitmap,
  regions: readonly EditRegion[],
  masks: BrushMasks,
): Promise<Blob> {
  if (!hasBrushRegion(regions, masks)) return exportImage(image, regions, "image/png");

  let canvas: HTMLCanvasElement | undefined;
  let flattened: ImageBitmap | undefined;
  try {
    canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) throw new ImageEditError("RENDER_FAILED", "출력 캔버스의 2D 컨텍스트를 열 수 없습니다.");
    renderEdits(image, regions, masks, context);
    flattened = await createImageBitmap(canvas);
    return await exportImage(flattened, [], "image/png");
  } catch (cause) {
    if (cause instanceof ImageEditError) throw cause;
    throw new ImageEditError("EXPORT_FAILED", "이미지를 내보낼 수 없습니다.", { cause });
  } finally {
    flattened?.close();
    if (canvas) canvas.width = 0;
  }
}
