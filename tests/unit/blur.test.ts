import { expect, test } from "vitest";
import { applyBlur } from "../../src/lib/canvas/blur";

function grayscale(width: number, values: number[]) {
  return {
    width,
    height: values.length / width,
    data: new Uint8ClampedArray(values.flatMap((value) => [value, value, value, 255])),
  };
}

function redValues(data: Uint8ClampedArray): number[] {
  return Array.from(data.filter((_value, index) => index % 4 === 0));
}

test("가로·세로의 이웃을 평균하고 강도가 올라가면 더 넓게 흐린다", () => {
  const values = [0, 0, 0, 0, 240, 0, 0, 0, 0];
  const low = grayscale(3, values);
  const high = grayscale(3, values);
  const region = { x: 0, y: 0, width: 3, height: 3 };

  applyBlur(low, region, 1);
  applyBlur(high, region, 100);

  expect(redValues(low.data)).toEqual([60, 40, 60, 40, 27, 40, 60, 40, 60]);
  expect(redValues(high.data)).toEqual(Array(9).fill(27));
});

test("여러 영역을 흐려도 영역 바깥의 행과 픽셀을 보존한다", () => {
  const image = grayscale(8, [90, 0, 20, 200, 90, 10, 50, 93, 91, 1, 2, 3, 4, 5, 6, 94]);
  applyBlur(image, { x: 1, y: 0, width: 3, height: 1 }, 1);
  applyBlur(image, { x: 5, y: 0, width: 2, height: 1 }, 100);
  expect(redValues(image.data)).toEqual([90, 10, 73, 110, 90, 30, 30, 93, 91, 1, 2, 3, 4, 5, 6, 94]);
});

test("이웃의 색을 알파로 가중하고 완전 투명 영역을 보존한다", () => {
  const image = { width: 3, height: 1, data: Uint8ClampedArray.of(255, 0, 0, 0, 0, 0, 255, 255, 255, 0, 0, 0) };
  applyBlur(image, { x: 0, y: 0, width: 3, height: 1 }, 1);
  expect(Array.from(image.data)).toEqual([0, 0, 255, 128, 0, 0, 255, 85, 0, 0, 255, 128]);

  const transparent = { width: 1, height: 1, data: Uint8ClampedArray.of(25, 50, 75, 0) };
  applyBlur(transparent, { x: 0, y: 0, width: 1, height: 1 }, 100);
  expect(Array.from(transparent.data)).toEqual([0, 0, 0, 0]);
});
