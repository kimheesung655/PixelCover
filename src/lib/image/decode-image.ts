import { ImageEditError } from "../editor/image-edit-error";
import type { InputMime } from "./file-format";
import { enforceImageDimensions, inspectImageFile } from "./image-preflight";

export interface ImageInfo {
  width: number;
  height: number;
  fileName: string;
  mimeType: InputMime;
  fileSize: number;
}

export async function validateImage(file: File): Promise<ImageInfo> {
  const { bitmap, mimeType } = await decodeImageFile(file);
  try {
    return {
      width: bitmap.width,
      height: bitmap.height,
      fileName: file.name,
      mimeType,
      fileSize: file.size,
    };
  } finally {
    bitmap.close();
  }
}

/** The caller owns the decoded bitmap and must close it when finished. */
export async function decodeImage(file: File): Promise<ImageBitmap> {
  const { bitmap } = await decodeImageFile(file);
  return bitmap;
}

async function decodeImageFile(file: File): Promise<{ bitmap: ImageBitmap; mimeType: InputMime }> {
  const { mimeType, bitmap } = await createFileBitmap(file);
  try {
    if (bitmap.width === 0 || bitmap.height === 0) {
      throw new ImageEditError("DECODE_FAILED", "디코딩 결과의 치수가 올바르지 않습니다.");
    }
    enforceImageDimensions(bitmap);
    return { bitmap, mimeType };
  } catch (error) {
    bitmap.close();
    throw error;
  }
}

async function createFileBitmap(file: File): Promise<{ bitmap: ImageBitmap; mimeType: InputMime }> {
  try {
    const { mimeType } = await inspectImageFile(file);
    if (typeof globalThis.createImageBitmap !== "function") {
      throw new ImageEditError("DECODE_FAILED", "이 브라우저에서는 이미지 비트맵 디코딩을 지원하지 않습니다.");
    }
    const source = file.type === mimeType ? file : file.slice(0, file.size, mimeType);
    const bitmap = await createImageBitmap(source, { imageOrientation: "from-image" });
    return { bitmap, mimeType };
  } catch (cause) {
    if (cause instanceof ImageEditError) throw cause;
    throw new ImageEditError("DECODE_FAILED", "이미지 파일을 읽거나 디코딩할 수 없습니다.", { cause });
  }
}
