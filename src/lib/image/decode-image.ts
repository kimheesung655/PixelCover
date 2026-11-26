import { ImageEditError } from "../editor/image-edit-error";
import type { InputMime } from "./file-format";
import { inspectImageFile } from "./image-preflight";

export async function decodeImage(file: File): Promise<ImageBitmap> {
  const { bitmap } = await decodeImageFile(file);
  return bitmap;
}

async function decodeImageFile(file: File): Promise<{ bitmap: ImageBitmap; mimeType: InputMime }> {
  const { mimeType } = await inspectImageFile(file);
  const source = file.type === mimeType ? file : file.slice(0, file.size, mimeType);
  try {
    const bitmap = await createImageBitmap(source);
    return { bitmap, mimeType };
  } catch (cause) {
    throw new ImageEditError("DECODE_FAILED", "이미지 본문을 디코딩할 수 없습니다.", { cause });
  }
}
