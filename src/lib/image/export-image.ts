import { renderImage } from "../canvas/render-image";
import { ImageEditError } from "../editor/image-edit-error";
import type { EditRegion } from "../editor/edit-region";

export type OutputMime = "image/png" | "image/jpeg";

export async function exportImage(
  image: ImageBitmap,
  regions: readonly EditRegion[],
  format: OutputMime,
  quality?: number,
): Promise<Blob> {
  if (format !== "image/png" && format !== "image/jpeg") {
    throw new ImageEditError("EXPORT_FAILED", "지원하지 않는 출력 형식입니다.");
  }

  const jpegQuality = format === "image/jpeg" ? (quality === undefined ? 0.92 : quality) : undefined;
  if (jpegQuality !== undefined && (!Number.isFinite(jpegQuality) || jpegQuality < 0 || jpegQuality > 1)) {
    throw new ImageEditError("EXPORT_FAILED", "JPEG 품질은 0~1 사이여야 합니다.");
  }

  let canvas: HTMLCanvasElement | undefined;
  try {
    if (typeof document === "undefined") {
      throw new ImageEditError("RENDER_FAILED", "이 환경에서는 브라우저 캔버스를 사용할 수 없습니다.");
    }
    canvas = document.createElement("canvas");
    const target = canvas.getContext("2d");
    if (!target) {
      throw new ImageEditError("RENDER_FAILED", "출력 캔버스의 2D 컨텍스트를 열 수 없습니다.");
    }
    if (typeof canvas.toBlob !== "function") {
      throw new ImageEditError("EXPORT_FAILED", "이 브라우저에서는 캔버스 파일 인코딩을 지원하지 않습니다.");
    }
    renderImage(image, regions, target);
    if (format === "image/jpeg") {
      target.globalCompositeOperation = "destination-over";
      target.fillStyle = "#fff";
      target.fillRect(0, 0, canvas.width, canvas.height);
    }
    return await encodeCanvas(canvas, format, jpegQuality);
  } catch (cause) {
    if (cause instanceof ImageEditError) throw cause;
    throw new ImageEditError("EXPORT_FAILED", "이미지를 내보낼 수 없습니다.", { cause });
  } finally {
    if (canvas) canvas.width = 0;
  }
}

function encodeCanvas(canvas: HTMLCanvasElement, format: OutputMime, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob && blob.type === format && blob.size > 0) {
        resolve(blob);
      } else {
        reject(new ImageEditError("EXPORT_FAILED", "요청한 형식으로 이미지를 인코딩할 수 없습니다."));
      }
    }, format, quality);
  });
}
