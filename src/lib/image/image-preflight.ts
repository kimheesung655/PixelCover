import { ImageEditError } from "../editor/image-edit-error";
import { detectImageFormat, type InputMime } from "./file-format";

export const MAX_IMAGE_BYTES = 20_000_000;

export async function inspectImageFile(file: File): Promise<InputMime> {
  if (file.size > MAX_IMAGE_BYTES) {
    throw new ImageEditError("FILE_TOO_LARGE", "이미지 파일은 20,000,000바이트 이하여야 합니다.");
  }

  return detectImageFormat(file);
}
