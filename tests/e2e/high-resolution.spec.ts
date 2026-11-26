import { expect, test } from "@playwright/test";

test("고해상도 이미지를 반복 편집하고 사용한 비트맵을 해제한다", async ({ page }) => {
  await page.goto("/tests/e2e/fixtures/engine.html");
  const result = await page.evaluate(async (enginePath) => {
    const { renderImage } = await import(enginePath) as typeof import("../../src/lib/editor");
    const source = document.createElement("canvas");
    source.width = 4096;
    source.height = 2048;
    const initial = source.getContext("2d")!;
    initial.fillStyle = "#ff0000";
    initial.fillRect(0, 0, source.width, source.height);
    const bitmap = await createImageBitmap(source);
    source.width = 0;
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d")!;
    const values: number[][] = [];
    try {
      for (const x of [32, 96, 160]) {
        renderImage(bitmap, [
          { id: "soft", type: "blur", x, y: 2, width: 64, height: 64, intensity: 100 },
          { id: "black", type: "redact", x, y: 2, width: 32, height: 32, intensity: 1 },
        ], context);
        values.push(Array.from(context.getImageData(x, 2, 1, 1).data));
      }
      return {
        edits: values,
        originalOutside: Array.from(context.getImageData(0, 0, 1, 1).data),
        dimensions: [canvas.width, canvas.height],
      };
    } finally {
      bitmap.close();
      canvas.width = 0;
      if (bitmap.width || bitmap.height) throw new Error("편집 비트맵이 해제되지 않았습니다.");
    }
  }, "/src/lib/editor/index.ts");

  expect(result).toEqual({
    edits: [[0, 0, 0, 255], [0, 0, 0, 255], [0, 0, 0, 255]],
    originalOutside: [255, 0, 0, 255], dimensions: [4096, 2048],
  });
});
