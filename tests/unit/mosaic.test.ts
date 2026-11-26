import { expect, test } from "vitest";
import { applyMosaic } from "../../src/lib/canvas/mosaic";

function grayscaleRow(values: number[]) {
  return {
    width: values.length,
    height: 1,
    data: new Uint8ClampedArray(values.flatMap((value) => [value, value, value, 255])),
  };
}

function redValues(data: Uint8ClampedArray): number[] {
  return Array.from(data.filter((_value, index) => index % 4 === 0));
}

test("강도가 높을수록 더 큰 픽셀 블록을 평균한다", () => {
  const low = grayscaleRow([0, 20, 200, 220]);
  const high = grayscaleRow([0, 20, 200, 220]);
  const region = { x: 0, y: 0, width: 4, height: 1 };

  applyMosaic(low, region, 1);
  applyMosaic(high, region, 100);

  expect(redValues(low.data)).toEqual([10, 10, 210, 210]);
  expect(redValues(high.data)).toEqual([110, 110, 110, 110]);
});

test("경계의 부분 블록을 처리하고 영역 바깥 픽셀은 그대로 둔다", () => {
  const image = grayscaleRow([99, 0, 40, 200, 27]);
  applyMosaic(image, { x: 1, y: 0, width: 3, height: 1 }, 1);
  expect(redValues(image.data)).toEqual([99, 20, 20, 200, 27]);
});

test("투명 픽셀의 숨겨진 색이 모자이크에 섞이지 않는다", () => {
  const image = { width: 2, height: 1, data: Uint8ClampedArray.of(255, 0, 0, 0, 0, 0, 255, 255) };
  applyMosaic(image, { x: 0, y: 0, width: 2, height: 1 }, 1);
  expect(Array.from(image.data)).toEqual([0, 0, 255, 128, 0, 0, 255, 128]);
});
