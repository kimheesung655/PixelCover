import { expect, test, vi } from "vitest";
import { renderImage } from "../../src/lib/canvas/render-image";
import type { EditRegion } from "../../src/lib/editor/edit-region";

function createCanvas(red: number[]) {
  const pixels = {
    width: red.length,
    height: 1,
    data: new Uint8ClampedArray(red.flatMap((value) => [value, value, value, 255])),
  };
  const canvas = {
    canvas: { width: 0, height: 0 },
    drawImage: vi.fn(),
    getImageData: vi.fn().mockReturnValue(pixels),
    putImageData: vi.fn(),
  };
  const image = { width: pixels.width, height: pixels.height } as ImageBitmap;
  return { pixels, image, canvas, context: canvas as unknown as CanvasRenderingContext2D };
}

const mosaic: EditRegion = { id: "m", x: 0, y: 0, width: 4, height: 1, type: "mosaic", intensity: 1 };
const blur: EditRegion = { ...mosaic, id: "b", x: 1, width: 2, type: "blur" };

test("일반 효과는 배열의 순서를 따르고 캔버스는 원본 크기를 사용한다", () => {
  const { image, canvas, context, pixels } = createCanvas([0, 40, 200, 220]);
  renderImage(image, [mosaic, blur], context);

  expect(canvas.canvas).toEqual({ width: 4, height: 1 });
  expect(canvas.drawImage).toHaveBeenCalledWith(image, 0, 0);
  expect(canvas.putImageData).toHaveBeenCalledExactlyOnceWith(pixels, 0, 0);
  expect(Array.from(pixels.data.filter((_value, index) => index % 4 === 0))).toEqual([20, 115, 115, 210]);
});

test.each(["blur", "mosaic"] as const)("가려진 원본 색은 겹친 %s 결과에 섞이지 않는다", (type) => {
  const cover: EditRegion = { ...mosaic, id: "cover", x: 1, width: 1, type: "redact" };
  const effect: EditRegion = { ...mosaic, type, width: 3, intensity: 100 };
  const first = createCanvas([10, 43, 20]);
  const second = createCanvas([10, 240, 20]);

  renderImage(first.image, [cover, effect], first.context);
  renderImage(second.image, [effect, cover], second.context);

  expect(first.pixels.data).toEqual(second.pixels.data);
  expect(Array.from(first.pixels.data.slice(4, 8))).toEqual([0, 0, 0, 255]);
});

test("중복 ID를 그리기 전에 거부한다", () => {
  const { image, canvas, context } = createCanvas([1, 2, 3, 4]);
  expect(() => renderImage(image, [mosaic, { ...blur, id: mosaic.id }], context)).toThrow(
    expect.objectContaining({ code: "INVALID_REGION" }),
  );
  expect(canvas.drawImage).not.toHaveBeenCalled();
});

test("픽셀 읽기 오류가 생기면 캔버스의 원본을 지운다", () => {
  const { image, canvas, context } = createCanvas([1, 2, 3, 4]);
  const cause = new DOMException("The image cannot be read.", "SecurityError");
  canvas.getImageData.mockImplementation(() => { throw cause; });
  expect(() => renderImage(image, [mosaic], context)).toThrow(
    expect.objectContaining({ code: "RENDER_FAILED", cause }),
  );
  expect(canvas.canvas.width).toBe(0);
  expect(canvas.putImageData).not.toHaveBeenCalled();
});
