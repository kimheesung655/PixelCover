import { afterEach, expect, test, vi } from "vitest";
import { exportImage } from "../../src/lib/image/export-image";

const image = { width: 3, height: 2 } as ImageBitmap;

function installCanvas(output: Blob | null) {
  const canvas = {
    width: 0,
    height: 0,
    getContext: vi.fn(),
    toBlob: vi.fn<(callback: BlobCallback, format?: string, quality?: number) => void>(),
  };
  const context = { canvas, drawImage: vi.fn(), fillRect: vi.fn(), fillStyle: "", globalCompositeOperation: "" };
  canvas.getContext.mockReturnValue(context);
  canvas.toBlob.mockImplementation((callback) => callback(output));
  const createElement = vi.fn().mockReturnValue(canvas);
  vi.stubGlobal("document", { createElement });
  return { canvas, context, createElement };
}

afterEach(() => vi.unstubAllGlobals());

test("전용 원본 크기 캔버스에서 배경을 채우지 않고 PNG로 인코딩한다", async () => {
  const png = new Blob(["encoded"], { type: "image/png" });
  const { canvas, context, createElement } = installCanvas(png);
  canvas.toBlob.mockImplementation((callback, mimeType) => {
    expect([canvas.width, canvas.height]).toEqual([3, 2]);
    expect(mimeType).toBe("image/png");
    callback(png);
  });

  await expect(exportImage(image, [], "image/png")).resolves.toBe(png);
  expect(createElement).toHaveBeenCalledWith("canvas");
  expect(context.drawImage).toHaveBeenCalledExactlyOnceWith(image, 0, 0);
  expect(context.fillRect).not.toHaveBeenCalled();
  expect(canvas.width).toBe(0);
});

test.each([null, new Blob(["wrong type"], { type: "image/jpeg" })])(
  "유효한 PNG가 반환되지 않으면 출력 오류를 반환하고 임시 캔버스를 해제한다 %#",
  async (blob) => {
    const { canvas } = installCanvas(blob);
    await expect(exportImage(image, [], "image/png")).rejects.toHaveProperty("code", "EXPORT_FAILED");
    expect(canvas.width).toBe(0);
  },
);

test.each([[undefined, 0.92], [0, 0], [0.7, 0.7], [1, 1]])(
  "JPEG를 흰색 배경으로 합성하고 품질 %s를 전달한다",
  async (quality, expectedQuality) => {
    const jpeg = new Blob(["encoded"], { type: "image/jpeg" });
    const { canvas, context } = installCanvas(jpeg);
    await expect(exportImage(image, [], "image/jpeg", quality)).resolves.toBe(jpeg);

    expect(context.globalCompositeOperation).toBe("destination-over");
    expect(context.fillStyle).toBe("#fff");
    expect(context.fillRect).toHaveBeenCalledExactlyOnceWith(0, 0, 3, 2);
    expect(context.drawImage).toHaveBeenCalledBefore(context.fillRect);
    expect(context.fillRect).toHaveBeenCalledBefore(canvas.toBlob);
    expect(canvas.toBlob).toHaveBeenCalledExactlyOnceWith(expect.any(Function), "image/jpeg", expectedQuality);
  },
);

test.each([-0.01, 1.01, NaN, Infinity])("유효하지 않은 JPEG 품질 %s를 거부한다", async (quality) => {
  const { createElement } = installCanvas(null);
  await expect(exportImage(image, [], "image/jpeg", quality)).rejects.toHaveProperty("code", "EXPORT_FAILED");
  expect(createElement).not.toHaveBeenCalled();
});
