import { expect, test } from "vitest";
import { normalizeRegion, type EditRegion } from "../../src/lib/editor/edit-region";

const region: EditRegion = { id: "r", type: "blur", x: 3.75, y: 2.25, width: -2.5, height: -1.75, intensity: 20 };

test("역방향 드래그의 양 끝을 정렬하고 바깥쪽 픽셀까지 포함한다", () => {
  const normalized = normalizeRegion(region, 10, 10);
  expect(normalized).toEqual({ ...region, x: 1, y: 0, width: 3, height: 3 });
  expect(region.width).toBe(-2.5);
  expect(normalized).not.toBe(region);
});

test("이미지 경계로 자르고 끝 좌표는 제외한다", () => {
  const oversized = { ...region, x: -0.5, y: -2, width: 15, height: 16 };
  expect(normalizeRegion(oversized, 8, 6)).toEqual({ ...region, x: 0, y: 0, width: 8, height: 6 });
});

test.each([
  { id: " " },
  { x: NaN },
  { x: Number.MAX_VALUE, width: Number.MAX_VALUE },
  { width: 0 },
  { x: 10, width: 5 },
  { intensity: 0 },
  { intensity: 101 },
  { intensity: 20.5 },
])("무효한 편집 영역을 거부한다 %#", (changes) => {
  expect(() => normalizeRegion({ ...region, ...changes }, 10, 10)).toThrow(
    expect.objectContaining({ code: "INVALID_REGION" }),
  );
});

test("불투명 가림의 강도는 무시한다", () => {
  expect(() => normalizeRegion({ ...region, type: "redact", intensity: NaN }, 10, 10)).not.toThrow();
});
