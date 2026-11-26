import { renderImage } from "../canvas/render-image";
import { ImageEditError } from "../editor/image-edit-error";
import type { EditRegion } from "../editor/edit-region";

export type OutputMime = "image/png";

export async function exportImage(
  image: ImageBitmap,
  regions: readonly EditRegion[],
  format: OutputMime,
): Promise<Blob> {
  if (format !== "image/png") {
    throw new ImageEditError("EXPORT_FAILED", "지원하지 않는 출력 형식입니다.");
  }

  let canvas: HTMLCanvasElement | undefined;
  try {
    canvas = document.createElement("canvas");
    const target = canvas.getContext("2d");
    if (!target) {
      throw new ImageEditError("RENDER_FAILED", "출력 캔버스의 2D 컨텍스트를 열 수 없습니다.");
    }
    renderImage(image, regions, target);
    return await encodeCanvas(canvas, format);
  } catch (cause) {
    if (cause instanceof ImageEditError) throw cause;
    throw new ImageEditError("EXPORT_FAILED", "이미지를 내보낼 수 없습니다.", { cause });
  } finally {
    if (canvas) canvas.width = 0;
  }
}

function encodeCanvas(canvas: HTMLCanvasElement, format: OutputMime): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob && blob.type === format && blob.size > 0) {
        resolve(blob);
      } else {
        reject(new ImageEditError("EXPORT_FAILED", "요청한 형식으로 이미지를 인코딩할 수 없습니다."));
      }
    }, format);
  });
}
