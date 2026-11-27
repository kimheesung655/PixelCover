import { exportImage, ImageEditError, normalizeRegion, renderImage, type EditRegion } from "../../lib/editor";
import { applyBlur } from "../../lib/canvas/blur";
import { applyMosaic } from "../../lib/canvas/mosaic";
import { keepPaintedPixels, type Area, type BrushMask } from "./brush-mask";
import { blackenCovered, computeCoverage, restoreErased, type Coverage, type EditStep } from "./edit-ops";

/*
 * 브러시·지우개를 위한 프론트 임시 렌더러.
 *
 * 엔진(src/lib)은 지금 사각형 영역의 모자이크·블러·가리기만 처리한다. 프론트 전용 정보(칠한 모양, 지우개)가 붙은
 * 영역이 하나도 없으면 엔진 renderImage·exportImage를 그대로 쓰고, 있을 때만 이 파일이 그린다.
 * 모자이크·블러 픽셀 계산은 엔진 함수를 그대로 재사용하고, 인코딩도 엔진 exportImage에 맡긴다.
 * 엔진이 마스크 영역과 지우개를 지원하면 이 파일은 지우고 엔진 호출로 되돌린다.
 */

/**
 * 편집 영역(ID)별 프론트 전용 정보.
 * - erase: 지우개 작업이다. RegionEditor에는 type "redact"로 들어 있다(혹시 엔진만으로 그려져도 덮는 쪽으로 실패하도록).
 * - mask: 브러시로 칠한 픽셀. 없으면 영역 사각형 전체.
 */
export type EditOp = { erase: boolean; mask?: BrushMask };
export type EditOps = ReadonlyMap<string, EditOp>;

function needsFrontendRenderer(regions: readonly EditRegion[], ops: EditOps): boolean {
  return regions.some(({ id }) => ops.has(id));
}

export function renderEdits(
  image: ImageBitmap,
  regions: readonly EditRegion[],
  ops: EditOps,
  target: CanvasRenderingContext2D,
): void {
  if (!needsFrontendRenderer(regions, ops)) {
    renderImage(image, regions, target);
    return;
  }

  const { width, height } = image;
  if (width === 0 || height === 0) {
    throw new ImageEditError("RENDER_FAILED", "이미지 비트맵이 닫혔거나 비어 있습니다.");
  }
  const seen = new Set<string>();
  const steps: EditStep[] = regions.map((region) => {
    const normalized = normalizeRegion(region, width, height);
    if (seen.has(normalized.id)) {
      throw new ImageEditError("INVALID_REGION", "같은 ID의 편집 영역이 이미 있습니다.");
    }
    seen.add(normalized.id);
    const op = ops.get(normalized.id);
    return { region: normalized, effect: op?.erase ? "erase" : normalized.type, mask: op?.mask };
  });
  const intensities = new Map(regions.map(({ id, intensity }) => [id, intensity]));
  const coverage = computeCoverage(steps);

  try {
    target.canvas.width = width;
    target.canvas.height = height;
    target.drawImage(image, 0, 0);
    // 가려질 원본이 블러·모자이크 계산에 섞이지 않도록 효과 전에도 가린다(엔진과 같은 규칙).
    if (coverage) paintCoverage(target, coverage);
    regions.forEach(({ id }, index) => {
      const step = steps[index];
      if (step.effect === "redact") return;

      const { x, y, width: regionWidth, height: regionHeight } = step.region;
      const pixels = target.getImageData(x, y, regionWidth, regionHeight);
      if (step.effect === "erase") {
        restoreErased(pixels.data, readSource(image, step.region), step, coverage);
      } else {
        const before = step.mask ? pixels.data.slice() : undefined;
        const local = { x: 0, y: 0, width: regionWidth, height: regionHeight };
        const intensity = intensities.get(id) ?? 1;
        if (step.effect === "mosaic") applyMosaic(pixels, local, intensity);
        else applyBlur(pixels, local, intensity);
        if (step.mask && before) keepPaintedPixels(pixels.data, before, step.region, step.mask);
      }
      target.putImageData(pixels, x, y);
    });
    if (coverage) paintCoverage(target, coverage);
  } catch (cause) {
    // 실패했을 때 편집 전 원본이 그대로 보이면 안 된다.
    target.canvas.width = 0;
    throw new ImageEditError("RENDER_FAILED", "편집 이미지 렌더링에 실패했습니다.", { cause });
  }
}

function paintCoverage(target: CanvasRenderingContext2D, coverage: Coverage): void {
  const { box } = coverage;
  const pixels = target.getImageData(box.x, box.y, box.width, box.height);
  blackenCovered(pixels.data, box, coverage);
  target.putImageData(pixels, box.x, box.y);
}

/** 원본 비트맵에서 area 부분의 픽셀(지우개가 되돌릴 값). */
function readSource(image: ImageBitmap, area: Area): Uint8ClampedArray {
  const canvas = document.createElement("canvas");
  try {
    canvas.width = area.width;
    canvas.height = area.height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new ImageEditError("RENDER_FAILED", "원본 픽셀을 읽을 캔버스를 열 수 없습니다.");
    context.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, area.width, area.height);
    return context.getImageData(0, 0, area.width, area.height).data;
  } finally {
    canvas.width = 0;
  }
}

/** 원본 해상도 PNG. 프론트 전용 작업이 있으면 합성한 결과를 엔진 exportImage로 인코딩한다(메타데이터 미포함). */
export async function exportEdits(image: ImageBitmap, regions: readonly EditRegion[], ops: EditOps): Promise<Blob> {
  if (!needsFrontendRenderer(regions, ops)) return exportImage(image, regions, "image/png");

  let canvas: HTMLCanvasElement | undefined;
  let flattened: ImageBitmap | undefined;
  try {
    canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) throw new ImageEditError("RENDER_FAILED", "출력 캔버스의 2D 컨텍스트를 열 수 없습니다.");
    renderEdits(image, regions, ops, context);
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
