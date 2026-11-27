import { expect, test } from "vitest";
import { isPainted, keepPaintedPixels, strokeBounds, type BrushMask } from "../../../src/components/editor/brush-mask";
import { normalizeRegion } from "../../../src/lib/editor/edit-region";

// 프론트 브러시 모드의 순수 계산 검증(마스크 그리기 자체는 브라우저 캔버스가 필요해 제외).

function maskOf(x: number, y: number, rows: string[]): BrushMask {
  const width = rows[0].length;
  const mask = new Uint8Array(width * rows.length);
  rows.forEach((row, r) => [...row].forEach((cell, c) => (mask[r * width + c] = cell === "#" ? 1 : 0)));
  return { x, y, width, height: rows.length, mask };
}

function solid(width: number, height: number, value: number): Uint8ClampedArray {
  return new Uint8ClampedArray(width * height * 4).fill(value);
}

test("획을 감싸는 사각형은 반지름과 1px 여유를 포함하고 이미지 경계로 자른다", () => {
  expect(strokeBounds({ points: [10, 10, 20, 15], size: 4 }, 100, 100)).toEqual({ x: 7, y: 7, width: 16, height: 11 });
  expect(strokeBounds({ points: [1, 98], size: 10 }, 50, 100)).toEqual({ x: 0, y: 92, width: 7, height: 8 });
});

test("획을 감싸는 사각형은 엔진 정규화를 거쳐도 그대로다", () => {
  const area = strokeBounds({ points: [3.3, 4.7, 40.2, 18.9], size: 7 }, 64, 64);
  const region = { id: "brush", type: "mosaic" as const, intensity: 50, ...area };
  expect(normalizeRegion(region, 64, 64)).toEqual(region);
});

test.each([
  { points: [], size: 4 },
  { points: [1], size: 4 },
  { points: [1, Number.NaN], size: 4 },
  { points: [1, 1], size: 0 },
])("무효한 획을 거부한다 %#", (stroke) => {
  expect(() => strokeBounds(stroke, 10, 10)).toThrow(expect.objectContaining({ code: "INVALID_REGION" }));
});

test("마스크 좌표는 이미지 기준이고 바깥은 칠하지 않은 것으로 본다", () => {
  const mask = maskOf(2, 3, ["#.", ".#"]);
  expect(isPainted(mask, 2, 3)).toBe(true);
  expect(isPainted(mask, 3, 3)).toBe(false);
  expect(isPainted(mask, 3, 4)).toBe(true);
  expect(isPainted(mask, 1, 3)).toBe(false);
  expect(isPainted(mask, 4, 4)).toBe(false);
});

test("효과를 낸 픽셀 중 칠하지 않은 곳만 원본으로 되돌린다", () => {
  const area = { x: 2, y: 3, width: 2, height: 2 };
  const effect = solid(2, 2, 200);
  keepPaintedPixels(effect, solid(2, 2, 10), area, maskOf(2, 3, ["#.", ".#"]));
  expect([...effect]).toEqual([200, 200, 200, 200, 10, 10, 10, 10, 10, 10, 10, 10, 200, 200, 200, 200]);
});
