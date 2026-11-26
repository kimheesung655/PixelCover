import { expect, test } from "vitest";
import { applyRedaction } from "../../src/lib/canvas/redact";

test("원래 색과 알파에 관계없이 가림 픽셀을 불투명 검정으로 덮는다", () => {
  const original = [10, 20, 30, 40, 50, 60, 70, 0, 80, 90, 100, 120, 130, 140, 150, 255];
  const image = { width: 2, height: 2, data: new Uint8ClampedArray(original) };

  applyRedaction(image, { x: 1, y: 0, width: 1, height: 2 });

  expect(Array.from(image.data)).toEqual([
    10, 20, 30, 40, 0, 0, 0, 255,
    80, 90, 100, 120, 0, 0, 0, 255,
  ]);
});
