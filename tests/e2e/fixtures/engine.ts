import { decodeImage, exportImage, renderImage, type EditRegion } from "../../../src/lib/editor";
import { createExportFilename } from "../../../src/lib/image/export-filename";

const input = document.querySelector("input")!;
const status = document.querySelector<HTMLElement>("[role=status]")!;
const canvas = document.querySelector("canvas")!;
const link = document.querySelector("a")!;
const preview = canvas.getContext("2d")!;
let objectUrl: string | undefined;

function clearDownload(): void {
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  objectUrl = undefined;
  link.removeAttribute("href");
  link.hidden = true;
}

input.disabled = false;
window.addEventListener("pagehide", clearDownload);
input.addEventListener("change", async () => {
  clearDownload();
  canvas.width = 0;
  const file = input.files?.[0];
  if (!file) return;

  input.disabled = true;
  status.textContent = "이미지 처리 중";
  try {
    const bitmap = await decodeImage(file);
    try {
      const left = Math.floor(bitmap.width / 2);
      const regions: EditRegion[] = [{
        id: "right-half", type: "redact", x: left, y: 0,
        width: bitmap.width - left, height: bitmap.height, intensity: 1,
      }];
      renderImage(bitmap, regions, preview);
      const output = await exportImage(bitmap, regions, "image/png");
      objectUrl = URL.createObjectURL(output);
      link.href = objectUrl;
      link.download = createExportFilename(file.name, "image/png");
      link.hidden = false;
      status.textContent = "이미지 처리 완료";
    } finally {
      bitmap.close();
    }
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : "이미지 처리 실패";
  } finally {
    input.disabled = false;
  }
});
