import { expect, test } from "vitest";
import { toImageCoordinates } from "../../src/lib/editor/image-coordinates";

const rect = { left: 100, top: 40, width: 400, height: 200 };

test("여백을 빼고 가로와 세로의 배율을 각각 적용한다", () => {
  expect(toImageCoordinates({ x: 175, y: 65 }, rect, 800, 100)).toEqual({ x: 150, y: 12.5 });
});

test("표시 영역 밖의 좌표와 경계 좌표는 유지한다", () => {
  expect(toImageCoordinates({ x: 50, y: 240 }, rect, 800, 400)).toEqual({ x: -100, y: 400 });
});

test("확대, 축소, 소수 좌표를 처리한다", () => {
  expect(toImageCoordinates({ x: 3, y: 4.5 }, { left: 0, top: 0, width: 8, height: 12 }, 4, 3))
    .toEqual({ x: 1.5, y: 1.125 });
});

test("유효하지 않은 표시 치수와 포인터 좌표를 거부한다", () => {
  expect(() => toImageCoordinates({ x: 0, y: 0 }, { ...rect, width: 0 }, 1, 1)).toThrow(
    expect.objectContaining({ code: "INVALID_REGION" }),
  );
  expect(() => toImageCoordinates({ x: Infinity, y: 0 }, rect, 1, 1)).toThrow(
    expect.objectContaining({ code: "INVALID_REGION" }),
  );
});
