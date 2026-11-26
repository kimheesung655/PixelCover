import { expect, test } from "vitest";

test("TypeScript 단위 테스트에서 픽셀 바이트 배열을 읽을 수 있다", () => {
  const pixels: Uint8Array = Uint8Array.of(0, 127, 255);
  expect(Array.from(pixels)).toEqual([0, 127, 255]);
});
