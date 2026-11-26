import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

test("파일 선택부터 가린 PNG 다운로드까지 미리보기와 픽셀이 같고 이미지 전송이 없다", async ({ page, baseURL }) => {
  const localOrigin = new URL(baseURL!).origin;
  const external: string[] = [];
  const requests: string[] = [];
  await page.route(/^https?:/, async (route) => {
    const url = route.request().url();
    requests.push(url);
    if (new URL(url).origin === localOrigin) {
      await route.continue();
    } else {
      external.push(url);
      await route.abort();
    }
  });

  await page.goto("/tests/e2e/fixtures/engine.html");
  const input = page.getByLabel("이미지 선택");
  await expect(input).toBeEnabled();
  const requestCount = requests.length;
  const file = await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 4;
    canvas.height = 2;
    const context = canvas.getContext("2d")!;
    context.fillStyle = "rgb(255, 0, 0)";
    context.fillRect(0, 0, 4, 1);
    const png = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("PNG 생성 실패")));
    });
    return Array.from(new Uint8Array(await png.arrayBuffer()));
  });

  await input.setInputFiles({ name: "sample.png", mimeType: "image/png", buffer: Buffer.from(file) });
  await expect(page.getByRole("status")).toHaveText("이미지 처리 완료");
  const pendingDownload = page.waitForEvent("download");
  await page.getByRole("link", { name: "PNG 다운로드" }).click();
  const download = await pendingDownload;
  expect(download.suggestedFilename()).toBe("sample-pixelcover.png");

  const bytes = Array.from(await readFile(await download.path()));
  const result = await page.evaluate(async (png) => {
    const shown = document.querySelector("canvas")!;
    const bitmap = await createImageBitmap(new Blob([Uint8Array.from(png)], { type: "image/png" }));
    try {
      const output = document.createElement("canvas");
      output.width = bitmap.width;
      output.height = bitmap.height;
      const context = output.getContext("2d")!;
      context.drawImage(bitmap, 0, 0);
      const downloaded = context.getImageData(0, 0, output.width, output.height).data;
      const preview = shown.getContext("2d")!.getImageData(0, 0, shown.width, shown.height).data;
      return {
        dimensions: [bitmap.width, bitmap.height],
        same: downloaded.length === preview.length && downloaded.every((value, i) => value === preview[i]),
        kept: Array.from(downloaded.slice(0, 4)),
        hidden: Array.from(downloaded.slice(8, 12)),
        transparent: Array.from(downloaded.slice(16, 20)),
      };
    } finally {
      bitmap.close();
    }
  }, bytes);

  expect(result).toEqual({
    dimensions: [4, 2], same: true, kept: [255, 0, 0, 255],
    hidden: [0, 0, 0, 255], transparent: [0, 0, 0, 0],
  });
  expect(external).toEqual([]);
  expect(requests.slice(requestCount)).toEqual([]);
});
