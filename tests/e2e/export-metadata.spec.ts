import { expect, test } from "@playwright/test";

test("회전된 JPEG를 내보낼 때 보정된 치수를 유지하고 원본 EXIF를 제거한다", async ({ page }) => {
  await page.goto("/tests/e2e/fixtures/engine.html");
  const result = await page.evaluate(async ({ decoder, exporter }) => {
    const { decodeImage, validateImage } = await import(decoder) as typeof import("../../src/lib/image/decode-image");
    const { exportImage } = await import(exporter) as typeof import("../../src/lib/image/export-image");
    const canvas = document.createElement("canvas");
    canvas.width = 8;
    canvas.height = 4;
    const context = canvas.getContext("2d")!;
    context.fillStyle = "#ed2307";
    context.fillRect(0, 0, 8, 4);
    const jpeg = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("JPEG 생성 실패")), "image/jpeg", 1);
    });
    // The EXIF APP1 segment describes orientation 6, a 90° clockwise rotation.
    const exif = Uint8Array.of(
      0xff, 0xe1, 0, 34, 0x45, 0x78, 0x69, 0x66, 0, 0,
      0x4d, 0x4d, 0, 0x2a, 0, 0, 0, 8,
      0, 1, 0x01, 0x12, 0, 3, 0, 0, 0, 1, 0, 6, 0, 0, 0, 0, 0, 0,
    );
    const source = new File([jpeg.slice(0, 2), exif, jpeg.slice(2)], "rotated.jpg", { type: "image/jpeg" });
    async function hasExif(blob: Blob): Promise<boolean> {
      return new TextDecoder("latin1").decode(await blob.arrayBuffer()).includes("Exif\0\0");
    }

    const input = await validateImage(source);
    const bitmap = await decodeImage(source);
    try {
      const jpegOutput = await exportImage(bitmap, [], "image/jpeg", 1);
      const pngOutput = await exportImage(bitmap, [], "image/png");
      const output = await createImageBitmap(jpegOutput);
      try {
        return {
          sourceHasExif: await hasExif(source),
          jpegHasExif: await hasExif(jpegOutput),
          pngHasExif: await hasExif(pngOutput),
          inputSize: [input.width, input.height],
          outputSize: [output.width, output.height],
        };
      } finally {
        output.close();
      }
    } finally {
      bitmap.close();
    }
  }, { decoder: "/src/lib/image/decode-image.ts", exporter: "/src/lib/image/export-image.ts" });

  expect(result).toEqual({
    sourceHasExif: true, jpegHasExif: false, pngHasExif: false,
    inputSize: [4, 8], outputSize: [4, 8],
  });
});
