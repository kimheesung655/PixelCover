import { isPainted, type Area, type BrushMask } from "./brush-mask";

/*
 * 브러시·지우개 작업을 순서대로 그리기 위한 순수 계산(캔버스 없이 테스트 가능).
 *
 * 규칙
 * - 모자이크·블러는 적용한 순서대로 쌓인다.
 * - 가리기는 엔진과 같게 효과보다 우선한다(효과 전후로 덮는다).
 * - 지우개는 그때까지의 효과를 지우고 원본으로 되돌린다. 단, 지우개보다 나중의 가리기가 덮은 픽셀은 되돌리지 않는다.
 */

export type StepEffect = "mosaic" | "blur" | "redact" | "erase";

/** 정규화된(정수·이미지 안) 영역과 효과. mask가 있으면 칠한 픽셀에만 적용한다. */
export type EditStep = { region: Area; effect: StepEffect; mask?: BrushMask };

/** 최종적으로 '가리기'로 덮여야 하는 픽셀. box 안에서 data[(y - box.y) * box.width + (x - box.x)] === 1. */
export type Coverage = { box: Area; data: Uint8Array };

export function stepTouches(step: EditStep, x: number, y: number): boolean {
  const { region, mask } = step;
  if (x < region.x || y < region.y || x >= region.x + region.width || y >= region.y + region.height) return false;
  return mask ? isPainted(mask, x, y) : true;
}

function unionBox(areas: readonly Area[]): Area {
  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  for (const area of areas) {
    left = Math.min(left, area.x);
    top = Math.min(top, area.y);
    right = Math.max(right, area.x + area.width);
    bottom = Math.max(bottom, area.y + area.height);
  }
  return { x: left, y: top, width: right - left, height: bottom - top };
}

/** 각 픽셀을 마지막으로 건드린 가리기·지우개 작업이 가리기인 곳. 가리기가 없으면 null. */
export function computeCoverage(steps: readonly EditStep[]): Coverage | null {
  const redactions = steps.filter(({ effect }) => effect === "redact");
  if (redactions.length === 0) return null;

  const box = unionBox(redactions.map(({ region }) => region));
  const data = new Uint8Array(box.width * box.height);
  for (const step of steps) {
    if (step.effect !== "redact" && step.effect !== "erase") continue;
    const value = step.effect === "redact" ? 1 : 0;
    const left = Math.max(step.region.x, box.x);
    const top = Math.max(step.region.y, box.y);
    const right = Math.min(step.region.x + step.region.width, box.x + box.width);
    const bottom = Math.min(step.region.y + step.region.height, box.y + box.height);
    for (let y = top; y < bottom; y++) {
      for (let x = left; x < right; x++) {
        if (step.mask && !isPainted(step.mask, x, y)) continue;
        data[(y - box.y) * box.width + (x - box.x)] = value;
      }
    }
  }
  return { box, data };
}

export function isCovered(coverage: Coverage | null, x: number, y: number): boolean {
  if (!coverage) return false;
  const { box, data } = coverage;
  const col = x - box.x;
  const row = y - box.y;
  return col >= 0 && row >= 0 && col < box.width && row < box.height && data[row * box.width + col] === 1;
}

/** area 크기 RGBA에서 덮여야 하는 픽셀을 불투명 검정(엔진 가리기와 같은 #000, 알파 255)으로 칠한다. */
export function blackenCovered(pixels: Uint8ClampedArray, area: Area, coverage: Coverage): void {
  for (let row = 0; row < area.height; row++) {
    for (let col = 0; col < area.width; col++) {
      if (!isCovered(coverage, area.x + col, area.y + row)) continue;
      const i = (row * area.width + col) * 4;
      pixels[i] = 0;
      pixels[i + 1] = 0;
      pixels[i + 2] = 0;
      pixels[i + 3] = 255;
    }
  }
}

/**
 * 지우개 한 번. pixels와 source는 step.region 크기의 RGBA(현재 결과와 원본).
 * 지우개가 지나간 픽셀을 원본으로 되돌리되, 최종적으로 가려질 픽셀은 그대로 둔다(원본이 다시 새지 않게).
 */
export function restoreErased(
  pixels: Uint8ClampedArray,
  source: Uint8ClampedArray,
  step: EditStep,
  coverage: Coverage | null,
): void {
  const { region } = step;
  for (let row = 0; row < region.height; row++) {
    for (let col = 0; col < region.width; col++) {
      const x = region.x + col;
      const y = region.y + row;
      if (!stepTouches(step, x, y) || isCovered(coverage, x, y)) continue;
      const i = (row * region.width + col) * 4;
      pixels[i] = source[i];
      pixels[i + 1] = source[i + 1];
      pixels[i + 2] = source[i + 2];
      pixels[i + 3] = source[i + 3];
    }
  }
}
