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
  const context = { canvas, drawImage: vi.fn() };
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
